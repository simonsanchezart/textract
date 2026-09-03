import type { Vec2 } from "@/types/types";
import { useMemo } from "react";
import { Rect } from "react-konva";
import { Colors } from "@/types/types";

type MarkEdgeHandleProps = {
  position: Vec2;
  offset?: Vec2;
  rotation?: number;
  scaleFactor?: number;
} & React.ComponentProps<typeof Rect>;

function MarkEdgeHandle({ position, offset = { x: 0, y: 0 }, rotation = 0, scaleFactor = 1, ...props }: MarkEdgeHandleProps) {
  const SIZE = useMemo(() => 12 * scaleFactor, [scaleFactor]);

  return (
    <Rect
      draggable
      offset={{ x: SIZE, y: 6 * scaleFactor }}
      width={SIZE * 2}
      height={SIZE}
      x={position.x + offset.x}
      y={position.y + offset.y}
      rotation={rotation}
      fill={Colors.LIGHT}
      shadowOffset={{ x: 0.5, y: 0.5 }}
      shadowOpacity={1}
      cornerRadius={1}
      onPointerEnter={(e) => {
        e.target.to({
          duration: 0.05,
          fill: Colors.GREEN,
        });
      }}
      onPointerLeave={(e) => {
        e.target.to({
          duration: 0.05,
          fill: Colors.LIGHT,
        });
      }}
      {...props}
    />
  );
}

export default MarkEdgeHandle;
