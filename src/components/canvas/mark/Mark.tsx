import type { MarkType } from "@/stores/mark-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Group, Line, Rect } from "react-konva";
import { useCanvasStore } from "@/stores/canvas-store";
import { useMarkStore } from "@/stores/mark-store";
import { CanvasType, Colors } from "@/types/types";
import { lerpVec2 } from "@/utils/utils";
import MarkPoint from "./MarkPoint";

function Mark({ mark, scale = 1 }: { mark: MarkType; scale?: number }) {
  const [markOffset, setMarkOffset] = useState({ x: 0, y: 0 });
  const [points, setPoints] = useState(mark.points);

  // local copy (needed for live drag feedback via onDragMove,
  // before a drag commits to the store on drag-end).
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setPoints(mark.points);
  }, [mark.points]);

  const pointsFlat = useMemo(() => points.flatMap(p => [p.x, p.y]), [points]);
  const selectedPoints = useCanvasStore(s => s.transientCanvas[CanvasType.MARK].selectedPoints);
  const selectedIndices = useMemo(
    () => selectedPoints.filter(sp => sp.markId === mark.id).map(sp => sp.pointIndex),
    [selectedPoints, mark.id],
  );

  // we calculate offset of other selected points from the dragged point offset
  const dragStartRef = useRef<{ points: typeof points; origin: { x: number; y: number } } | null>(null);

  const gridPoints = useMemo(() => {
    const gridLineY1 = { p1: lerpVec2(points[0], points[1], 0.33), p2: lerpVec2(points[3], points[2], 0.33) };
    const gridLineY2 = { p1: lerpVec2(points[0], points[1], 0.67), p2: lerpVec2(points[3], points[2], 0.67) };
    const gridLineX1 = { p1: lerpVec2(points[0], points[3], 0.33), p2: lerpVec2(points[1], points[2], 0.33) };
    const gridLineX2 = { p1: lerpVec2(points[0], points[3], 0.67), p2: lerpVec2(points[1], points[2], 0.67) };
    return { lines: [gridLineY1, gridLineY2, gridLineX1, gridLineX2] };
  }, [points]);

  const edgeHandles = useMemo(() => {
    const handleTop = { pos: lerpVec2(points[0], points[1], 0.5), points: [0, 1] };
    const handleRight = { pos: lerpVec2(points[1], points[2], 0.5), points: [1, 2] };
    const handleBottom = { pos: lerpVec2(points[2], points[3], 0.5), points: [2, 3] };
    const handleLeft = { pos: lerpVec2(points[3], points[0], 0.5), points: [3, 0] };
    return { handles: [handleTop, handleRight, handleBottom, handleLeft] };
  }, [points]);

  return (
    <Group draggable>
      <Line
        id={mark.id}
        points={pointsFlat}
        fill={`${Colors.GREEN}11`}
        stroke={mark.dirty ? Colors.RED : Colors.LIGHT}
        strokeWidth={4.0 * scale}
        shadowOffset={{ x: 0.5, y: 0.5 }}
        shadowOpacity={1}
        removeMark={() => useMarkStore.getState().removeMark(mark.id)}
        closed
        draggable
        onClick={(e) => {
          e.cancelBubble = !(e.evt.ctrlKey || e.evt.shiftKey);
          if (e.evt.altKey)
            useMarkStore.getState().removeMark(mark.id);
          else
            useCanvasStore.getState().clearSelectedPoints(CanvasType.MARK);
        }}
        onDragMove={(e) => {
          // flushSync forces React to update the DOM
          // avoids visual lag
          // eslint-disable-next-line react-dom/no-flush-sync
          flushSync(() => {
            setMarkOffset({ x: e.target.x(), y: e.target.y() });
          });
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

      {gridPoints.lines.map((line, idx) => (
        // eslint-disable-next-line react/no-array-index-key
        <Line key={idx} offset={{ x: -markOffset.x, y: -markOffset.y }} points={[line.p1.x, line.p1.y, line.p2.x, line.p2.y]} stroke="white" opacity={0.5} strokeWidth={scale} />
      ))}

      {edgeHandles.handles.map((handle, idx) => (
        // todo: extract into component
        <Rect
        // eslint-disable-next-line react/no-array-index-key
          key={idx}
          draggable
          offset={{ x: -markOffset.x, y: -markOffset.y }}
          width={12 * scale}
          height={12 * scale}
          x={handle.pos.x - 6 * scale}
          y={handle.pos.y - 6 * scale}
          fill={Colors.LIGHT}
          shadowOffset={{ x: 0.5, y: 0.5 }}
          shadowOpacity={1}
          cornerRadius={1}
          onPointerEnter={(e) => {
            e.target.to({
              duration: 0.05,
              fill: Colors.GREEN,
            });
          }}
          onPointerLeave={(e) => {
            e.target.to({
              duration: 0.05,
              fill: Colors.LIGHT,
            });
          }}
          onDragStart={(e) => {
            dragStartRef.current = {
              points,
              origin: { x: e.target.x(), y: e.target.y() },
            };
          }}
          onDragMove={(e) => {
            // todo: refactor, remove duplication
            // eslint-disable-next-line react-dom/no-flush-sync
            flushSync(() => {
              if (dragStartRef.current) {
                const dx = e.target.x() - dragStartRef.current.origin.x;
                const dy = e.target.y() - dragStartRef.current.origin.y;
                const start = dragStartRef.current.points;
                setPoints(start.map((p, idx) => (handle.points.includes(idx) ? { x: p.x + dx, y: p.y + dy } : p)));
              }
            });
          }}
          onDragEnd={(e) => {
            // todo: refactor, remove duplication
            if (dragStartRef.current) {
              const dx = e.target.x() - dragStartRef.current.origin.x;
              const dy = e.target.y() - dragStartRef.current.origin.y;
              const start = dragStartRef.current.points;
              const next = start.map((p, idx) => (handle.points.includes(idx) ? { x: p.x + dx, y: p.y + dy } : p));
              setPoints(next);
              useMarkStore.getState().updateMark(mark.id, next);
            }
            useMarkStore.getState().updateMarkDirty(mark.id, true);
            dragStartRef.current = null;
          }}
        />
      ))}

      {points.map((p, id) => {
        const selected = selectedPoints.some(sp => sp.markId === mark.id && sp.pointIndex === id);
        return (
          <MarkPoint
          // eslint-disable-next-line react/no-array-index-key
            key={id}
            id={mark.id}
            position={p}
            offset={markOffset}
            selected={selected}
            onClick={(e) => {
              // stop propagation to parents
              e.cancelBubble = true;
              if (e.evt.shiftKey) {
                useCanvasStore.getState().togglePointSelection(CanvasType.MARK, mark.id, id);
              }
              else {
                if (selectedIndices.includes(id))
                  useCanvasStore.getState().clearSelectedPoints(CanvasType.MARK);
                useCanvasStore.getState().selectPoint(CanvasType.MARK, mark.id, id);
              }
            }}
            onDragStart={(e) => {
              dragStartRef.current = {
                points,
                origin: { x: e.target.x(), y: e.target.y() },
              };
            }}
            onDragMove={(e) => {
              // eslint-disable-next-line react-dom/no-flush-sync
              flushSync(() => {
                const isMultiDrag = selectedIndices.includes(id) && selectedIndices.length > 1 && dragStartRef.current;
                if (isMultiDrag && dragStartRef.current) {
                  const dx = e.target.x() - dragStartRef.current.origin.x;
                  const dy = e.target.y() - dragStartRef.current.origin.y;
                  const start = dragStartRef.current.points;
                  setPoints(start.map((p, idx) => (selectedIndices.includes(idx) ? { x: p.x + dx, y: p.y + dy } : p)));
                }
                else {
                  setPoints((prev) => {
                    const next = [...prev];
                    next[id] = { x: e.target.x(), y: e.target.y() };
                    return next;
                  });
                }
              });
            }}
            onDragEnd={(e) => {
              const isMultiDrag = selectedIndices.includes(id) && selectedIndices.length > 1 && dragStartRef.current;
              if (isMultiDrag && dragStartRef.current) {
                const dx = e.target.x() - dragStartRef.current.origin.x;
                const dy = e.target.y() - dragStartRef.current.origin.y;
                const start = dragStartRef.current.points;
                const next = start.map((p, idx) => (selectedIndices.includes(idx) ? { x: p.x + dx, y: p.y + dy } : p));
                setPoints(next);
                useMarkStore.getState().updateMark(mark.id, next);
              }
              else {
                useMarkStore.getState().updateMarkPoint(mark.id, id, { x: e.target.x(), y: e.target.y() });
              }
              useMarkStore.getState().updateMarkDirty(mark.id, true);
              dragStartRef.current = null;
            }}
            scaleFactor={scale}
          />
        );
      })}
    </Group>
  );
}

export default Mark;
