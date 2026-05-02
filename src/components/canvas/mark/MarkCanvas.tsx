import type { AtlasImageType } from "@/stores/atlas-store";
import type { MarkImageType } from "@/stores/mark-store";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { info } from "@tauri-apps/plugin-log";
import { CgAdd } from "react-icons/cg";
import { FaPlay } from "react-icons/fa";
import { Toolbar, ToolbarAction } from "@/components/Toolbar";
import { useAtlasStore } from "@/stores/atlas-store";
import { useMarkStore } from "@/stores/mark-store";
import { CanvasType } from "@/types/types";
import Canvas from "../Canvas";
import MarkImage from "./MarkImage";

function MarkCanvas({ className = "" }: { className?: string }) {
  const markImages = useMarkStore(state => state.images);
  const addMarkImage = useMarkStore(state => state.addImage);
  const removeMarkImage = useMarkStore(state => state.removeImage);
  const addAtlasImage = useAtlasStore(state => state.addImage);

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

  return (
    <div className={`relative h-full ${className}`}>
      <Canvas
        onDelete={async (ids) => {
          for (const id of ids) removeMarkImage(id);
        }}
        canvasType={CanvasType.MARK}
      >
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
