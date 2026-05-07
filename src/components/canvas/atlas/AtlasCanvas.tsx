import type Konva from "konva";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { useRef, useState } from "react";
import { BiSolidFileExport } from "react-icons/bi";
import { Group, Rect, Text } from "react-konva";
import { Toolbar, ToolbarAction } from "@/components/Toolbar";
import { useAtlasStore } from "@/stores/atlas-store";
import { useSettingsStore } from "@/stores/settings-store";
import { CanvasType } from "@/types/types";
import Canvas from "../Canvas";
import AtlasImageComponent from "./AtlasImageComponent";

function AtlasCanvas({ className }: { className?: string }) {
  const atlasImages = useAtlasStore(state => state.images);
  const removeAtlasImage = useAtlasStore(state => state.removeImage);

  // todo: move to zustand
  const atlasAlpha = useSettingsStore(s => s.atlasAlpha);
  const atlasResolution = useSettingsStore(s => s.atlasResolution);

  const groupRef = useRef<Konva.Group>(null);

  const exportCanvas = async () => {
    if (!groupRef.current)
      return;

    const bgShapes = groupRef.current.find(".bg");
    if (atlasAlpha) {
      for (const shape of bgShapes)
        shape.hide();
    }

    const clone = groupRef.current.clone();
    const dataUrl = clone.toDataURL({
      x: 0,
      y: 0,
      width: atlasResolution,
      height: atlasResolution,
      pixelRatio: 1,
    });
    clone.destroy();

    for (const shape of bgShapes)
      shape.show();

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
          <Rect
            name="bg"
            width={atlasResolution}
            height={atlasResolution}
            fill={atlasAlpha ? "#00000022" : "#999999"}
            listening={false}
            shadowEnabled
            shadowBlur={50}
            shadowOffsetX={10}
            shadowOffsetY={10}
            shadowOpacity={0.5}
          />

          {Object.values(atlasImages).map((i) => {
            return <AtlasImageComponent key={i.id} imageData={i} />;
          })}

          <Rect
            name="bg"
            x={-1}
            y={-1}
            width={atlasResolution + 2}
            height={atlasResolution + 2}
            stroke="#999999"
            listening={false}
            dash={[4, 8]}
            shadowEnabled
            shadowOffsetX={0.5}
            shadowOffsetY={0.5}
            shadowOpacity={0.5}
          />

          <Text
            text={`${atlasResolution}px`}
            x={0}
            y={atlasResolution + 8}
            fontSize={32}
            fontFamily="Calibri"
            fontStyle="100"
            fill="white"
            opacity={0.5}
            listening={false}
          />
        </Group>
      </Canvas>

      <Toolbar>
        <ToolbarAction Icon={BiSolidFileExport} onClick={exportCanvas} />
      </Toolbar>
    </div>
  );
}
export default AtlasCanvas;
