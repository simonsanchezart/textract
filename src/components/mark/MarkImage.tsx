import { useMemo, useState } from "react";
import useImage from "use-image";
import { Image, Line, Group } from "react-konva";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { MarkImageType, useMarkStore } from "../../stores/markStore";
import MarkPoint from "./MarkPoint";
import Mark from "./Mark";
import { getMiddle } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { Vec2, Colors } from "@/types/types";

function MarkImageComponent({ imageData }: { imageData: MarkImageType }) {
    const updateImagePosition = useMarkStore((s) => s.updateImagePosition);
    const updateImageScale = useMarkStore((s) => s.updateImageScale);
    const updateImageRotation = useMarkStore((s) => s.updateImageRotation);
    const addMark = useMarkStore((s) => s.addMark);
    const marks = useMarkStore(useShallow((s) => s.marks));

    const [image] = useImage(imageData.src);
    const [currentPoints, setCurrentPoints] = useState<Vec2[]>([]);
    const currentPointsFlat = useMemo(() => currentPoints.flatMap((p) => [p.x, p.y]), [currentPoints]);

    const addPoint = (e: KonvaEventObject<MouseEvent>) => {
        const pos = e.target.getRelativePointerPosition()!;

        const updated = [...currentPoints, { x: pos.x, y: pos.y }];
        if (updated.length === 4) {
            const center = getMiddle(updated);
            const sortedPoints = updated.sort((a, b) => {
                const angleA = Math.atan2(center.y - a.y, center.x - a.x);
                const angleB = Math.atan2(center.y - b.y, center.x - b.x);

                return angleA < angleB ? 1 : -1;
            });

            addMark(imageData.id, {
                id: crypto.randomUUID(),
                imageId: imageData.id,
                points: sortedPoints,
            });

            setCurrentPoints([]);
        } else {
            setCurrentPoints(updated);
        }
    };

    const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
        if (e.target.name() !== "master") return;
        updateImagePosition(imageData.id, { x: e.currentTarget.attrs.x, y: e.currentTarget.attrs.y });
    };

    return (
        <Group
            id={imageData.id}
            name="master"
            onTransformEnd={(e) => {
                const attrs = e.currentTarget.attrs;
                const scale = { x: attrs.scaleX, y: attrs.scaleY };
                const pos = { x: attrs.x, y: attrs.y };
                const rotation = attrs.rotation;

                updateImageScale(imageData.id, scale);
                updateImageRotation(imageData.id, rotation);
                updateImagePosition(imageData.id, pos);
            }}
            x={imageData.position.x}
            y={imageData.position.y}
            rotation={imageData.rotation}
            scale={imageData.scale}
            onClick={(e) => {
                if (e.evt.button === 2) setCurrentPoints([]);
                if (e.evt.button === 0 && e.evt.ctrlKey) addPoint(e);
            }}
            onDragStart={(e) => {
                if (e.evt.buttons !== 1) {
                    e.target.stopDrag();
                    const stage = e.target.getStage();
                    if (stage && e.evt.buttons === 4) stage.startDrag();
                }
            }}
            onDragEnd={onDragEnd}
            draggable
        >
            <Image image={image} />

            {currentPoints.map((m, i) => (
                <Group key={i}>
                    <MarkPoint
                        position={{ x: m.x, y: m.y }}
                        onDragMove={(e) => {
                            setCurrentPoints((prev) => {
                                const next = [...prev];
                                next[i] = { x: e.target.x(), y: e.target.y() };
                                return next;
                            });
                        }}
                    />

                    <Line
                        points={currentPointsFlat}
                        fill={Colors.GREEN + "22"}
                        stroke={Colors.LIGHT}
                        strokeWidth={1}
                        closed
                        listening={false}
                        dash={[2, 10]}
                    />
                </Group>
            ))}

            {imageData.markIds.map((id) => marks[id] && <Mark key={id} mark={marks[id]} />)}
        </Group>
    );
}

export default MarkImageComponent;
