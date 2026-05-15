import type { AtlasImageType } from "@/stores/atlas-store";
import type { MarkImageType } from "@/stores/mark-store";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { info, warn } from "@tauri-apps/plugin-log";
import Konva from "konva";
import { TrashIcon } from "lucide-react";
import { useRef } from "react";
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
  const addMarkImage = useMarkStore(state => state.addImage);
  const removeMarkImage = useMarkStore(state => state.removeImage);
  const addAtlasImage = useAtlasStore(state => state.addImage);
  const selectedNodes = useCanvasStore(s => s.transientCanvas[CanvasType.MARK].selectedNodes);
  const hoverShape = useCanvasStore(s => s.transientCanvas[CanvasType.MARK].hoverShape);

  const transformerRef = useRef<Konva.Transformer>(null);

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

    for (const img of selectedImages) {
      info(`Loading ${img}`);

      const assetUrl = convertFileSrc(img);
      const markImage: MarkImageType = {
        id: crypto.randomUUID(),
        filepath: img,
        src: assetUrl,
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        markIds: [],
      };

      addMarkImage(markImage);
    }
  };

  const convertImages = async () => {
    const marks = useMarkStore.getState().marks;

    await Promise.all(
      Object.values(markImages).map(async (i) => {
        const markIds = i.markIds;
        const markPoints = markIds.flatMap(id =>
          marks[id].points.flatMap(p => [Math.round(p.x), Math.round(p.y)]),
        );

        const results: string[] = await invoke("transform_image", {
          imgPath: i.filepath,
          points: markPoints,
        });

        for (const [i, img] of results.entries()) {
          const atlasImage: AtlasImageType = {
            id: crypto.randomUUID(),
            base64: img,
            markId: markIds[i],
            position: { x: 0, y: 0 },
            rotation: 0,
            scale: { x: 1, y: 1 },
          };

          addAtlasImage(atlasImage);
        }
      }),
    );
  };

  const contextMenu = () => (
    <ContextMenuGroup>
      {/* todo: */}
      <ContextMenuItem onClick={() => warn("TO IMPLEMENT")}>
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
                    // todo:
                    <ContextMenuItem onClick={() => warn("TO IMPLEMENT")}>
                      Hovered
                    </ContextMenuItem>
                  )}
                {/* todo: show only if there are marks */}
                {selectedNodes.length > 0
                  && (
                    // todo:
                    <ContextMenuItem onClick={() => warn("TO IMPLEMENT")}>
                      Selected Images
                    </ContextMenuItem>
                  )}

                {/* todo: */}
                <ContextMenuItem onClick={() => warn("TO IMPLEMENT")}>
                  All
                </ContextMenuItem>
              </ContextMenuGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

      {(hoverShape && hoverShape instanceof Konva.Line)
        && (
          <ContextMenuGroup>
            {/* todo: */}
            <ContextMenuItem variant="destructive" onClick={() => warn("TO IMPLEMENT")}>
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
        <Line points={[0, -10e10, 0, 10e10]} stroke="green" strokeWidth={2} listening={false} />
        <Line points={[-10e10, 0, 10e10, 0]} stroke="red" strokeWidth={2} listening={false} />

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
