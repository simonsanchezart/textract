import type Konva from "konva";
import type { CanvasType } from "@/types/types";
import { useCallback } from "react";
import { useCanvasStore } from "@/stores/canvas-store";

type CanvasZoomSettings = {
  stageRef: React.RefObject<Konva.Stage | null>;
  canvasType: CanvasType;
  zoomMultiplier?: number;
  minZoom?: number;
  maxZoom?: number;
};

export function zoomCanvas({ canvasType, stageRef, zoomMultiplier = 1.1, minZoom = 0.1, maxZoom = 100, direction = 1 }: CanvasZoomSettings & { direction: number }) {
  const stage = stageRef.current;

  if (!stage)
    return { newPos: { x: 0, y: 0 }, newScale: 1.0 };

  const oldScale = stage.scaleX();
  const pointer = stage.getPointerPosition()!;
  const offset = stage.offset();
  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale + offset.x,
    y: (pointer.y - stage.y()) / oldScale + offset.y,
  };

  let newScale = direction > 0 ? oldScale * zoomMultiplier : oldScale / zoomMultiplier;
  newScale = Math.max(Math.min(maxZoom, newScale), minZoom);
  if (Math.abs(newScale - 1.0) < 0.05)
    newScale = 1;

  const newPos = {
    x: pointer.x - (mousePointTo.x - offset.x) * newScale,
    y: pointer.y - (mousePointTo.y - offset.y) * newScale,
  };

  useCanvasStore.getState().setCanvasPosition(canvasType, newPos);
  useCanvasStore.getState().setCanvasScale(canvasType, newScale);
}

export default function useCanvasZoom({ canvasType, stageRef, zoomMultiplier = 1.1, minZoom = 0.1, maxZoom = 100 }: CanvasZoomSettings) {
  const handleZoom = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    zoomCanvas({ canvasType, stageRef, zoomMultiplier, minZoom, maxZoom, direction });
  }, [canvasType, maxZoom, minZoom, stageRef, zoomMultiplier]);

  return handleZoom;
}
