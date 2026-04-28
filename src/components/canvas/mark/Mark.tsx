import type { MarkType } from "@/stores/mark-store";
import { useMemo, useState } from "react";
import { Group, Line } from "react-konva";
import { useMarkStore } from "@/stores/mark-store";
import { Colors } from "@/types/types";
import MarkPoint from "./MarkPoint";

function Mark({ mark }: { mark: MarkType }) {
  const updateMark = useMarkStore(s => s.updateMark);
  const updateMarkPoint = useMarkStore(s => s.updateMarkPoint);
  const removeMark = useMarkStore(s => s.removeMark);

  const [markOffset, setMarkOffset] = useState({ x: 0, y: 0 });
  const [points, setPoints] = useState(mark.points);
  const pointsFlat = useMemo(() => points.flatMap(p => [p.x, p.y]), [points]);

  return (
    <Group draggable>
      <Line
        points={pointsFlat}
        fill={`${Colors.GREEN}11`}
        stroke={Colors.LIGHT}
        strokeWidth={4.0}
        shadowOffset={{ x: 0.5, y: 0.5 }}
        shadowOpacity={1}
        closed
        draggable
        onClick={(e) => {
          if (e.evt.altKey)
            removeMark(mark.id);
        }}
        onDragMove={(e) => {
          setMarkOffset({ x: e.target.x(), y: e.target.y() });
        }}
        onDragEnd={(e) => {
          const dx = e.target.x();
          const dy = e.target.y();
          const newPoints = points.map(p => ({ x: p.x + dx, y: p.y + dy }));

          setPoints(newPoints);
          updateMark(mark.id, newPoints);
          e.target.setPosition({ x: 0, y: 0 });
          setMarkOffset({ x: 0, y: 0 });
        }}
        onPointerMove={(e) => {
          if (e.evt.altKey) {
            e.target.to({ fill: `${Colors.RED}22`, duration: 0.02 });
          }
          else {
            e.target.to({ fill: `${Colors.BLUE}22`, duration: 0.02 });
          }
        }}
        onPointerLeave={(e) => {
          e.target.to({ fill: `${Colors.GREEN}11`, duration: 0.02 });
        }}
      />

      {points.map((p, id) => {
        return (

          <MarkPoint
            // eslint-disable-next-line react/no-array-index-key
            key={id}
            position={p}
            offset={markOffset}
            onDragMove={(e) => {
              setPoints((prev) => {
                const next = [...prev];
                next[id] = { x: e.target.x(), y: e.target.y() };
                return next;
              });
            }}
            onDragEnd={(e) => {
              updateMarkPoint(mark.id, id, { x: e.target.x(), y: e.target.y() });
            }}
          />
        );
      })}
    </Group>
  );
}

export default Mark;
