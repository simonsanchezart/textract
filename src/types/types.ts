//refactor: rename to Vec2, move to namespace if conflict
export interface Point2DType {
    x: number;
    y: number;
};

//refactor: rename to Canvas, , move to namespace if conflict
export enum CanvasType {
    MARK = "mark",
    ATLAS = "atlas",
}
