import type Konva from "konva";
import { useCallback } from "react";

type CanvasGridSettings = {
  dotSpacing?: number;
  dotSize?: number;
  zoomLimit?: number;
};

export default function useCanvasGrid(settings: CanvasGridSettings, stageRef: React.RefObject<Konva.Stage | null>) {
  const { dotSpacing = 16, dotSize = 4, zoomLimit = 0.35 } = settings;

  const drawGrid = useCallback((ctx: Konva.Context, shape: Konva.Shape) => {
    const clampedSpacing = Math.max(16, dotSpacing);

    const stage = stageRef.current;
    if (!stage)
      return;

    const scale = stage.scaleX();
    if (scale < zoomLimit)
      return;

    const viewWidth = stage.width() / scale;
    const viewHeight = stage.height() / scale;

    const stagePos = stage.getPosition();
    const offset = stage.offset();
    const startX = -stagePos.x / scale + offset.x;
    const startY = -stagePos.y / scale + offset.y;
    const endX = startX + viewWidth;
    const endY = startY + viewHeight;

    const firstX = Math.floor(startX / clampedSpacing) * clampedSpacing;
    const firstY = Math.floor(startY / clampedSpacing) * clampedSpacing;

    ctx.fillStyle = "#3e3e3e";
    for (let x = firstX; x < endX; x += clampedSpacing) {
      for (let y = firstY; y < endY; y += clampedSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.fillStrokeShape(shape);
  }, [dotSpacing, dotSize, zoomLimit, stageRef]);

  return drawGrid;
}
