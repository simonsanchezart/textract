import "./App.css";
import Konva from "konva";
import useImage from "use-image";
import { Stage, Layer, Rect, Image, Transformer, Circle, Line } from "react-konva";
import { useEffect, useRef, useState } from "react";
import { KonvaPointerEvent } from "konva/lib/PointerEvents";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";

namespace Extractor {
    export type Point = {
        x: number;
        y: number;
    };

    const base = {
        x: 0,
        y: 0,
    };
}

function SimpleTransformation() {
    const imageUrl = String.raw`C:\Users\Simon\Documents\Personal-Documents\projects\coding\rust\texture-extractor\public\input.png`;
    const imageUrlInternal = convertFileSrc(imageUrl);
    const [myImage] = useImage(imageUrlInternal);
    console.log("load image")

    const [imageResultUrl, setImageResultUrl] = useState<string>("");
    const MyImageResult = ({ url, ...props }: { url: string }) => {
        const [image] = useImage(convertFileSrc(url));
        return <Image image={image} {...props} draggable />;
    };
    const [points, setPoints] = useState<Extractor.Point[]>([]);
    const [pointsRelative, setPointsRelative] = useState<Extractor.Point[]>([]);

    const stageRef = useRef<Konva.Stage | null>(null);
    const imageRef = useRef<Konva.Image | null>(null);

    const onPointerUpImage = (e: KonvaPointerEvent) => {
        const stage = e.target.getStage();
        const pointerAbsolute = stage?.getPointerPosition();
        const { x, y } = imageRef.current?.getRelativePointerPosition()!;

        setPoints((prev) => [...prev, { x: pointerAbsolute?.x!, y: pointerAbsolute?.y! }].slice(-4));
        setPointsRelative((prev) => [...prev, { x: x, y: y }].slice(-4));
    };

    return (
        <>
            <div className="flex flex-col h-screen items-center align-middle justify-center bg-gray-800">
                {Toolbar()}

                <div className="flex h-4/5 w-full justify-center align-middle items-center gap-10">
                    <div className="w-full h-full ml-10 overflow-hidden">
                        <Stage
                            width={window.innerWidth}
                            height={window.innerHeight}
                            ref={stageRef}
                            className="bg-gray-900 rounded-sm drop-shadow-2xl"
                        >
                            <Layer>
                                <Image
                                    image={myImage}
                                    ref={imageRef}
                                    draggable
                                    onPointerUp={onPointerUpImage}
                                    rotation={45}
                                    x={400}
                                    scale={{ x: 0.4, y: 1.2 }}
                                />
                            </Layer>
                            <Layer>
                                {points.map((p) => (
                                    <Rect {...p} width={4} height={4} fill="red" />
                                ))}

                                <Line
                                    points={points.flatMap((p) => [p.x, p.y])}
                                    fill="#FF000022"
                                    stroke="white"
                                    strokeWidth={1}
                                    closed
                                />
                            </Layer>
                        </Stage>
                    </div>
                    <div className="w-full h-full mr-10 overflow-hidden">
                        <Stage
                            width={window.innerWidth}
                            height={window.innerHeight}
                            className="bg-gray-900 rounded-sm drop-shadow-2xl"
                        >
                            <Layer>
                                <MyImageResult url={imageResultUrl} />
                            </Layer>
                        </Stage>
                    </div>
                </div>
            </div>
        </>
    );

    function Toolbar() {
        return (
            <div className="flex gap-4 justify-center items-center m-6">
                <button className="bg-amber-400 p-1 rounded-md outline transition-all duration-200 hover:scale-110 hover:cursor-pointer">
                    Draw
                </button>
                <button
                    className="bg-amber-400 p-1 rounded-md outline transition-all duration-200 hover:scale-110 hover:cursor-pointer"
                    onClick={async () => {
                        const pointsRelativeFlat = pointsRelative.flatMap((p) => [Math.round(p.x), Math.round(p.y)]);

                        console.log(pointsRelativeFlat);
                        const outputFile: string = await invoke("transform_image", {
                            imgUrl: imageUrl,
                            points: pointsRelativeFlat,
                        });

                        console.log(outputFile);
                        setImageResultUrl(outputFile);
                    }}
                >
                    Transform
                </button>
                <button className="bg-amber-600 p-1 rounded-md outline transition-all duration-200 hover:scale-110 hover:cursor-pointer">
                    Save
                </button>
            </div>
        );
    }
}

export default SimpleTransformation;
