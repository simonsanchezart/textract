import type Konva from "konva";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { useRef, useState } from "react";
import { BiSolidFileExport } from "react-icons/bi";
import { Group, Rect } from "react-konva";
import { Toolbar, ToolbarAction } from "@/components/Toolbar";
import { useAtlasStore } from "@/stores/atlas-store";
import { CanvasType } from "@/types/types";
import Canvas from "../Canvas";
import AtlasImageComponent from "./AtlasImageComponent";

function AtlasCanvas({ className }: { className?: string }) {
  const atlasImages = useAtlasStore(state => state.images);
  const removeAtlasImage = useAtlasStore(state => state.removeImage);

  // todo: move to zustand
  const [atlasSize, setAtlasSize] = useState(1024);
  const [transparentBg, setTransparentBg] = useState(false);

  const groupRef = useRef<Konva.Group>(null);
  const bgRef = useRef<Konva.Rect>(null);

  const exportCanvas = async () => {
    if (!groupRef.current)
      return;

    if (transparentBg)
      bgRef.current?.hide();
    const clone = groupRef.current.clone();
    const dataUrl = clone.toDataURL({
      x: 0,
      y: 0,
      width: atlasSize,
      height: atlasSize,
      pixelRatio: 1,
    });
    clone.destroy();
    bgRef.current?.show();

    const response = await fetch(dataUrl);
    const buffer = await response.arrayBuffer();
    const imageArray = new Uint8Array(buffer);

    const savePath = await save({
      title: "Save Canvas",
      filters: [{ name: "Image", extensions: ["png"] }],
      defaultPath: "stage.png",
    });

    if (savePath) {
      await writeFile(savePath, imageArray);
    }
  };

  return (
    <div className={`relative h-full ${className}`}>
      <Canvas
        canvasType={CanvasType.ATLAS}
        onDelete={async (ids) => {
          for (const id of ids) removeAtlasImage(id);
        }}
      >
        <Group ref={groupRef}>
          <Rect width={atlasSize} height={atlasSize} fill="white" ref={bgRef} />

          {Object.values(atlasImages).map((i) => {
            return <AtlasImageComponent key={i.id} imageData={i} />;
          })}
        </Group>
      </Canvas>

      <Toolbar>
        <ToolbarAction Icon={BiSolidFileExport} onClick={exportCanvas} />
      </Toolbar>
    </div>
  );
}
export default AtlasCanvas;
