import type Konva from "konva";
import type { Box } from "konva/lib/shapes/Transformer";
import * as React from "react";
import { snap } from "@/lib/utils";

type TransformSnappingProps = {
  stageRef: React.RefObject<Konva.Stage | null>;
  snapSize: number;
};

export default function useTransformSnapping({ stageRef, snapSize }: TransformSnappingProps) {
  const handleDragMove = React.useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const target = e.target;
    if (target.name() !== "master")
      return;

    const x = snap(target.x(), snapSize);
    const y = snap(target.y(), snapSize);

    target.position({ x, y });
  }, [snapSize]);

  const handleTransformSnapping = React.useCallback((_oldBox: Box, newBox: Box) => {
    const stage = stageRef.current;
    if (!stage)
      return newBox;

    const scale = stage.scaleX();
    const stageX = stage.x();
    const stageY = stage.y();

    const newX = snap((newBox.x - stageX) / scale, snapSize);
    const newY = snap((newBox.y - stageY) / scale, snapSize);
    const newW = snap(newBox.width / scale, snapSize);
    const newH = snap(newBox.height / scale, snapSize);

    return {
      x: newX * scale + stageX,
      y: newY * scale + stageY,
      width: Math.max(newW * scale, scale * snapSize),
      height: Math.max(newH * scale, scale * snapSize),
      rotation: newBox.rotation,
    };
  }, [stageRef, snapSize]);

  return [handleDragMove, handleTransformSnapping] as const;
}
