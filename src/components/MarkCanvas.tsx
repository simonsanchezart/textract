import { ReactNode, RefObject, useEffect, useReducer, useRef, useState } from "react";
import { CgAdd } from "react-icons/cg";
import { open } from "@tauri-apps/plugin-dialog";
import Canvas from "./Canvas";
import { convertFileSrc } from "@tauri-apps/api/core";
import useImage from "use-image";
import { Stage, Layer, Rect, Image, Transformer, Circle, Line, KonvaNodeComponent, Group } from "react-konva";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { KonvaPointerEvent } from "konva/lib/PointerEvents";

//todo: test every image format

type PointType = {
    x: number;
    y: number;
};

type MarkType = {
    points: PointType[];
};

type MarkImageType = {
    id: string;
    src: string;
    x: number;
    y: number;
};

const MarkImageComponent = ({ imageData }: { imageData: MarkImageType }) => {
    const [image] = useImage(imageData.src);
    const [marks, setMarks] = useState<MarkType[]>([]);
    const [currentPoints, setCurrentPoints] = useState<PointType[]>([]);
    const imageRef = useRef<Konva.Image | null>(null);
    const POINT_SIZE = 4;

    // marker: keep state with currentPoints
    // once is reaches 4, push to MarkImageType marks
    // allow for cancelling
    // disable dragging, etc... while drawings

    const addPoint = (e: KonvaPointerEvent) => {
        const pos = imageRef.current?.getRelativePointerPosition();
        if (pos == null) return;

        setCurrentPoints((prev) => {
            const updated = [...prev, { x: pos.x, y: pos.y }];

            if (updated.length === 4) {
                setMarks((marksPrev) => [...marksPrev, { points: updated }]);
                return [];
            }

            return updated;
        });
    };

    return (
        <Group
            draggable
            x={imageData.x}
            y={imageData.y}
            onClick={addPoint}
            className="bg-red-400"
            // onMouseDown={(e) => {
            //     if (e.evt.button !== 0) {
            //         e.cancelBubble = false;
            //         e.target.draggable(false);
            //     } else {
            //         e.target.draggable(true);
            //     }
            // }}
            // onDragStart={(e) => {
            //     if (e.evt.buttons != 1) {
            //         e.target.stopDrag();
            //     }
            // }}
        >
            <Image ref={imageRef} image={image} />

            {currentPoints.map((m) => (
                <Rect
                    x={m.x - POINT_SIZE / 2}
                    y={m.y - POINT_SIZE / 2}
                    fill={"red"}
                    width={POINT_SIZE}
                    height={POINT_SIZE}
                    // draggable
                />
            ))}

            {marks.map((m) => (
                <Group draggable>
                    {m.points.map((p) => (
                        <Rect
                            x={p.x - POINT_SIZE / 2}
                            y={p.y - POINT_SIZE / 2}
                            fill={"blue"}
                            width={POINT_SIZE}
                            height={POINT_SIZE}
                            draggable
                        />
                    ))}

                    <Line
                        points={m.points.flatMap((p) => [p.x, p.y])}
                        fill="#FF000022"
                        stroke="white"
                        strokeWidth={1}
                        closed
                    />
                </Group>
            ))}
        </Group>
    );
};

function MarkCanvas({ className = "" }: { className?: string; chldren?: ReactNode }) {
    const [images, setImages] = useState<MarkImageType[]>([]);

    return (
        <div className={`relative h-full ${className}`} id="tester">
            <Canvas>
                {images.map((i) => {
                    return <MarkImageComponent imageData={i} />;
                })}
            </Canvas>

            <div className="flex text-center items-center absolute bottom-0 left-0 bg-dark-main-darker p-2 rounded-tr-2xl gap-2">
                <CgAdd
                    className="size-6 button-icon"
                    onClick={async () => {
                        const selectedImages = await open({
                            title: "Select image/s to open",
                            multiple: true,
                            directory: false,
                            filters: [{ name: "Image Files", extensions: ["png", "jpg", "jpeg", "tiff", "bmp"] }],
                        });

                        if (!selectedImages) return;
                        const internalUrls = selectedImages.map((i) => convertFileSrc(i));

                        const imageSet: MarkImageType[] = internalUrls.map((url) => ({
                            id: crypto.randomUUID(),
                            src: url,
                            x: 0,
                            y: 0,
                            marks: [],
                        }));
                        setImages((prev) => [...prev, ...imageSet]);
                    }}
                />
            </div>
        </div>
    );
}
export default MarkCanvas;
