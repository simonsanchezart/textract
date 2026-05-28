import type Konva from "konva";
import type { CanvasType } from "@/types/types";
import { useCanvasStore } from "@/stores/canvas-store";

type CanvasPanSettings = {
  stageRef: React.RefObject<Konva.Stage | null>;
  canvasType: CanvasType;
};

export default function useCanvasPanning({ stageRef, canvasType }: CanvasPanSettings) {
  const setCanvasPosition = useCanvasStore(s => s.setCanvasPosition);

  const handlePan = () => {
    if (!stageRef.current)
      return;

    const stage = stageRef.current;
    const stageAttrs = stage.attrs;
    const { x, y } = { x: stageAttrs.x, y: stageAttrs.y };
    setCanvasPosition(canvasType, { x, y });
  };

  const resetPan = () => {
    if (!stageRef.current)
      return;

    const stage = stageRef.current;
    const container = stage.container();

    const stageWidth = container.offsetWidth;
    const stageHeight = window.innerHeight; // container height is 0

    setCanvasPosition(canvasType, {
      x: stageWidth / 2,
      y: stageHeight / 2,
    });
  };

  return { handlePan, resetPan };
}
