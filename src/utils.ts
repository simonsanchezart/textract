import { Point2DType } from "./stores/markStore";

const getMiddle = (v2: Point2DType[]) => {
    const average = v2.reduce((a, b) => {
        return { x: a.x + b.x, y: a.y + b.y };
    });

    average.x /= v2.length;
    average.y /= v2.length;
    return average;
};
