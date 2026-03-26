import { useState } from "react";
import { Line, Group } from "react-konva";
import Konva from "konva";
import { MarkType, useMarkStore } from "../stores/markStore";
import { Colors } from "../types/colors";
import MarkPoint from "./MarkPoint";

function Mark({ mark }: { mark: MarkType }) {
    const updateMark = useMarkStore((s) => s.updateMark);
    const updateMarkPoint = useMarkStore((s) => s.updateMarkPoint);
    const removeMark = useMarkStore((s) => s.removeMark);

    const [markOffset, setMarkOffset] = useState({ x: 0, y: 0 });
    const [points, setPoints] = useState(mark.points);

    return (
        <Group draggable>
            <Line
                points={points.flatMap((p) => [p.x, p.y])}
                fill={Colors.GREEN + "11"}
                stroke={Colors.LIGHT}
                strokeWidth={1.0}
                shadowOffset={{ x: 0.5, y: 0.5 }}
                shadowOpacity={1}
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
                        fill: Colors.GREEN + "11",
                    }).play();
                }}
            />

            {points.map((p, id) => {
                return (
                    <MarkPoint
                        key={id}
                        position={p}
                        offset={markOffset}
                        // onDragMove={(e) => {
                        //     setPoints((prev) => {
                        //         const next = [...prev];
                        //         next[id] = { x: e.target.x(), y: e.target.y() };
                        //         return next;
                        //     });
                        // }}
                        // onDragEnd={(e) => {
                        //     updateMarkPoint(mark.id, id, { x: e.target.x(), y: e.target.y() });
                        // }}
                    />
                );
            })}
        </Group>
    );
}

export default Mark;
