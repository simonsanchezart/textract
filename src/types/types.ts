export interface ImageType {
    id: string;
    position: Vec2;
    scale: Vec2;
    rotation: number;
}

export interface Vec2 {
    x: number;
    y: number;
}

export enum CanvasType {
    MARK = "mark",
    ATLAS = "atlas",
}

export enum Colors {
    RED = "#FF0000",
    GREEN = "#00FF00",
    BLUE = "#0000FF",
    LIGHT = "#FAF1C9",
    DARK = "#282828",
}
