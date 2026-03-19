import { useRef, useState } from "react";
import useImage from "use-image";
import { Image, Line, Group } from "react-konva";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { MarkImageType, Point2DType, useMarkStore } from "../stores/markStore";
import { Colors } from "../types/colors";
import MarkPoint from "./MarkPoint";
import Mark from "./Mark";

function MarkImageComponent({ imageData }: { imageData: MarkImageType }) {
    const updateImagePosition = useMarkStore((s) => s.updateImagePosition);
    const addMark = useMarkStore((s) => s.addMark);
    const marks = useMarkStore((s) => s.marks);

    const [image] = useImage(imageData.src);
    const [currentPoints, setCurrentPoints] = useState<Point2DType[]>([]);
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
                if (e.evt.button === 2) {
                    setCurrentPoints([]);
                }

                if (e.evt.button === 0 && e.evt.ctrlKey) {
                    addPoint(e);
                }
            }}
            onDragEnd={onDragEnd}
            draggable
        >
            <Image ref={imageRef} image={image} />

            {currentPoints.map((m, i) => (
                <Group key={i}>
                    <MarkPoint position={{ x: m.x, y: m.y }} offset={{ x: 0, y: 0 }} scale={{ x: 2.0, y: 2.0 }} />

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

            {imageData.markIds.map((id) => marks[id] && <Mark key={id} mark={marks[id]} />)}
        </Group>
    );
}

export default MarkImageComponent;
