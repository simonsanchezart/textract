import { Rect } from "react-konva";
import { Vec2, Colors } from "@/types/types";

type MarkPointProps = {
    position: Vec2;
    offset?: Vec2;
} & React.ComponentProps<typeof Rect>;

const MarkPoint = ({ position, offset = { x: 0, y: 0 }, ...props }: MarkPointProps) => {
    const POINT_SIZE = 12;
    const POINT_SIZE_H = POINT_SIZE / 2;

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
                    width: POINT_SIZE * 1.5,
                    height: POINT_SIZE * 1.5,
                    offsetX: POINT_SIZE_H * 1.5 - offset.x,
                    offsetY: POINT_SIZE_H * 1.5 - offset.y,
                    fill: Colors.RED,
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
};

export default MarkPoint;
