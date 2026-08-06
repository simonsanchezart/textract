import type { MarkType } from "@/stores/mark-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Line } from "react-konva";
import { useCanvasStore } from "@/stores/canvas-store";
import { useMarkStore } from "@/stores/mark-store";
import { CanvasType, Colors } from "@/types/types";
import { lerpVec2 } from "@/utils/utils";
import MarkPoint from "./MarkPoint";

function Mark({ mark, scale = 1 }: { mark: MarkType; scale?: number }) {
  const [markOffset, setMarkOffset] = useState({ x: 0, y: 0 });
  const [points, setPoints] = useState(mark.points);
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

  // points is a local copy (needed for live drag feedback via onDragMove,
  // before a drag commits to the store on drag-end). It only ever gets
  // seeded from mark.points once at mount, so an external change to the
  // store's points -- undo/redo being the main case -- was never reflected:
  // the store reverted correctly, but this component kept rendering the
  // stale local copy. Re-sync whenever the prop actually changes.
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setPoints(mark.points);
  }, [mark.points]);
  const isGrid = mark.markType === "grid" && !!mark.gridDims;
  const { rows, cols } = mark.gridDims ?? { rows: 0, cols: 0 };

  // A grid mark's points are row-major, so a single closed Line through them
  // in that order would zigzag — walk the perimeter (top row, right column,
  // bottom row reversed, left column reversed) for the outline shape instead.
  const outlinePoints = useMemo(() => {
    if (!isGrid)
      return points;

    const at = (r: number, c: number) => points[r * cols + c];
    const perimeter: typeof points = [];
    for (let c = 0; c < cols; c++) perimeter.push(at(0, c));
    for (let r = 1; r < rows; r++) perimeter.push(at(r, cols - 1));
    for (let c = cols - 2; c >= 0; c--) perimeter.push(at(rows - 1, c));
    for (let r = rows - 2; r >= 1; r--) perimeter.push(at(r, 0));
    return perimeter;
  }, [isGrid, points, rows, cols]);

  const pointsFlat = useMemo(() => outlinePoints.flatMap(p => [p.x, p.y]), [outlinePoints]);

  // Each entry is a flattened [x,y,x,y,...] polyline, plus a Konva `tension`
  // value. For grid marks these walk every intermediate point (not just the
  // two ends) so the preview line actually follows the curve the user has
  // dragged into shape rather than showing a straight chord across it.
  //
  // Curve-mode preview: a row/column renders with Konva's native curve
  // smoothing only when EVERY point along it is marked smooth -- this is a
  // simplification for visual feedback only (the real per-cell smooth/sharp
  // decision happens backend-side at convert time, see mesh.rs); a row with
  // even one sharp corner just renders as the same straight polyline as
  // before curve mode existed. Konva's tension is the inverse of ours (0 =
  // straight, higher = curvier), and its scale is unrelated to our 0-1
  // range, so it's remapped rather than passed through directly.
  const gridLines: { flat: number[]; tension: number }[] = useMemo(() => {
    const isSmooth = (idx: number) => mark.pointMeta?.[idx]?.smooth ?? false;
    const avgTension = (indices: number[]) => {
      const values = indices.map(i => mark.pointMeta?.[i]?.tension ?? 0.5);
      return values.reduce((a, b) => a + b, 0) / values.length;
    };
    const toLine = (linePoints: typeof points, indices: number[]) => {
      const allSmooth = indices.every(isSmooth);
      return {
        flat: linePoints.flatMap(p => [p.x, p.y]),
        tension: allSmooth ? 0.5 * (1 - avgTension(indices)) : 0,
      };
    };

    if (isGrid) {
      const lines: { flat: number[]; tension: number }[] = [];
      for (let r = 0; r < rows; r++) {
        const indices = Array.from({ length: cols }, (_, c) => r * cols + c);
        lines.push(toLine(points.slice(r * cols, r * cols + cols), indices));
      }
      for (let c = 0; c < cols; c++) {
        const indices = Array.from({ length: rows }, (_, r) => r * cols + c);
        lines.push(toLine(indices.map(i => points[i]), indices));
      }
      return lines;
    }

    const gridLineY1 = [lerpVec2(points[0], points[1], 0.33), lerpVec2(points[3], points[2], 0.33)];
    const gridLineY2 = [lerpVec2(points[0], points[1], 0.67), lerpVec2(points[3], points[2], 0.67)];
    const gridLineX1 = [lerpVec2(points[0], points[3], 0.33), lerpVec2(points[1], points[2], 0.33)];
    const gridLineX2 = [lerpVec2(points[0], points[3], 0.67), lerpVec2(points[1], points[2], 0.67)];

    return [gridLineY1, gridLineY2, gridLineX1, gridLineX2].map(line => ({ flat: line.flatMap(p => [p.x, p.y]), tension: 0 }));
  }, [isGrid, points, rows, cols, mark.pointMeta]);

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

      {gridLines.map((line, idx) => (
        // eslint-disable-next-line react/no-array-index-key
        <Line key={idx} offset={{ x: -markOffset.x, y: -markOffset.y }} points={line.flat} tension={line.tension} stroke="white" opacity={0.5} strokeWidth={scale} listening={false} />
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
            onDragStart={(e) => {
              dragStartRef.current = {
                points,
                origin: { x: e.target.x(), y: e.target.y() },
              };
            }}
            onDragMove={(e) => {
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
            }}
            onDragEnd={(e) => {
              const isMultiDrag = selectedIndices.includes(id) && selectedIndices.length > 1 && dragStartRef.current;
              if (isMultiDrag && dragStartRef.current) {
                const dx = e.target.x() - dragStartRef.current.origin.x;
                const dy = e.target.y() - dragStartRef.current.origin.y;
                const start = dragStartRef.current.points;
                selectedIndices.forEach((idx) => {
                  const p = start[idx];
                  useMarkStore.getState().updateMarkPoint(mark.id, idx, { x: p.x + dx, y: p.y + dy });
                });
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
