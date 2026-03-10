import { ReactNode, useRef, useState } from "react";
import { CgAdd } from "react-icons/cg";
import { open } from "@tauri-apps/plugin-dialog";
import Canvas from "./Canvas";
import { convertFileSrc } from "@tauri-apps/api/core";
import useImage from "use-image";
import { Rect, Image, Line, Group } from "react-konva";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Mark, MarkImage, Point2D, useMarkStore } from "../stores/markStore";

//todo: test every image format

//xconst: to internal config store
const POINT_SIZE = 2;
//xconst: to internal config store
const POINT_SIZE_H = POINT_SIZE / 2;

const getMiddle = (v2: Point2D[]) => {
    const average = v2.reduce((a, b) => {
        return { x: a.x + b.x, y: a.y + b.y };
    });

    average.x /= v2.length;
    average.y /= v2.length;
    return average;
};

const MarkComponent = ({ mark }: { mark: Mark }) => {
    const updateMark = useMarkStore((s) => s.updateMark);
    const updateMarkPoint = useMarkStore((s) => s.updateMarkPoint);
    const removeMark = useMarkStore((s) => s.removeMark);
    const [markOffset, setMarkOffset] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Group draggable>
            <Line
                points={mark.points.flatMap((p) => [p.x, p.y])}
                fill={isHovered ? "#FF000022" : "#FFFFFF22"}
                stroke="white"
                strokeWidth={0.5}
                shadowOffset={{ x: 0.5, y: 0.5 }}
                shadowOpacity={0.25}
                closed
                draggable
                onClick={(e) => {
                    removeMark(mark.id);
                }}
                onDragMove={(e) => {
                    setMarkOffset({ x: e.target.x(), y: e.target.y() });
                }}
                onDragEnd={(e) => {
                    const dx = e.target.x();
                    const dy = e.target.y();
                    const newPoints = mark.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));

                    updateMark(mark.id, newPoints);
                    e.target.setPosition({ x: 0, y: 0 });
                    setMarkOffset({ x: 0, y: 0 });
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            />

            <Rect offset={{ x: POINT_SIZE_H, y: POINT_SIZE_H }} fill={"green"} width={POINT_SIZE} height={POINT_SIZE} />

            {/* xfunc: extract point drawing */}
            {mark.points.map((p, i) => (
                <Rect
                    key={i}
                    x={p.x}
                    y={p.y}
                    strokeWidth={0.5}
                    fill={"#282828"}
                    stroke={"white"}
                    shadowOffset={{ x: 0.25, y: 0.25 }}
                    shadowOpacity={0.25}
                    cornerRadius={100}
                    width={POINT_SIZE}
                    height={POINT_SIZE}
                    offset={{ x: POINT_SIZE_H - markOffset.x, y: POINT_SIZE_H - markOffset.y }}
                    draggable
                    onDragMove={(e) => {
                        //todo: updating the actual point position should only be done on drag end
                        // meanwhile this should just set an offset to display
                        const newPoint = {
                            x: e.target.x(),
                            y: e.target.y(),
                        };
                        updateMarkPoint(mark.id, i, newPoint);
                    }}
                />
            ))}
        </Group>
    );
};

//xfunc: to own file
const MarkImageComponent = ({ imageData }: { imageData: MarkImage }) => {
    const updateImagePosition = useMarkStore((s) => s.updateImagePosition);
    const addMark = useMarkStore((s) => s.addMark);
    const marks = useMarkStore((s) => s.marks);

    const [image] = useImage(imageData.src);
    const [currentPoints, setCurrentPoints] = useState<Point2D[]>([]);
    const imageRef = useRef<Konva.Image | null>(null);

    // allow for cancelling
    // disable dragging, etc... while drawings

    const addPoint = (e: KonvaEventObject<MouseEvent>) => {
        const pos = e.target.getRelativePointerPosition()!;

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
    };

    const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
        if (e.target.name() !== "master") return;
        updateImagePosition(imageData.id, { x: e.target.attrs.x, y: e.target.attrs.y });
    };

    return (
        // todo: Save transform state
        <Group
            name="master"
            x={imageData.position.x}
            y={imageData.position.y}
            onClick={(e) => {
                if (e.evt.ctrlKey) addPoint(e);
            }}
            onDragEnd={onDragEnd}
            draggable
        >
            <Image ref={imageRef} image={image} />

            {currentPoints.map((m, i) => (
                <Group key={i}>
                    <Rect
                        x={m.x - POINT_SIZE_H}
                        y={m.y - POINT_SIZE_H}
                        fill={"red"}
                        width={POINT_SIZE}
                        height={POINT_SIZE}
                        listening={false}
                    />

                    <Line
                        points={currentPoints.flatMap((p) => [p.x, p.y])}
                        fill="#FF000022"
                        stroke="white"
                        strokeWidth={1}
                        closed
                        listening={false}
                    />
                </Group>
            ))}

            {imageData.markIds.map((id) => marks[id] && <MarkComponent key={id} mark={marks[id]} />)}
        </Group>
    );
};

function MarkCanvas({ className = "" }: { className?: string; chldren?: ReactNode }) {
    const images = useMarkStore((state) => state.images);
    const addImage = useMarkStore((state) => state.addImage);

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
                    }}
                />
            </div>
        </div>
    );
}
export default MarkCanvas;
