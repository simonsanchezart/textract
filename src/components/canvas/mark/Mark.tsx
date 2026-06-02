import type { MarkType } from "@/stores/mark-store";
import { useMemo, useState } from "react";
import { Group, Line } from "react-konva";
import { useMarkStore } from "@/stores/mark-store";
import { Colors } from "@/types/types";
import MarkPoint from "./MarkPoint";

function Mark({ mark }: { mark: MarkType }) {
  const [markOffset, setMarkOffset] = useState({ x: 0, y: 0 });
  const [points, setPoints] = useState(mark.points);
  const pointsFlat = useMemo(() => points.flatMap(p => [p.x, p.y]), [points]);

  return (
    <Group draggable>
      <Line
        id={mark.id}
        points={pointsFlat}
        fill={`${Colors.GREEN}11`}
        stroke={mark.dirty ? Colors.RED : Colors.LIGHT}
        strokeWidth={4.0}
        shadowOffset={{ x: 0.5, y: 0.5 }}
        shadowOpacity={1}
        removeMark={() => useMarkStore.getState().removeMark(mark.id)}
        closed
        draggable
        onClick={(e) => {
          if (e.evt.altKey)
            useMarkStore.getState().removeMark(mark.id);
        }}
        onDragMove={(e) => {
          setMarkOffset({ x: e.target.x(), y: e.target.y() });
        }}
        onDragEnd={(e) => {
          const dx = e.target.x();
          const dy = e.target.y();
          const newPoints = points.map(p => ({ x: p.x + dx, y: p.y + dy }));

          setPoints(newPoints);
          useMarkStore.getState().updateMark(mark.id, newPoints);
          e.target.setPosition({ x: 0, y: 0 });
          setMarkOffset({ x: 0, y: 0 });
          useMarkStore.getState().updateMarkDirty(mark.id, true);
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
              useMarkStore.getState().updateMarkPoint(mark.id, id, { x: e.target.x(), y: e.target.y() });
              useMarkStore.getState().updateMarkDirty(mark.id, true);
            }}
          />
        );
      })}
    </Group>
  );
}

export default Mark;
