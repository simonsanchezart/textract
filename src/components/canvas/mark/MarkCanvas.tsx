import type Konva from "konva";
import type { AtlasImageType } from "@/stores/atlas-store";
import type { MarkImageType } from "@/stores/mark-store";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { basename } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { exists } from "@tauri-apps/plugin-fs";
import { error, info, warn } from "@tauri-apps/plugin-log";
import { BoxSelect, Grid3x3, Redo2, Spline, TrashIcon, Undo2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { CgAdd } from "react-icons/cg";
import { FaPlay } from "react-icons/fa";
import { Line } from "react-konva";
import { toast } from "sonner";
import { useStore } from "zustand";
import FooterNumberSetting from "@/components/footer/FooterNumberSetting";
import { Toolbar, ToolbarAction } from "@/components/Toolbar";
import { ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger } from "@/components/ui/ContextMenu";
import { useAtlasStore } from "@/stores/atlas-store";
import { useCanvasStore } from "@/stores/canvas-store";
import { useMarkStore } from "@/stores/mark-store";
import { useSettingsStore } from "@/stores/settings-store";
import { CanvasType } from "@/types/types";
import { getShortcutModifierLabel, isShortcutModifierPressed, snap } from "@/utils/utils";
import Canvas from "../Canvas";
import MarkImage from "./MarkImage";

/**
 * Selection can in principle span multiple marks; group point indices per
 * mark so smooth/tension edits can be applied with one store call per mark.
 */
function groupSelectedByMark(selected: { markId: string; pointIndex: number }[]): [string, number[]][] {
  const byMark = new Map<string, number[]>();
  for (const { markId, pointIndex } of selected) {
    if (!byMark.has(markId))
      byMark.set(markId, []);
    byMark.get(markId)!.push(pointIndex);
  }
  return [...byMark.entries()];
}

function MarkCanvas({ className = "" }: { className?: string }) {
  const markImages = useMarkStore(state => state.images);
  const selectedNodes = useCanvasStore(s => s.transientCanvas[CanvasType.MARK].selectedNodes);
  const hoverShape = useCanvasStore(s => s.transientCanvas[CanvasType.MARK].hoverShape);
  const markCreationMode = useCanvasStore(s => s.transientCanvas[CanvasType.MARK].markCreationMode);
  const markGridRows = useCanvasStore(s => s.transientCanvas[CanvasType.MARK].markGridRows);
  const markGridCols = useCanvasStore(s => s.transientCanvas[CanvasType.MARK].markGridCols);
  const snapSize = useSettingsStore(s => s.snap);
  const canUndo = useStore(useMarkStore.temporal, s => s.pastStates.length > 0);
  const canRedo = useStore(useMarkStore.temporal, s => s.futureStates.length > 0);

  const transformerRef = useRef<Konva.Transformer>(null);

  /**
   * The mark the right-click landed on, if any.
   *
   * `hoverShape` is whatever Konva shape `getIntersection` found under the
   * pointer -- which for a mark is EITHER its outline `Line` OR one of the
   * draggable corner/handle points sitting on top of it (a `Rect`). Both
   * carry the mark's `id`, so resolving the id against the mark store is the
   * reliable test. The previous gate (`hoverShape instanceof Konva.Line`)
   * only accepted the outline, so any right-click that happened to land on a
   * point silently rendered neither "Convert > Hovered" nor "Remove Mark" --
   * no menu item, therefore no click, therefore not a single log line to
   * explain it. That is why this looked like "Convert Hovered never runs".
   * It hits bezier marks hardest (12 points, several of them mid-edge where
   * you'd naturally aim) but is not bezier-specific: quad marks have 4 and
   * grid marks up to 144, all with the same problem.
   *
   * Read imperatively rather than via a `marks` subscription on purpose:
   * this only needs to be correct at render time, and subscribing would
   * re-render the whole canvas tree on every point drag.
   */
  const hoveredMarkId = hoverShape?.id() || null;
  const hoveredMark = hoveredMarkId ? useMarkStore.getState().marks[hoveredMarkId] : undefined;

  useEffect(() => {
    const removeMissingImages = async () => {
      const missingImages = [];
      for (const img of Object.values(markImages)) {
        if (!(await exists(img.filepath))) {
          missingImages.push(img.id);
        }
      }

      missingImages.forEach((id) => {
        toast.warning(`Removing missing image: ${markImages[id].filepath}`);
        warn(`Removing missing image: ${markImages[id].filepath}`);
        useMarkStore.getState().removeImage(id);
      });
    };

    removeMissingImages();
  }, [markImages]);

  const loadImages = async () => {
    const selectedImages = await open({
      title: "Select image/s to open",
      multiple: true,
      directory: false,
      filters: [{ name: "Image Files", extensions: ["png", "jpg", "jpeg", "bmp"] }],
    });

    if (!selectedImages) {
      info("No images were selected");
      return;
    }

    const stage = transformerRef.current!.getStage()!;
    const container = stage.container();

    const stageWidth = container.offsetWidth;
    const stageHeight = window.innerHeight;
    const scale = stage.scaleX();
    const offset = stage.offset();
    const centerX = (stageWidth / 2 - stage.x()) / scale + offset.x;
    const centerY = (stageHeight / 2 - stage.y()) / scale + offset.y;

    for (const imgPath of selectedImages) {
      const imgName = await basename(imgPath);
      toast.info(`Loading ${imgName}`);
      info(`Loading ${imgPath}`);

      const assetUrl = convertFileSrc(imgPath);
      const img = new Image();
      img.src = assetUrl;
      await img.decode();

      const snapScaleX = snap(img.width, snapSize) / img.width;
      const snapScaleY = snap(img.height, snapSize) / img.height;

      const markImage: MarkImageType = {
        id: crypto.randomUUID(),
        filepath: imgPath,
        src: assetUrl,
        position: {
          x: snap(centerX - img.width / 2, snapSize),
          y: snap(centerY - img.height / 2, snapSize),
        },
        rotation: 0,
        scale: { x: snapScaleX, y: snapScaleY },
        sizeSum: img.width + img.height,
        markIds: [],
      };

      useMarkStore.getState().addImage(markImage);
    }
  };

  const convertMarks = async (type: "ALL" | "SELECTED" | "HOVERED" = "ALL") => {
    // Entry-point diagnostic: proves the handler was actually invoked at all
    // (vs. a Radix onClick that silently never fires), and separately
    // whether the `hoverShape` closed over by this render is stale compared
    // to a fresh read of the store at click time.
    const freshHoverShape = useCanvasStore.getState().transientCanvas[CanvasType.MARK].hoverShape;
    info(
      `convertMarks ENTRY type=${type} closureHoverShape=${hoverShape?.id() ?? "null"} `
      + `freshHoverShape=${freshHoverShape?.id() ?? "null"}`,
    );
    const marks = useMarkStore.getState().marks;
    const images = Object.values(markImages);
    let entries: { image: MarkImageType; markIds: string[] }[] = [];

    switch (type) {
      case "ALL":
        entries = images.map(image => ({ image, markIds: image.markIds }));
        break;
      case "SELECTED": {
        const selectedIds = transformerRef.current?.nodes().map(n => n.id()) ?? [];

        entries = images.filter(image => selectedIds.includes(image.id))
          .filter(image => image.markIds.length > 0)
          .map(image => ({ image, markIds: image.markIds }));
        break;
      }
      case "HOVERED": {
        if (!hoverShape) {
          toast.warning("No mark under the pointer to convert");
          warn("Convert Hovered: hoverShape was not set (right-click didn't land on a mark)");
          return;
        }

        const hitId = hoverShape.id();
        const hoverMark = marks[hitId];

        if (!hoverMark) {
          toast.warning("No mark under the pointer to convert");
          warn(`Convert Hovered: no mark found for id "${hitId}" (hit a ${hoverShape.getClassName()} without a valid mark id)`);
          return;
        }

        if (!hoverMark.dirty) {
          toast.warning("No need to process unmodified mark");
          warn(`Convert Hovered: mark "${hitId}" is not dirty, nothing to reprocess`);
          return;
        }

        const image = markImages[hoverMark.imageId];
        if (!image) {
          toast.warning("No mark under the pointer to convert");
          warn(`Convert Hovered: mark "${hitId}" has no owning image`);
          return;
        }

        info(`Convert Hovered: converting mark "${hitId}" (${hoverMark.markType ?? "quad"})`);
        entries = [
          {
            image,
            markIds: [hitId],
          },
        ];

        break;
      }
      default:
        throw new Error(`${type} is not a valid action`);
    }

    toast("Started converting marks");
    info("Started converting marks");
    await Promise.all(
      entries.map(async ({ image, markIds }) => {
        const dirtyIds = markIds.filter(id => marks[id].dirty);
        const imgName = await basename(image.filepath);

        if (dirtyIds.length === 0) {
          toast.warning(`No modified marks for image ${imgName}`);
          warn(`No modified marks for image ${imgName}`);
          return;
        }

        const applyResults = async (ids: string[], results: string[]) => {
          for (const [idx, base64] of results.entries()) {
            const markId = ids[idx];
            const existingAtlasImage = Object.values(useAtlasStore.getState().images).find(image => image.markId === markId);

            const img = new Image();
            img.src = base64;
            await img.decode();
            const snapScaleX = snap(img.width, snapSize) / img.width;
            const snapScaleY = snap(img.height, snapSize) / img.height;

            if (existingAtlasImage) {
              useAtlasStore.getState().updateImageBase64(existingAtlasImage.id, base64);
              useAtlasStore.getState().updateImageScale(existingAtlasImage.id, { x: snapScaleX, y: snapScaleY });
            }
            else {
              const atlasImage: AtlasImageType = {
                id: crypto.randomUUID(),
                base64,
                markId,
                position: { x: 0, y: 0 },
                rotation: 0,
                scale: { x: snapScaleX, y: snapScaleY },
              };

              useAtlasStore.getState().addImage(atlasImage);
            }
            useMarkStore.getState().updateMarkDirty(markId, false);
          }
        };

        const quadIds = dirtyIds.filter(id => marks[id].markType !== "grid" && marks[id].markType !== "bezier");
        const gridIds = dirtyIds.filter(id => marks[id].markType === "grid");
        const bezierIds = dirtyIds.filter(id => marks[id].markType === "bezier");

        try {
          if (quadIds.length > 0) {
            const markPoints = quadIds.flatMap(id =>
              marks[id].points.flatMap(p => [Math.round(p.x), Math.round(p.y)]),
            );

            const results: string[] = await invoke("transform_image", {
              imgPath: image.filepath,
              points: markPoints,
            });

            await applyResults(quadIds, results);
          }

          if (gridIds.length > 0) {
            const gridMarks = gridIds.map((id) => {
              const mark = marks[id];
              const pointMeta = mark.pointMeta;
              return {
                rows: mark.gridDims!.rows,
                cols: mark.gridDims!.cols,
                points: mark.points.flatMap(p => [Math.round(p.x), Math.round(p.y)]),
                smooth: pointMeta ? mark.points.map((_, i) => pointMeta[i]?.smooth ?? false) : [],
                tension: pointMeta ? mark.points.map((_, i) => pointMeta[i]?.tension ?? 0.5) : [],
              };
            });

            const results: string[] = await invoke("transform_image_mesh", {
              imgPath: image.filepath,
              marks: gridMarks,
            });

            await applyResults(gridIds, results);
          }

          if (bezierIds.length > 0) {
            const bezierMarks = bezierIds.map((id) => {
              const mark = marks[id];
              return {
                corners: mark.corners!.flatMap(p => [Math.round(p.x), Math.round(p.y)]),
                handles: mark.handles!.flatMap(p => [Math.round(p.x), Math.round(p.y)]),
              };
            });

            const results: string[] = await invoke("transform_image_bezier", {
              imgPath: image.filepath,
              marks: bezierMarks,
            });

            await applyResults(bezierIds, results);
          }
        }
        catch (e) {
          toast.error(`Failed to convert marks for ${imgName}: ${e}`);
          error(`Failed to convert marks for ${imgName}: ${e}`);
          return;
        }

        toast.success(`Finished processing ${dirtyIds.length} marks for ${imgName}`);
        info(`Finished processing ${dirtyIds.length} marks for ${imgName}`);
      }),
    );
  };

  const contextMenu = () => (
    <ContextMenuGroup>
      <ContextMenuItem onClick={loadImages}>
        <CgAdd />
        Add Images

        <ContextMenuShortcut>
          <span className="flex">
            Shift+A
          </span>
        </ContextMenuShortcut>
      </ContextMenuItem>

      {Object.keys(markImages).length > 0
        && (
          // The `onFocusOutside` prop below works around a real bug in
          // Radix's own `MenuSubContent` (@radix-ui/react-menu, source
          // index.mjs:745-747): it closes the sub via
          // `context.onOpenChange(false)` whenever focus lands anywhere
          // but the sub's own trigger -- which includes the completely
          // normal focus a `ContextMenuItem` receives on click, closing
          // the sub before the click's own event chain (pointerup -> click
          // -> Radix's internal "menu.itemSelect") can complete. Per
          // @radix-ui/primitive's `composeEventHandlers`, our own
          // `onFocusOutside` runs first and calling `preventDefault()`
          // there skips that internal closer entirely. Swapping
          // `onClick`/`onSelect` on the ITEMS does nothing for this --
          // the real problem is one level up, on the `SubContent` itself.
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <FaPlay />
              <span className="mx-2">
                Convert
              </span>
            </ContextMenuSubTrigger>

            <ContextMenuSubContent onFocusOutside={e => e.preventDefault()}>
              <ContextMenuGroup>
                {hoveredMark
                  && (
                    <ContextMenuItem onClick={() => convertMarks("HOVERED")}>
                      Hovered
                    </ContextMenuItem>
                  )}
                {selectedNodes.length > 0
                  && (
                    <ContextMenuItem onClick={() => convertMarks("SELECTED")}>
                      Selected Images
                    </ContextMenuItem>
                  )}

                <ContextMenuItem onClick={() => convertMarks("ALL")}>
                  All
                  <ContextMenuShortcut>
                    <span className="flex">
                      Shift+R
                    </span>
                  </ContextMenuShortcut>
                </ContextMenuItem>
              </ContextMenuGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

      {(hoveredMark && hoveredMarkId)
        && (
          <ContextMenuGroup>
            <ContextMenuItem
              variant="destructive"
              onClick={() => {
                // Was `hoverShape.getAttr("removeMark")?.()`, which only
                // works when the hit shape is the outline Line -- the
                // `removeMark` attr doesn't exist on the point Rects. Going
                // through the store by id works for either.
                useMarkStore.getState().removeMark(hoveredMarkId);
              }}
            >
              <TrashIcon />
              Remove Mark
              <ContextMenuShortcut>
                <span className="flex">
                  Alt+LClick
                </span>
              </ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuGroup>
        )}

      <ContextMenuSeparator />
    </ContextMenuGroup>
  );

  const handleShortcuts = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.code) {
      case "KeyA":
        if (e.shiftKey)
          loadImages();
        break;
      case "KeyR":
        if (e.shiftKey)
          convertMarks();
        break;
      case "KeyG":
        if (e.shiftKey)
          useCanvasStore.getState().toggleMarkCreationMode(CanvasType.MARK);
        break;
      case "Escape":
        useCanvasStore.getState().clearSelectedPoints(CanvasType.MARK);
        break;
      case "KeyS": {
        const selected = useCanvasStore.getState().transientCanvas[CanvasType.MARK].selectedPoints;
        if (selected.length === 0)
          break;
        e.preventDefault();
        // Smooth/tension are a grid-mark-only concept (pointMeta is parallel
        // to `points`, which bezier marks leave empty) -- skip any selected
        // point belonging to a non-grid mark rather than writing junk state.
        {
          const marks = useMarkStore.getState().marks;
          for (const [markId, indices] of groupSelectedByMark(selected)) {
            if (marks[markId]?.markType === "grid")
              useMarkStore.getState().toggleSmoothForPoints(markId, indices);
          }
        }
        break;
      }
      case "Minus":
      case "Equal": {
        const selected = useCanvasStore.getState().transientCanvas[CanvasType.MARK].selectedPoints;
        if (selected.length === 0)
          break;
        e.preventDefault();
        const delta = e.code === "Equal" ? 0.1 : -0.1;
        {
          const marks = useMarkStore.getState().marks;
          for (const [markId, indices] of groupSelectedByMark(selected)) {
            if (marks[markId]?.markType === "grid")
              useMarkStore.getState().adjustTensionForPoints(markId, indices, delta);
          }
        }
        break;
      }
      case "KeyZ":
        if (isShortcutModifierPressed(e)) {
          // Stop the webview's own text-undo from also firing.
          e.preventDefault();
          if (e.shiftKey)
            useMarkStore.temporal.getState().redo();
          else
            useMarkStore.temporal.getState().undo();
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className={`relative h-full ${className}`} onKeyDown={handleShortcuts}>
      <Canvas
        transformerRef={transformerRef}
        onDelete={async (ids) => {
          for (const id of ids) useMarkStore.getState().removeImage(id);
        }}
        contextMenu={contextMenu()}
        canvasType={CanvasType.MARK}
      >
        <Line points={[0, -10e10, 0, 10e10]} stroke="green" strokeWidth={1} opacity={0.5} listening={false} />
        <Line points={[-10e10, 0, 10e10, 0]} stroke="red" strokeWidth={1} opacity={0.5} listening={false} />

        {Object.values(markImages).map((i) => {
          return <MarkImage key={i.id} imageData={i} />;
        })}
      </Canvas>

      <Toolbar>
        <ToolbarAction Icon={CgAdd} onClick={loadImages} tooltip="Load Images (Shift+A)" />
        <ToolbarAction Icon={FaPlay} size={4} onClick={() => convertMarks()} tooltip="Convert Marks (Shift+R)" />
        <ToolbarAction
          Icon={BoxSelect}
          size={4}
          active={markCreationMode === "quad"}
          onClick={() => useCanvasStore.getState().setMarkCreationMode(CanvasType.MARK, "quad")}
          tooltip={`Quad mode: ${getShortcutModifierLabel()}+Click 4 corners for a straight mark (Shift+G to cycle modes)`}
        />
        <ToolbarAction
          Icon={Grid3x3}
          size={4}
          active={markCreationMode === "grid"}
          onClick={() => useCanvasStore.getState().setMarkCreationMode(CanvasType.MARK, "grid")}
          tooltip={`Grid mode: ${getShortcutModifierLabel()}+Click 4 corners for a point-grid curved mark (Shift+G to cycle modes)`}
        />
        <ToolbarAction
          Icon={Spline}
          size={4}
          active={markCreationMode === "bezier"}
          onClick={() => useCanvasStore.getState().setMarkCreationMode(CanvasType.MARK, "bezier")}
          tooltip={`Bezier mode: ${getShortcutModifierLabel()}+Click 4 corners for a bezier-edge curved mark (Shift+G to cycle modes)`}
        />

        {markCreationMode === "grid" && (
          <>
            <FooterNumberSetting
              title="Rows"
              value={markGridRows}
              min={2}
              max={12}
              postProcess={Math.round}
              setValue={rows => useCanvasStore.getState().setMarkGridRows(CanvasType.MARK, rows)}
              className="w-10"
            />
            <FooterNumberSetting
              title="Cols"
              value={markGridCols}
              min={2}
              max={12}
              postProcess={Math.round}
              setValue={cols => useCanvasStore.getState().setMarkGridCols(CanvasType.MARK, cols)}
              className="w-10"
            />
          </>
        )}
      </Toolbar>

      <Toolbar position="top-right">
        <ToolbarAction Icon={Undo2} disabled={!canUndo} onClick={() => useMarkStore.temporal.getState().undo()} tooltip={`Undo (${getShortcutModifierLabel()}+Z)`} />
        <ToolbarAction Icon={Redo2} disabled={!canRedo} onClick={() => useMarkStore.temporal.getState().redo()} tooltip={`Redo (Shift+${getShortcutModifierLabel()}+Z)`} />
      </Toolbar>
    </div>
  );
}

export default MarkCanvas;
