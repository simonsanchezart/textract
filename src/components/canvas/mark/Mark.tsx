import type { MarkType } from "@/stores/mark-store";
import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Group, Line } from "react-konva";
import { useCanvasStore } from "@/stores/canvas-store";
import { useMarkStore } from "@/stores/mark-store";
import { CanvasType, Colors } from "@/types/types";
import { lerpVec2 } from "@/utils/utils";
import MarkPoint from "./MarkPoint";

function Mark({ mark, scale = 1 }: { mark: MarkType; scale?: number }) {
  const [markOffset, setMarkOffset] = useState({ x: 0, y: 0 });
  const [points, setPoints] = useState(mark.points);
  const pointsFlat = useMemo(() => points.flatMap(p => [p.x, p.y]), [points]);
  const selectedPoints = useCanvasStore(s => s.transientCanvas[CanvasType.MARK].selectedPoints);
  const selectedIndices = useMemo(
    () => selectedPoints.filter(sp => sp.markId === mark.id).map(sp => sp.pointIndex),
    [selectedPoints, mark.id],
  );
  // Snapshot of `points` + the dragged point's own start position, taken on
  // drag-start. Needed so a multi-point drag (dragging one selected point
  // while others are also selected) can apply the same delta to every
  // selected point -- Konva only reports drag events for the node the
  // pointer is actually on, so the other selected points have to be moved
  // by re-deriving the offset from this snapshot, not their own events.
  const dragStartRef = useRef<{ points: typeof points; origin: { x: number; y: number } } | null>(null);

  const gridPoints = useMemo(() => {
    const gridLineY1 = { p1: lerpVec2(points[0], points[1], 0.33), p2: lerpVec2(points[3], points[2], 0.33) };
    const gridLineY2 = { p1: lerpVec2(points[0], points[1], 0.67), p2: lerpVec2(points[3], points[2], 0.67) };
    const gridLineX1 = { p1: lerpVec2(points[0], points[3], 0.33), p2: lerpVec2(points[1], points[2], 0.33) };
    const gridLineX2 = { p1: lerpVec2(points[0], points[3], 0.67), p2: lerpVec2(points[1], points[2], 0.67) };

    return { lines: [gridLineY1, gridLineY2, gridLineX1, gridLineX2] };
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
          if (e.evt.altKey)
            useMarkStore.getState().removeMark(mark.id);
          else
            useCanvasStore.getState().clearSelectedPoints(CanvasType.MARK);
        }}
        onDragMove={(e) => {
          // Konva positions the dragged node synchronously inside this
          // native mousemove handler and paints that same frame; a plain
          // setState here commits on a later task, so the points/lines
          // positioned via `offset={markOffset}` would trail a frame behind
          // the outline Konva is already dragging. flushSync keeps them in
          // the same frame. Deliberate use, not the perf footgun the lint
          // rule usually warns about -- this IS the fix.
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

      {points.map((p, id) => {
        const selected = selectedPoints.some(sp => sp.markId === mark.id && sp.pointIndex === id);
        return (
          <MarkPoint
            // eslint-disable-next-line react/no-array-index-key
            key={id}
            position={p}
            offset={markOffset}
            selected={selected}
            onMouseDown={(e) => {
              if (e.evt.shiftKey) {
                useCanvasStore.getState().togglePointSelection(CanvasType.MARK, mark.id, id);
              }
              else if (!selectedIndices.includes(id)) {
                // Only collapse to a single-point selection if this point
                // wasn't already part of the current multi-selection --
                // otherwise grabbing one of several selected points to drag
                // them together would wipe the rest of the selection before
                // the drag (onDragStart) even fires.
                useCanvasStore.getState().selectPoint(CanvasType.MARK, mark.id, id);
              }
            }}
            onClick={(e) => {
              // Konva clicks bubble, and this point sits inside MarkImage's
              // Group, whose onClick treats any plain left click as a
              // background click and calls clearSelectedPoints. Without this
              // the mousedown above selects the point and the very next
              // mouseup wipes it again -- unless the pointer happened to move
              // past Konva's 3px dragDistance, which suppresses the synthetic
              // click. That made selection look flaky rather than broken.
              e.cancelBubble = true;
            }}
            onDblClick={() => {
              // Deselects everything else and keeps just this point --
              // lets you drop out of a multi-selection back to one point
              // without first clicking empty space to clear it. Per
              // simonsanchezart's PR #20 review (confirmed, not a guess:
              // "it's not to multi-select, it's a way of deselecting all
              // currently selected points, and just selecting the one
              // that you double click, instead of having to first click
              // outside to select a single point again") -- NOT an add-
              // to-selection gesture, that's what Shift+Click is for.
              // Guarded on the point already being part of the current
              // selection, matching his exact suggested code: double-
              // clicking a point that ISN'T selected already just
              // behaves like a normal click (mousedown above already
              // handles that), no separate isolate step needed.
              if (selectedIndices.includes(id)) {
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
              // Same late-commit issue as the outline's onDragMove above:
              // without flushSync the OTHER selected points (which only
              // move because this re-render positions them -- Konva only
              // moves the node the pointer is actually on) render a frame
              // or more stale, visible as those points sitting at their
              // pre-drag spot for a moment before snapping to place on
              // release. Invisible on a single-point drag, since there
              // Konva is already moving the only node that needs to move.
              // Deliberate use, not the perf footgun the lint rule usually
              // warns about -- this IS the fix.
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
