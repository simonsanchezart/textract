import { Rect } from "react-konva";
import Konva from "konva";
import { Colors } from "../types/colors";
import { Point2DType } from "@/types/types";

type MarkPointProps = {
    position: Point2DType;
    offset?: Point2DType;
} & React.ComponentProps<typeof Rect>;

function MarkPoint({ position, offset = { x: 0, y: 0 }, ...props }: MarkPointProps) {
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
                //xfunc: also cache?
                new Konva.Tween({
                    node: e.target,
                    duration: 0.02,
                    width: POINT_SIZE * 1.5,
                    height: POINT_SIZE * 1.5,
                    offsetX: POINT_SIZE_H * 1.5 - offset.x,
                    offsetY: POINT_SIZE_H * 1.5 - offset.y,
                    fill: Colors.RED
                }).play();
            }}
            onPointerLeave={(e) => {
                //xfunc: also cache?
                new Konva.Tween({
                    node: e.target,
                    duration: 0.02,
                    width: POINT_SIZE,
                    height: POINT_SIZE,
                    offsetX: POINT_SIZE_H - offset.x,
                    offsetY: POINT_SIZE_H - offset.y,
                    fill: Colors.LIGHT
                }).play();
            }}
            draggable
            {...props}
        />
    );
}

export default MarkPoint;
