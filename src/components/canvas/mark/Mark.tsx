import type { MarkType } from "@/stores/mark-store";
import { useEffect, useMemo, useState } from "react";
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

  // Each entry is a flattened [x,y,x,y,...] polyline. For grid marks these
  // walk every intermediate point (not just the two ends) so the preview
  // line actually follows the curve the user has dragged into shape rather
  // than showing a straight chord across it.
  const gridLines: number[][] = useMemo(() => {
    if (isGrid) {
      const lines: number[][] = [];
      for (let r = 0; r < rows; r++) {
        const row = points.slice(r * cols, r * cols + cols);
        lines.push(row.flatMap(p => [p.x, p.y]));
      }
      for (let c = 0; c < cols; c++) {
        const col = Array.from({ length: rows }, (_, r) => points[r * cols + c]);
        lines.push(col.flatMap(p => [p.x, p.y]));
      }
      return lines;
    }

    const gridLineY1 = [lerpVec2(points[0], points[1], 0.33), lerpVec2(points[3], points[2], 0.33)];
    const gridLineY2 = [lerpVec2(points[0], points[1], 0.67), lerpVec2(points[3], points[2], 0.67)];
    const gridLineX1 = [lerpVec2(points[0], points[3], 0.33), lerpVec2(points[1], points[2], 0.33)];
    const gridLineX2 = [lerpVec2(points[0], points[3], 0.67), lerpVec2(points[1], points[2], 0.67)];

    return [gridLineY1, gridLineY2, gridLineX1, gridLineX2].map(line => line.flatMap(p => [p.x, p.y]));
  }, [isGrid, points, rows, cols]);

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

      {gridLines.map((linePoints, idx) => (
        // eslint-disable-next-line react/no-array-index-key
        <Line key={idx} offset={{ x: -markOffset.x, y: -markOffset.y }} points={linePoints} stroke="white" opacity={0.5} strokeWidth={scale} listening={false} />
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
              if (e.evt.shiftKey)
                useCanvasStore.getState().togglePointSelection(CanvasType.MARK, mark.id, id);
              else
                useCanvasStore.getState().selectPoint(CanvasType.MARK, mark.id, id);
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
            scaleFactor={scale}
          />
        );
      })}
    </Group>
  );
}

export default Mark;
