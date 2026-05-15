import type Konva from "konva";
import type { CanvasType } from "@/types/types";
import { useCanvasStore } from "@/stores/canvas-store";

type CanvasPanSettings = {
  stageRef: React.RefObject<Konva.Stage | null>;
  layerRef: React.RefObject<Konva.Layer | null>;
  canvasType: CanvasType;
};

export default function useCanvasPanning({ stageRef, layerRef, canvasType }: CanvasPanSettings) {
  const setCanvasScale = useCanvasStore(s => s.setCanvasScale);
  const setCanvasPosition = useCanvasStore(s => s.setCanvasPosition);

  const handlePan = () => {
    if (!stageRef.current)
      return;

    const stage = stageRef.current;
    const stageAttrs = stage.attrs;
    const { x, y } = { x: stageAttrs.x, y: stageAttrs.y };
    setCanvasPosition(canvasType, { x, y });
  };

  // todo: check for a better way of resetting this
  const resetPan = () => {
    if (!layerRef.current || !stageRef.current)
      return;

    setCanvasPosition(canvasType, { x: 0, y: 0 });
    // setCanvasScale(canvasType, 1.0);
  };

  return { handlePan, resetPan };
}
