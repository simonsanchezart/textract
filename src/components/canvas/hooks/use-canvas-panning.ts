import type Konva from "konva";
import type { CanvasType } from "@/types/types";
import { useCallback, useEffect } from "react";
import { useCanvasStore } from "@/stores/canvas-store";

type CanvasPanSettings = {
  stageRef: React.RefObject<Konva.Stage | null>;
  canvasType: CanvasType;
};

export default function useCanvasPanning({ stageRef, canvasType }: CanvasPanSettings) {
  const handlePan = useCallback(() => {
    if (!stageRef.current)
      return;

    const stage = stageRef.current;
    const stageAttrs = stage.attrs;
    const { x, y } = { x: stageAttrs.x, y: stageAttrs.y };
    useCanvasStore.getState().setCanvasPosition(canvasType, { x, y });
  }, [canvasType, stageRef]);

  const resetPan = useCallback(() => {
    if (!stageRef.current)
      return;

    const stage = stageRef.current;
    const container = stage.container();

    const stageWidth = container.offsetWidth;
    const stageHeight = window.innerHeight; // container height is 0

    useCanvasStore.getState().setCanvasPosition(canvasType, {
      x: stageWidth / 2,
      y: stageHeight / 2,
    });
  }, [canvasType, stageRef]);

  useEffect(resetPan, [resetPan]);

  return { handlePan, resetPan };
}
