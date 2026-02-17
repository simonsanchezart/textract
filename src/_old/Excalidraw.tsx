import "./App.css";
import Konva from "konva";
import useImage from "use-image";
import { Stage, Layer, Rect, Image, Transformer, Circle } from "react-konva";
import { useEffect, useRef, useState } from "react";
import { KonvaPointerEvent } from "konva/lib/PointerEvents";
import { convertFileSrc } from "@tauri-apps/api/core";

enum Actions {
    Select,
    Rectangle,
    Circle,
}

namespace Draw {
    export enum ShapeType {
        Rectangle,
        Circle,
    }

    interface BaseShape {
        id: string;
        type: ShapeType;
        x: number;
        y: number;
        stroke: string;
        strokeWidth: number;
    }

    const baseParameters = {
        x: 0,
        y: 0,
        fill: "#ff0000",
        stroke: "black",
        strokeWidth: 2,
    };

    export interface Rectangle extends BaseShape {
        type: ShapeType.Rectangle;
        width: number;
        height: number;
        fill: string;
        stroke: string;
        strokeWidth: number;
    }

    export interface Circle extends BaseShape {
        type: ShapeType.Circle;
        radius: number;
        fill: string;
    }

    export type Shape = Rectangle | Circle;

    export function createRectangle(override: Partial<Omit<Rectangle, "id" | "type">> = {}): Rectangle {
        return {
            id: crypto.randomUUID(),
            type: ShapeType.Rectangle,
            ...baseParameters,
            width: 32,
            height: 32,
            ...override,
        };
    }

    export function createCircle(override: Partial<Omit<Circle, "id" | "type">> = {}): Circle {
        return {
            id: crypto.randomUUID(),
            type: ShapeType.Circle,
            ...baseParameters,
            radius: 32,
            ...override,
        };
    }

    export function drawShape(shape: BaseShape, draggable: boolean = false, events?: Partial<Konva.NodeConfig>) {
        if (shape === null) return;

        switch (shape.type) {
            case ShapeType.Rectangle:
                return <Rect {...shape} key={shape.id} draggable={draggable} {...events} />;
            case ShapeType.Circle:
                return <Circle {...shape} key={shape.id} draggable={draggable} {...events} />;
        }
    }
}

function generateRandomHexColor() {
    return (
        "#" +
        Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0")
    );
}

function Excalidraw() {
    const imageUrl = convertFileSrc(String.raw`C:\Users\Simon\Documents\Personal-Documents\projects\coding\rust\texture-extractor\public\input.png`);
    const [myImage] = useImage(imageUrl);

    const [action, setAction] = useState<Actions>(Actions.Rectangle);
    const [shapes, setShapes] = useState<Draw.Shape[]>([]);
    const [currentShape, setCurrentShape] = useState<Draw.Shape | null>();

    const stageRef = useRef<Konva.Stage | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [stageSize, setStageSize] = useState({ width: 512, height: 512 });

    const isPainting = useRef(false);
    const transformerRef = useRef<Konva.Transformer | null>(null);

    const onPointerDown = () => {
        if (action === Actions.Select) return;

        const stage = stageRef.current;
        const pointer = stage?.getPointerPosition();
        isPainting.current = true;

        switch (action) {
            case Actions.Rectangle:
                setCurrentShape(
                    Draw.createRectangle({
                        x: pointer?.x!,
                        y: pointer?.y!,
                        width: 0,
                        height: 0,
                        fill: generateRandomHexColor(),
                    })
                );
                break;
            case Actions.Circle:
                setCurrentShape(
                    Draw.createCircle({
                        x: pointer?.x!,
                        y: pointer?.y!,
                        radius: 0,
                        fill: generateRandomHexColor(),
                    })
                );
                break;
        }
    };

    const onPointerMove = () => {
        if (action === Actions.Select || !isPainting.current) return;

        const stage = stageRef.current;
        const pointer = stage?.getPointerPosition();
        const last = currentShape;

        switch (last?.type) {
            case Draw.ShapeType.Rectangle:
                setCurrentShape({
                    ...last,
                    width: pointer!.x - last.x,
                    height: pointer!.y - last.y,
                });

                break;
            case Draw.ShapeType.Circle:
                setCurrentShape({
                    ...last,
                    radius: Math.abs(pointer!.x - last.x),
                });
                break;
        }

        stageRef.current?.batchDraw();
    };

    const onPointerUp = () => {
        if (!isPainting.current) return;

        isPainting.current = false;
        setShapes((prev) => [...prev, currentShape!]);
        setCurrentShape(null);
    };

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            const { width, height } = entry.contentRect;

            setStageSize({
                width,
                height,
            });
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const onClick = (e: KonvaPointerEvent) => {
        if (action !== Actions.Select) return;
        if (e.target === e.target.getStage()) {
            transformerRef.current?.nodes([]);
            return;
        }

        transformerRef.current?.nodes([e.target]);
    };

    return (
        <>
            <div className="flex flex-col h-screen items-center align-middle justify-center">
                {Toolbar()}

                <div ref={containerRef} className="mx-auto w-2xl h-1/2 bg-red-400">
                    <Stage
                        width={stageSize.width}
                        height={stageSize.height}
                        className="bg-gray-200"
                        ref={stageRef}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onClick={onClick}
                    >
                        <Layer>
                            <Image
                                image={myImage}
                                draggable={action === Actions.Select}
                                rotation={45}
                                scale={{ x: 0.6, y: 1.2 }}
                            />
                        </Layer>

                        <Layer>
                            {shapes.map((r) => Draw.drawShape(r, action === Actions.Select))}

                            {currentShape && Draw.drawShape(currentShape, action === Actions.Select)}

                            <Transformer ref={transformerRef} />
                        </Layer>
                    </Stage>
                </div>
            </div>
        </>
    );

    function Toolbar() {
        return (
            <div className="flex flex-row bg-white gap-2 justify-center items-center my-2">
                <h1 className="text-blue-400 font-black">{Actions[action]}</h1>
                <button onClick={() => setAction(Actions.Select)} className="bg-amber-400 p-1 rounded-lg">
                    Select
                </button>
                <button onClick={() => setAction(Actions.Rectangle)} className="bg-amber-400 p-1 rounded-lg">
                    Rectangle
                </button>
                <button onClick={() => setAction(Actions.Circle)} className="bg-amber-400 p-1 rounded-lg">
                    Circle
                </button>
            </div>
        );
    }
}

export default Excalidraw;
