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
import { Colors } from "../types/colors";

//todo: test every image format

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

    return (
        <Group draggable>
            <Line
                points={mark.points.flatMap((p) => [p.x, p.y])}
                fill={Colors.LIGHT + "22"}
                stroke={Colors.LIGHT}
                strokeWidth={1.0}
                shadowOffset={{ x: 0.5, y: 0.5 }}
                shadowOpacity={0.25}
                closed
                draggable
                onClick={(e) => {
                    if (e.evt.altKey) removeMark(mark.id);
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
                onPointerMove={(e) => {
                    if (e.evt.altKey) {
                        //xfunc: also cache?
                        new Konva.Tween({
                            node: e.target,
                            duration: 0.02,
                            fill: Colors.RED + "22",
                        }).play();
                    } else {
                        //xfunc: also cache?
                        new Konva.Tween({
                            node: e.target,
                            duration: 0.02,
                            fill: Colors.BLUE + "22",
                        }).play();
                    }
                }}
                onPointerLeave={(e) => {
                    //xfunc: also cache?
                    new Konva.Tween({
                        node: e.target,
                        duration: 0.02,
                        fill: Colors.LIGHT + "22",
                    }).play();
                }}
            />

            {mark.points.map((p, id) => {
                return (
                    <MarkPoint
                        key={id}
                        position={p}
                        offset={markOffset}
                        onDragMove={(e) => {
                            const newPoint = {
                                x: e.target.x(),
                                y: e.target.y(),
                            };
                            updateMarkPoint(mark.id, id, newPoint);
                        }}
                    />
                );
            })}
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
                    <MarkPoint position={{ x: m.x, y: m.y }} offset={{ x: 0, y: 0 }} />

                    <Line
                        points={currentPoints.flatMap((p) => [p.x, p.y])}
                        fill="#00FF0022"
                        stroke={Colors.LIGHT}
                        strokeWidth={1}
                        closed
                        listening={false}
                        dash={[2, 10]}
                    />
                </Group>
            ))}

            {imageData.markIds.map((id) => marks[id] && <MarkComponent key={id} mark={marks[id]} />)}
        </Group>
    );
};

type MarkPointProps = {
    position: Point2D;
    offset?: Point2D;
} & React.ComponentProps<typeof Rect>;

const MarkPoint = ({ position, offset = { x: 0, y: 0 }, ...props }: MarkPointProps) => {
    const POINT_SIZE = 2;
    const POINT_SIZE_H = POINT_SIZE / 2;

    return (
        <Rect
            x={position.x}
            y={position.y}
            strokeWidth={0.5}
            fill={"#282828"}
            stroke={Colors.LIGHT}
            shadowOffset={{ x: 0.25, y: 0.25 }}
            shadowOpacity={0.25}
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
                }).play();
            }}
            draggable
            {...props}
        />
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
