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
import { MarkImage, Point2D, useMarkStore } from "../stores/markStore";

//todo: test every image format

const MarkImageComponent = ({ imageData }: { imageData: MarkImage }) => {
    const updateImagePosition = useMarkStore((s) => s.updateImagePosition);
    const addMark = useMarkStore((s) => s.addMark);
    const marks = useMarkStore((s) => s.marks);

    const [image] = useImage(imageData.src);
    const [currentPoints, setCurrentPoints] = useState<Point2D[]>([]);
    const imageRef = useRef<Konva.Image | null>(null);
    const POINT_SIZE = 4;

    // marker: keep state with currentPoints
    // once is reaches 4, push to MarkImageType marks
    // allow for cancelling
    // disable dragging, etc... while drawings

    const addPoint = (e: KonvaPointerEvent) => {
        const pos = imageRef.current?.getRelativePointerPosition();
        if (pos == null) return;

        const updated = [...currentPoints, { x: pos.x, y: pos.y }];
        if (updated.length === 4) {
            addMark(imageData.id, {
                id: crypto.randomUUID(),
                imageId: imageData.id,
                points: updated,
            });

            setCurrentPoints([]);
        } else {
            setCurrentPoints(updated);
        }

        // setCurrentPoints((prev) => {
        //         return [];
        //     }

        //     return updated;
        // });
    };
    const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
        if (e.target.name() !== "master") return;
        updateImagePosition(imageData.id, { x: e.target.attrs.x, y: e.target.attrs.y });
    };

    return (
        <Group
            name="master"
            draggable
            x={imageData.position.x}
            y={imageData.position.y}
            onClick={addPoint}
            onDragEnd={onDragEnd}
        >
            <Image ref={imageRef} image={image} />

            {currentPoints.map((m) => (
                <Rect
                    x={m.x - POINT_SIZE / 2}
                    y={m.y - POINT_SIZE / 2}
                    fill={"red"}
                    width={POINT_SIZE}
                    height={POINT_SIZE}
                    // todo: set point position on draggable
                    // draggable
                />
            ))}

            {imageData.markIds.map((id) => {
                const mark = marks[id];
                if (!mark) return;

                return (
                    <Group key={id} draggable name="mark">
                        {mark.points.map((p) => (
                            <Rect
                                key={crypto.randomUUID()} // might not work??  add id to type?
                                x={p.x - POINT_SIZE / 2}
                                y={p.y - POINT_SIZE / 2}
                                fill={"blue"}
                                width={POINT_SIZE}
                                height={POINT_SIZE}
                                draggable
                            />
                        ))}

                        <Line
                            points={mark.points.flatMap((p) => [p.x, p.y])}
                            fill="#FF000022"
                            stroke="white"
                            strokeWidth={1}
                            closed
                        />
                    </Group>
                );
            })}
        </Group>
    );
};

function MarkCanvas({ className = "" }: { className?: string; chldren?: ReactNode }) {
    // const [images, setImages] = useState<MarkImageType[]>([]);
    const images = useMarkStore((state) => state.images);
    const addImage = useMarkStore((state) => state.addImage);
    // const { images, addImage } = useMarkStore((state) => ({
    //     images: state.images,
    //     addImage: state.addImage,
    // }));

    return (
        <div className={`relative h-full ${className}`} id="tester">
            <Canvas>
                {Object.values(images).map((i) => {
                    return <MarkImageComponent key={i.id} imageData={i} />;
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

                        const imageSet: MarkImage[] = internalUrls.map((url) => ({
                            id: crypto.randomUUID(),
                            src: url,
                            position: { x: 0, y: 0 },
                            markIds: [],
                        }));

                        imageSet.map((i) => addImage(i));
                        // addImage()
                        // setImages((prev) => [...prev, ...imageSet]);
                    }}
                />
            </div>
        </div>
    );
}
export default MarkCanvas;
