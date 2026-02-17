import "./App.css";
import Konva from "konva";
import { Stage, Layer, Rect } from "react-konva";
import { useRef, useState } from "react";
import { writeFile, BaseDirectory } from "@tauri-apps/plugin-fs";

type RectType = {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
};

function Squares() {
  const stageRef = useRef<Konva.Stage | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [rects, setRects] = useState<RectType[]>([]);
  const [newRect, setNewRect] = useState<RectType | null>(null);
  const [text, setText] = useState<string>("0, 0");

  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    setText(`${e.evt.layerX}, ${e.evt.layerY}`);
    setNewRect({
      x: e.evt.layerX,
      y: e.evt.layerY,
      width: 0,
      height: 0,
      id: Date.now().toString(),
    });

    setIsDrawing(true);
  };

  const onMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!newRect || !isDrawing) return;

    setNewRect({
      ...newRect,
      width: e.evt.layerX - newRect.x,
      height: e.evt.layerY - newRect.y,
    });
  };

  const onMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (newRect) {
      setRects([...rects, newRect]);
    }

    setIsDrawing(false);
    setNewRect(null);
  };

  const saveBlob = async (blob: Blob, filename: string) => {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    await writeFile(filename, bytes, {
      baseDir: BaseDirectory.Desktop,
    });
  };

  const onExport = async () => {
    if (!stageRef.current) return;

    const blob = await new Promise<Blob>((resolve) => {
      stageRef.current!.toBlob({
        mimeType: "image/png",
        callback: (b: Blob | null) => resolve(b!),
      });
    });

    await saveBlob(blob, "my_data.png");
  };

  return (
    <>
      <button className="bg-amber-400 p-2 m-2" onClick={onExport}>
        Export
      </button>

      <h2>{text}</h2>

      <div className="relative w-full h-screen overflow-hidden bg-red-500">
        <Stage
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          width={window.innerWidth}
          height={window.innerHeight}
          className="bg-gray-200"
          ref={stageRef}
        >
          <Layer>
            {newRect && <Rect {...newRect} draggable fill="red" />}

            {rects.map((r) => (
              <Rect {...r} fill="blue" draggable key={r.id} />
            ))}
          </Layer>
        </Stage>
      </div>
    </>
  );
}

export default Squares;
