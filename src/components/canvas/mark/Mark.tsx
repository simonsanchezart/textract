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
  // smoothing whenever AT LEAST ONE point along it is marked smooth (using
  // the average tension of just the smooth points) -- previously this
  // required EVERY point on the line to be smooth, including both corners,
  // which made it effectively impossible to smooth an interior stretch while
  // leaving the mark's actual corners sharp. This is still a simplification
  // for visual feedback only (the real per-cell smooth/sharp decision, which
  // does properly fade to straight right at a sharp point, happens
  // backend-side at convert time -- see mesh.rs); this preview curves the
  // whole line uniformly rather than fading near an unmarked point. Corner
  // POSITIONS are unaffected either way -- Catmull-Rom curves pass exactly
  // through every given point, tension only bends the path between them.
  // Konva's tension is the inverse of ours (0 = straight, higher = curvier),
  // and its scale is unrelated to our 0-1 range, so it's remapped rather
  // than passed through directly.
  //
  // `boundary` (the outermost row/col/col/row, i.e. the mark's own outline)
  // is kept separate from `interior` so the visible outline itself can be
  // rendered with this same curve, instead of always being a straight
  // perimeter regardless of smoothing -- see the boundary-styled overlay
  // Lines below, which sit on top of (and are visually identical to, when
  // nothing is smoothed) the straight hit-testing/fill outline.
  const gridLines: { interior: { flat: number[]; tension: number }[]; boundary: { flat: number[]; tension: number }[] } = useMemo(() => {
    const isSmooth = (idx: number) => mark.pointMeta?.[idx]?.smooth ?? false;
    const avgTension = (indices: number[]) => {
      const values = indices.map(i => mark.pointMeta?.[i]?.tension ?? 0.5);
      return values.reduce((a, b) => a + b, 0) / values.length;
    };
    const toLine = (linePoints: typeof points, indices: number[]) => {
      const smoothIndices = indices.filter(isSmooth);
      return {
        flat: linePoints.flatMap(p => [p.x, p.y]),
        tension: smoothIndices.length > 0 ? 0.5 * (1 - avgTension(smoothIndices)) : 0,
      };
    };

    if (isGrid) {
      const rowLines = Array.from({ length: rows }, (_, r) => {
        const indices = Array.from({ length: cols }, (_, c) => r * cols + c);
        return toLine(points.slice(r * cols, r * cols + cols), indices);
      });
      const colLines = Array.from({ length: cols }, (_, c) => {
        const indices = Array.from({ length: rows }, (_, r) => r * cols + c);
        return toLine(indices.map(i => points[i]), indices);
      });
      return {
        boundary: [rowLines[0], rowLines[rows - 1], colLines[0], colLines[cols - 1]],
        interior: [...rowLines.slice(1, rows - 1), ...colLines.slice(1, cols - 1)],
      };
    }

    const gridLineY1 = [lerpVec2(points[0], points[1], 0.33), lerpVec2(points[3], points[2], 0.33)];
    const gridLineY2 = [lerpVec2(points[0], points[1], 0.67), lerpVec2(points[3], points[2], 0.67)];
    const gridLineX1 = [lerpVec2(points[0], points[3], 0.33), lerpVec2(points[1], points[2], 0.33)];
    const gridLineX2 = [lerpVec2(points[0], points[3], 0.67), lerpVec2(points[1], points[2], 0.67)];

    return {
      boundary: [],
      interior: [gridLineY1, gridLineY2, gridLineX1, gridLineX2].map(line => ({ flat: line.flatMap(p => [p.x, p.y]), tension: 0 })),
    };
  }, [isGrid, points, rows, cols, mark.pointMeta]);

  return (
    <Group draggable>
      <Line
        id={mark.id}
        points={pointsFlat}
        fill={`${Colors.GREEN}11`}
        // For grid marks the 4 boundary-styled Lines below (which curve
        // per-edge, unlike this one) are the actual visible outline --
        // this stroke is kept transparent (not removed) purely so hit-
        // testing/dragging/the removeMark attr keep working exactly as
        // before; drawing both would double up whenever a boundary edge
        // is curved (the curved overlay visibly diverges from this
        // underlying straight one). Quad marks have no such overlay, so
        // this stays the real visible outline for them, same as always.
        stroke={isGrid ? "transparent" : (mark.dirty ? Colors.RED : Colors.LIGHT)}
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

      {/*
        This IS the visible outline for grid marks -- the underlying Line
        above has a transparent stroke (kept only for hit-testing/drag),
        so there's exactly one visible line per edge, never two. Blue
        specifically for a curved edge (overriding the usual dirty/clean
        red/cream) so it's obvious at a glance which edges are actually
        smoothed, distinct from the interior mesh's white guide lines.
      */}
      {gridLines.boundary.map((line, idx) => (
        // eslint-disable-next-line react/no-array-index-key
        <Line key={`boundary-${idx}`} offset={{ x: -markOffset.x, y: -markOffset.y }} points={line.flat} tension={line.tension} stroke={line.tension > 0 ? Colors.BLUE : (mark.dirty ? Colors.RED : Colors.LIGHT)} strokeWidth={4.0 * scale} listening={false} />
      ))}

      {gridLines.interior.map((line, idx) => (
        // eslint-disable-next-line react/no-array-index-key
        <Line key={`interior-${idx}`} offset={{ x: -markOffset.x, y: -markOffset.y }} points={line.flat} tension={line.tension} stroke="white" opacity={0.5} strokeWidth={scale} listening={false} />
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
