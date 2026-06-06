import type { Vec2 } from "@/types/types";
import { useMemo } from "react";
import { Rect } from "react-konva";
import { Colors } from "@/types/types";

type MarkPointProps = {
  position: Vec2;
  offset?: Vec2;
  scaleFactor?: number;
} & React.ComponentProps<typeof Rect>;

function MarkPoint({ position, offset = { x: 0, y: 0 }, scaleFactor = 1, ...props }: MarkPointProps) {
  const POINT_SIZE = useMemo(() => 16 * scaleFactor, [scaleFactor]);
  const POINT_SIZE_H = useMemo(() => POINT_SIZE / 2, [POINT_SIZE]);

  return (
    <Rect
      x={position.x}
      y={position.y}
      fill={Colors.LIGHT}
      shadowOffset={{ x: 0.5, y: 0.5 }}
      shadowOpacity={1}
      cornerRadius={100}
      width={POINT_SIZE}
      height={POINT_SIZE}
      offset={{ x: POINT_SIZE_H - offset.x, y: POINT_SIZE_H - offset.y }}
      onPointerEnter={(e) => {
        e.target.to({
          duration: 0.05,
          width: POINT_SIZE * 1.1,
          height: POINT_SIZE * 1.1,
          offsetX: POINT_SIZE_H * 1.1 - offset.x,
          offsetY: POINT_SIZE_H * 1.1 - offset.y,
          fill: Colors.GREEN,
        });
      }}
      onPointerLeave={(e) => {
        e.target.to({
          duration: 0.05,
          width: POINT_SIZE,
          height: POINT_SIZE,
          offsetX: POINT_SIZE_H - offset.x,
          offsetY: POINT_SIZE_H - offset.y,
          fill: Colors.LIGHT,
        });
      }}
      draggable
      {...props}
    />
  );
}

export default MarkPoint;
