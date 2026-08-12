import type { MarkType } from "@/stores/mark-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Group, Line } from "react-konva";
import { useCanvasStore } from "@/stores/canvas-store";
import { useMarkStore } from "@/stores/mark-store";
import { CanvasType, Colors } from "@/types/types";
import { cubicBezierPoint } from "@/utils/utils";
import MarkPoint from "./MarkPoint";

/**
 * How many interior grid lines to preview, purely visual (the real interior
 * is computed backend-side via a Coons patch at convert time -- this is a
 * lightweight client-side approximation using the same blend formula, just
 * to give the user a sense of the curve while shaping it).
 */
const PREVIEW_SAMPLES = 6;

/**
 * Combined point-index space for selection: corners are 0-3, handles are
 * 4-11 (handle = index - 4) -- lets Shift+Click multi-select and group-drag
 * span both kinds of point, matching the pattern used for quad/grid marks.
 */
function handleIndex(i: number) {
  return i + 4;
}

/**
 * Renders a bezier mark: 4 corners connected by 4 independent cubic-bezier
 * edges (2 handles each, not mirrored across a corner -- a corner can show a
 * visible kink if its two adjacent edges' handles aren't aligned, which is
 * intentional per how the user wants to shape real-world sharp corners).
 */
function BezierMark({ mark, scale = 1 }: { mark: MarkType; scale?: number }) {
  const [markOffset, setMarkOffset] = useState({ x: 0, y: 0 });
  const [corners, setCorners] = useState(mark.corners ?? []);
  const [handles, setHandles] = useState(mark.handles ?? []);
  const selectedPoints = useCanvasStore(s => s.transientCanvas[CanvasType.MARK].selectedPoints);
  const selectedIndices = useMemo(
    () => selectedPoints.filter(sp => sp.markId === mark.id).map(sp => sp.pointIndex),
    [selectedPoints, mark.id],
  );
  // Snapshot taken on drag-start, same pattern as Mark.tsx: lets a
  // multi-point drag apply one delta to every selected corner/handle, since
  // Konva only reports drag events for the node the pointer is actually on.
  const dragStartRef = useRef<{ corners: typeof corners; handles: typeof handles; origin: { x: number; y: number } } | null>(null);

  // Local copies mirror Mark.tsx's approach: needed for live drag feedback,
  // but must re-sync when the store changes externally (undo/redo) or this
  // component would keep rendering a stale pre-undo shape.
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setCorners(mark.corners ?? []);
  }, [mark.corners]);
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setHandles(mark.handles ?? []);
  }, [mark.handles]);

  const ready = corners.length === 4 && handles.length === 8;

  // Closed cubic-bezier path through all 4 edges: corner[0], then for each
  // edge i, (handle[2i], handle[2i+1], corner[(i+1)%4]) -- the 4th edge's
  // endpoint is corner[0] again, so the path is already closed without
  // needing Line's own `closed` prop to add a segment. `closed` is still set
  // below so Konva's fill/hit-region behaves the same as every other mark
  // type -- without it, right-click-to-convert couldn't find this mark under
  // the pointer, since Konva only hit-tests a Line's *fill* when it knows
  // the path is a closed region.
  const pathFlat = useMemo(() => {
    if (!ready)
      return [];
    const flat = [corners[0].x, corners[0].y];
    for (let i = 0; i < 4; i++) {
      const h1 = handles[2 * i];
      const h2 = handles[2 * i + 1];
      const end = corners[(i + 1) % 4];
      flat.push(h1.x, h1.y, h2.x, h2.y, end.x, end.y);
    }
    return flat;
  }, [ready, corners, handles]);

  // Dimmed interior preview grid, purely visual -- a lightweight client-side
  // Coons-patch approximation (bilinear blend of the 4 sampled boundary
  // curves) so the user gets a sense of the curve while shaping it, without
  // waiting for a convert. The real interior is computed backend-side with
  // proper arc-length-parameterized sampling; this preview intentionally
  // doesn't bother with arc-length since it's just a rough visual guide.
  const previewLines = useMemo(() => {
    if (!ready)
      return [];

    const edgePoint = (edge: number, t: number) =>
      cubicBezierPoint(corners[edge], handles[2 * edge], handles[2 * edge + 1], corners[(edge + 1) % 4], t);

    const n = PREVIEW_SAMPLES;
    const top = Array.from({ length: n }, (_, i) => edgePoint(0, i / (n - 1)));
    const bottomRtl = Array.from({ length: n }, (_, i) => edgePoint(2, i / (n - 1)));
    const bottom = [...bottomRtl].reverse();
    const right = Array.from({ length: n }, (_, i) => edgePoint(1, i / (n - 1)));
    const leftBtt = Array.from({ length: n }, (_, i) => edgePoint(3, i / (n - 1)));
    const left = [...leftBtt].reverse();

    const [p00, p10, p11, p01] = corners;

    const coons = (u: number, v: number) => {
      const t = top[Math.round(u * (n - 1))];
      const b = bottom[Math.round(u * (n - 1))];
      const l = left[Math.round(v * (n - 1))];
      const r = right[Math.round(v * (n - 1))];
      const blendX = (1 - v) * t.x + v * b.x + (1 - u) * l.x + u * r.x
        - ((1 - u) * (1 - v) * p00.x + u * (1 - v) * p10.x + (1 - u) * v * p01.x + u * v * p11.x);
      const blendY = (1 - v) * t.y + v * b.y + (1 - u) * l.y + u * r.y
        - ((1 - u) * (1 - v) * p00.y + u * (1 - v) * p10.y + (1 - u) * v * p01.y + u * v * p11.y);
      return { x: blendX, y: blendY };
    };

    const lines: number[][] = [];
    for (let i = 1; i < n - 1; i++) {
      const v = i / (n - 1);
      lines.push(Array.from({ length: n }, (_, j) => coons(j / (n - 1), v)).flatMap(p => [p.x, p.y]));
    }
    for (let j = 1; j < n - 1; j++) {
      const u = j / (n - 1);
      lines.push(Array.from({ length: n }, (_, i) => coons(u, i / (n - 1))).flatMap(p => [p.x, p.y]));
    }
    return lines;
  }, [ready, corners, handles]);

  if (!ready)
    return null;

  return (
    <Group draggable>
      <Line
        id={mark.id}
        points={pathFlat}
        bezier
        closed
        fill={`${Colors.GREEN}11`}
        stroke={mark.dirty ? Colors.RED : Colors.LIGHT}
        strokeWidth={4.0 * scale}
        shadowOffset={{ x: 0.5, y: 0.5 }}
        shadowOpacity={1}
        removeMark={() => useMarkStore.getState().removeMark(mark.id)}
        draggable
        onClick={(e) => {
          if (e.evt.altKey)
            useMarkStore.getState().removeMark(mark.id);
          else
            useCanvasStore.getState().clearSelectedPoints(CanvasType.MARK);
        }}
        onDragMove={(e) => {
          // Konva positions the dragged outline synchronously inside this
          // native mousemove handler and paints that same frame; a plain
          // setState here commits on a later task, so everything positioned
          // via `offset={markOffset}` -- the preview grid, guide lines,
          // handle/corner points -- would trail a frame behind. flushSync
          // keeps them in the same frame. Deliberate use, not the perf
          // footgun the lint rule usually warns about -- this IS the fix.
          // eslint-disable-next-line react-dom/no-flush-sync
          flushSync(() => {
            setMarkOffset({ x: e.target.x(), y: e.target.y() });
          });
        }}
        onDragEnd={(e) => {
          const dx = e.target.x();
          const dy = e.target.y();
          // Push the translation into local state in the same commit that
          // resets markOffset to 0 (same as Mark.tsx). The useEffect resync
          // from the store runs a commit later, so relying on it alone would
          // render one frame with offset 0 but pre-drag corners -- i.e. the
          // whole mark visibly snapping back before jumping to its new spot.
          setCorners(prev => prev.map(p => ({ x: p.x + dx, y: p.y + dy })));
          setHandles(prev => prev.map(p => ({ x: p.x + dx, y: p.y + dy })));
          useMarkStore.getState().translateBezierMark(mark.id, dx, dy);
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

      {previewLines.map((flat, idx) => (
        // eslint-disable-next-line react/no-array-index-key
        <Line key={idx} offset={{ x: -markOffset.x, y: -markOffset.y }} points={flat} stroke="white" opacity={0.35} strokeWidth={scale} listening={false} />
      ))}

      {/* Guide lines from each corner to its two adjacent (independent)
          handles -- brighter than the interior preview so the handles read
          as the thing you actually drag, not just more grid lines. */}
      {handles.map((h, idx) => {
        const edge = Math.floor(idx / 2);
        const cornerIdx = idx % 2 === 0 ? edge : (edge + 1) % 4;
        const corner = corners[cornerIdx];
        const selected = selectedIndices.includes(handleIndex(idx));
        return (
          <Line
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            offset={{ x: -markOffset.x, y: -markOffset.y }}
            points={[corner.x, corner.y, h.x, h.y]}
            stroke={selected ? Colors.BLUE : "white"}
            opacity={selected ? 0.9 : 0.6}
            strokeWidth={(selected ? 1.5 : 1) * scale}
            listening={false}
          />
        );
      })}

      {handles.map((h, idx) => {
        const combinedIdx = handleIndex(idx);
        const selected = selectedIndices.includes(combinedIdx);
        return (
          <MarkPoint
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            id={mark.id}
            position={h}
            offset={markOffset}
            selected={selected}
            scaleFactor={scale * 0.7}
            onMouseDown={(e) => {
              if (e.evt.shiftKey) {
                useCanvasStore.getState().togglePointSelection(CanvasType.MARK, mark.id, combinedIdx);
              }
              else if (!selectedIndices.includes(combinedIdx)) {
                useCanvasStore.getState().selectPoint(CanvasType.MARK, mark.id, combinedIdx);
              }
            }}
            onClick={(e) => {
              // Same Konva click-bubbling fix as Mark.tsx's points.
              e.cancelBubble = true;
            }}
            onDblClick={() => {
              // Same isolate-selection behavior as Mark.tsx's points, per
              // simonsanchezart's PR #20 review -- double-clicking a point
              // that's part of the current multi-selection deselects
              // everything else and keeps just that point.
              if (selectedIndices.includes(combinedIdx)) {
                useCanvasStore.getState().clearSelectedPoints(CanvasType.MARK);
                useCanvasStore.getState().selectPoint(CanvasType.MARK, mark.id, combinedIdx);
              }
            }}
            onDragStart={(e) => {
              dragStartRef.current = { corners, handles, origin: { x: e.target.x(), y: e.target.y() } };
            }}
            onDragMove={(e) => {
              // Same late-commit issue as the outline's onDragMove above:
              // without flushSync the OTHER selected points (which only
              // move because this re-render positions them -- Konva only
              // moves the node the pointer is actually on) render a frame
              // or more stale. Invisible on a single-point drag, since
              // there Konva is already moving the only node that needs to
              // move. Deliberate use, not the perf footgun the lint rule
              // usually warns about -- this IS the fix.
              // eslint-disable-next-line react-dom/no-flush-sync
              flushSync(() => {
                const isMultiDrag = selectedIndices.includes(combinedIdx) && selectedIndices.length > 1 && dragStartRef.current;
                if (isMultiDrag && dragStartRef.current) {
                  const dx = e.target.x() - dragStartRef.current.origin.x;
                  const dy = e.target.y() - dragStartRef.current.origin.y;
                  const start = dragStartRef.current.handles;
                  setHandles(start.map((p, i) => (selectedIndices.includes(handleIndex(i)) ? { x: p.x + dx, y: p.y + dy } : p)));
                  if (selectedIndices.some(i => i < 4) && dragStartRef.current) {
                    const startCorners = dragStartRef.current.corners;
                    setCorners(startCorners.map((p, i) => (selectedIndices.includes(i) ? { x: p.x + dx, y: p.y + dy } : p)));
                  }
                }
                else {
                  setHandles((prev) => {
                    const next = [...prev];
                    next[idx] = { x: e.target.x(), y: e.target.y() };
                    return next;
                  });
                }
              });
            }}
            onDragEnd={(e) => {
              const isMultiDrag = selectedIndices.includes(combinedIdx) && selectedIndices.length > 1 && dragStartRef.current;
              if (isMultiDrag && dragStartRef.current) {
                const dx = e.target.x() - dragStartRef.current.origin.x;
                const dy = e.target.y() - dragStartRef.current.origin.y;
                useMarkStore.getState().translateBezierPoints(mark.id, selectedIndices, dx, dy);
              }
              else {
                useMarkStore.getState().updateBezierHandle(mark.id, idx, { x: e.target.x(), y: e.target.y() });
              }
              dragStartRef.current = null;
            }}
          />
        );
      })}

      {corners.map((c, idx) => {
        const selected = selectedIndices.includes(idx);
        return (
          <MarkPoint
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            id={mark.id}
            position={c}
            offset={markOffset}
            selected={selected}
            scaleFactor={scale}
            onMouseDown={(e) => {
              if (e.evt.shiftKey) {
                useCanvasStore.getState().togglePointSelection(CanvasType.MARK, mark.id, idx);
              }
              else if (!selectedIndices.includes(idx)) {
                useCanvasStore.getState().selectPoint(CanvasType.MARK, mark.id, idx);
              }
            }}
            onClick={(e) => {
              e.cancelBubble = true;
            }}
            onDblClick={() => {
              // Same isolate-selection behavior as Mark.tsx's points, per
              // simonsanchezart's PR #20 review -- double-clicking a point
              // that's part of the current multi-selection deselects
              // everything else and keeps just that point.
              if (selectedIndices.includes(idx)) {
                useCanvasStore.getState().clearSelectedPoints(CanvasType.MARK);
                useCanvasStore.getState().selectPoint(CanvasType.MARK, mark.id, idx);
              }
            }}
            onDragStart={(e) => {
              dragStartRef.current = { corners, handles, origin: { x: e.target.x(), y: e.target.y() } };
            }}
            onDragMove={(e) => {
              // Same late-commit issue as the outline's onDragMove above:
              // without flushSync the OTHER selected points (which only
              // move because this re-render positions them -- Konva only
              // moves the node the pointer is actually on) render a frame
              // or more stale. Invisible on a single-point drag, since
              // there Konva is already moving the only node that needs to
              // move. Deliberate use, not the perf footgun the lint rule
              // usually warns about -- this IS the fix.
              // eslint-disable-next-line react-dom/no-flush-sync
              flushSync(() => {
                const isMultiDrag = selectedIndices.includes(idx) && selectedIndices.length > 1 && dragStartRef.current;
                if (isMultiDrag && dragStartRef.current) {
                  const dx = e.target.x() - dragStartRef.current.origin.x;
                  const dy = e.target.y() - dragStartRef.current.origin.y;
                  const startCorners = dragStartRef.current.corners;
                  const startHandles = dragStartRef.current.handles;
                  setCorners(startCorners.map((p, i) => (selectedIndices.includes(i) ? { x: p.x + dx, y: p.y + dy } : p)));
                  setHandles(startHandles.map((p, i) => (selectedIndices.includes(handleIndex(i)) ? { x: p.x + dx, y: p.y + dy } : p)));
                }
                else {
                  setCorners((prev) => {
                    const next = [...prev];
                    next[idx] = { x: e.target.x(), y: e.target.y() };
                    return next;
                  });
                }
              });
            }}
            onDragEnd={(e) => {
              const isMultiDrag = selectedIndices.includes(idx) && selectedIndices.length > 1 && dragStartRef.current;
              if (isMultiDrag && dragStartRef.current) {
                const dx = e.target.x() - dragStartRef.current.origin.x;
                const dy = e.target.y() - dragStartRef.current.origin.y;
                useMarkStore.getState().translateBezierPoints(mark.id, selectedIndices, dx, dy);
              }
              else {
                useMarkStore.getState().updateBezierCorner(mark.id, idx, { x: e.target.x(), y: e.target.y() });
              }
              dragStartRef.current = null;
            }}
          />
        );
      })}
    </Group>
  );
}

export default BezierMark;
