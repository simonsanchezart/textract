import { ReactNode, RefObject, useEffect, useReducer, useRef, useState } from "react";
import { CgAdd } from "react-icons/cg";
import { open } from "@tauri-apps/plugin-dialog";
import Canvas from "./Canvas";
import { convertFileSrc } from "@tauri-apps/api/core";
import useImage from "use-image";
import { Stage, Layer, Rect, Image, Transformer, Circle, Line, KonvaNodeComponent, Group } from "react-konva";
import Konva from "konva";

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
    marks: MarkType[];
};

const MarkImageComponent = ({ imageData }: { imageData: MarkImageType }) => {
    const [image] = useImage(imageData.src);
    return (
        <Group
            draggable
            onDragStart={(e) => {
                if (e.evt.buttons != 1) {
                    e.target.stopDrag();
                }
            }}
        >
            <Image x={imageData.x} y={imageData.y} image={image} />

            {/* Draw Marks here */}
            <Rect x={0} y={0} fill={"red"} width={32} height={32} draggable/>
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
                        }));
                        setImages((prev) => [...prev, ...imageSet]);
                    }}
                />
            </div>
        </div>
    );
}
export default MarkCanvas;
