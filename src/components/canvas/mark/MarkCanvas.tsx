import type { AtlasImageType } from "@/stores/atlas-store";
import type { MarkImageType } from "@/stores/mark-store";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { exists } from "@tauri-apps/plugin-fs";
import { info, warn } from "@tauri-apps/plugin-log";
import Konva from "konva";
import { TrashIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { CgAdd } from "react-icons/cg";
import { FaPlay } from "react-icons/fa";
import { Line } from "react-konva";
import { Toolbar, ToolbarAction } from "@/components/Toolbar";
import { ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger } from "@/components/ui/ContextMenu";
import { useAtlasStore } from "@/stores/atlas-store";
import { useCanvasStore } from "@/stores/canvas-store";
import { useMarkStore } from "@/stores/mark-store";
import { CanvasType } from "@/types/types";
import Canvas from "../Canvas";
import MarkImage from "./MarkImage";

function MarkCanvas({ className = "" }: { className?: string }) {
  const markImages = useMarkStore(state => state.images);
  const atlasImages = useAtlasStore(state => state.images);
  const updateImageBase64 = useAtlasStore(state => state.updateImageBase64);
  const addMarkImage = useMarkStore(state => state.addImage);
  const updateMarkDirty = useMarkStore(state => state.updateMarkDirty);
  const removeMarkImage = useMarkStore(state => state.removeImage);
  const addAtlasImage = useAtlasStore(state => state.addImage);
  const selectedNodes = useCanvasStore(s => s.transientCanvas[CanvasType.MARK].selectedNodes);
  const hoverShape = useCanvasStore(s => s.transientCanvas[CanvasType.MARK].hoverShape);

  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const removeMissingImages = async () => {
      const missingImages = [];
      for (const img of Object.values(markImages)) {
        if (!(await exists(img.filepath))) {
          missingImages.push(img.id);
        }
      }

      missingImages.forEach((id) => {
        warn(`Removing missing image: ${markImages[id].filepath}`);
        removeMarkImage(id);
      });
    };

    removeMissingImages();
  }, [markImages, removeMarkImage]);

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
      info(`Loading ${imgPath}`);

      const assetUrl = convertFileSrc(imgPath);
      const img = new Image();
      img.src = assetUrl;

      const markImage: MarkImageType = {
        id: crypto.randomUUID(),
        filepath: imgPath,
        src: assetUrl,
        position: {
          x: centerX - img.width / 2,
          y: centerY - img.height / 2,
        },
        rotation: 0,
        scale: { x: 1, y: 1 },
        markIds: [],
      };

      addMarkImage(markImage);
    }
  };

  const convertImages = async (type: "ALL" | "SELECTED" | "HOVERED" = "ALL") => {
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
        // todo: warn
        if (!hoverShape)
          return;

        const hoveredMarkId = hoverShape.id();
        const hoverMark = marks[hoveredMarkId];

        if (!hoverMark)
          return;

        // todo: warn
        if (!hoverMark.dirty)
          return;

        const image = markImages[hoverMark.imageId];
        if (!image)
          return;

        entries = [
          {
            image,
            markIds: [hoveredMarkId],
          },
        ];

        break;
      }
    }

    await Promise.all(
      entries.map(async ({ image, markIds }) => {
        const dirtyIds = markIds.filter(id => marks[id].dirty);

        // todo: warn and popup
        if (dirtyIds.length === 0)
          return;

        const markPoints = dirtyIds.flatMap(id =>
          marks[id].points.flatMap(p => [Math.round(p.x), Math.round(p.y)]),
        );

        const results: string[] = await invoke("transform_image", {
          imgPath: image.filepath,
          points: markPoints,
        });

        results.forEach((base64, idx) => {
          const markId = dirtyIds[idx];
          const existingAtlasImage = Object.values(atlasImages).find(image => image.markId === markId);

          if (existingAtlasImage) {
            updateImageBase64(existingAtlasImage.id, base64);
          }
          else {
            const atlasImage: AtlasImageType = {
              id: crypto.randomUUID(),
              base64,
              markId,
              position: { x: 0, y: 0 },
              rotation: 0,
              scale: { x: 1, y: 1 },
            };

            addAtlasImage(atlasImage);
          }
          updateMarkDirty(markId, false);
        });
      }),
    );
  };

  const contextMenu = () => (
    <ContextMenuGroup>
      <ContextMenuItem onClick={loadImages}>
        <CgAdd />
        Add Images
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
                {(hoverShape && hoverShape instanceof Konva.Line)
                  && (
                    <ContextMenuItem onClick={() => convertImages("HOVERED")}>
                      Hovered
                    </ContextMenuItem>
                  )}
                {selectedNodes.length > 0
                  && (
                    <ContextMenuItem onClick={() => convertImages("SELECTED")}>
                      Selected Images
                    </ContextMenuItem>
                  )}

                <ContextMenuItem onClick={() => convertImages("ALL")}>
                  All
                </ContextMenuItem>
              </ContextMenuGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

      {(hoverShape && hoverShape instanceof Konva.Line)
        && (
          <ContextMenuGroup>
            <ContextMenuItem
              variant="destructive"
              onClick={() => {
                hoverShape.getAttr("removeMark")?.();
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

  return (
    <div className={`relative h-full ${className}`}>
      <Canvas
        transformerRef={transformerRef}
        onDelete={async (ids) => {
          for (const id of ids) removeMarkImage(id);
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
        <ToolbarAction Icon={CgAdd} onClick={loadImages} />
        <ToolbarAction Icon={FaPlay} size={4} onClick={convertImages} />
      </Toolbar>
    </div>
  );
}

export default MarkCanvas;
