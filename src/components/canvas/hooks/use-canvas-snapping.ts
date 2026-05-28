import type Konva from "konva";
import type { Box } from "konva/lib/shapes/Transformer";
import type { RefObject } from "react";
import { useCallback } from "react";
import { snap } from "@/utils/utils";

type TransformSnappingProps = {
  stageRef: RefObject<Konva.Stage | null>;
  snapSize: number;
};

export default function useTransformSnapping({ stageRef, snapSize }: TransformSnappingProps) {
  const handleTransformDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const target = e.target;
    if (target.name() !== "master")
      return;

    const x = snap(target.x(), snapSize);
    const y = snap(target.y(), snapSize);

    target.position({ x, y });
  }, [snapSize]);

  const handleTransformSnapping = useCallback((_oldBox: Box, newBox: Box) => {
    const stage = stageRef.current;
    if (!stage)
      return newBox;

    const scale = stage.scaleX();
    const stageX = stage.x();
    const stageY = stage.y();
    const offset = stage.offset();

    const newX = snap((newBox.x - stageX) / scale + offset.x, snapSize);
    const newY = snap((newBox.y - stageY) / scale + offset.y, snapSize);
    const newW = snap(newBox.width / scale, snapSize);
    const newH = snap(newBox.height / scale, snapSize);

    return {
      x: (newX - offset.x) * scale + stageX,
      y: (newY - offset.y) * scale + stageY,
      width: Math.max(newW * scale, scale * snapSize),
      height: Math.max(newH * scale, scale * snapSize),
      rotation: newBox.rotation,
    };
  }, [stageRef, snapSize]);

  return { handleTransformDragMove, handleTransformSnapping };
}
