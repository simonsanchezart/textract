import type Konva from "konva";
import type { AtlasImageType } from "@/stores/atlas-store";
import type { MarkImageType } from "@/stores/mark-store";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { basename } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { exists } from "@tauri-apps/plugin-fs";
import { info, warn } from "@tauri-apps/plugin-log";
import { TrashIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { CgAdd } from "react-icons/cg";
import { FaPlay } from "react-icons/fa";
import { Line } from "react-konva";
import { toast } from "sonner";
import { Toolbar, ToolbarAction } from "@/components/Toolbar";
import { ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger } from "@/components/ui/ContextMenu";
import { useAtlasStore } from "@/stores/atlas-store";
import { useCanvasStore } from "@/stores/canvas-store";
import { useMarkStore } from "@/stores/mark-store";
import { useSettingsStore } from "@/stores/settings-store";
import { CanvasType } from "@/types/types";
import { snap } from "@/utils/utils";
import Canvas from "../Canvas";
import MarkImage from "./MarkImage";

function MarkCanvas({ className = "" }: { className?: string }) {
  const markImages = useMarkStore(state => state.images);
  const atlasImages = useAtlasStore(state => state.images);
  const selectedNodes = useCanvasStore(s => s.transientCanvas[CanvasType.MARK].selectedNodes);
  const hoverShape = useCanvasStore(s => s.transientCanvas[CanvasType.MARK].hoverShape);
  const snapSize = useSettingsStore(s => s.snap);

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

        const markPoints = dirtyIds.flatMap(id =>
          marks[id].points.flatMap(p => [Math.round(p.x), Math.round(p.y)]),
        );

        const results: string[] = await invoke("transform_image", {
          imgPath: image.filepath,
          points: markPoints,
        });

        results.forEach(async (base64, idx) => {
          const markId = dirtyIds[idx];
          const existingAtlasImage = Object.values(atlasImages).find(image => image.markId === markId);

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
        });

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
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <FaPlay />
              <span className="mx-2">
                Convert
              </span>
            </ContextMenuSubTrigger>

            <ContextMenuSubContent>
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
      </Toolbar>
    </div>
  );
}

export default MarkCanvas;
