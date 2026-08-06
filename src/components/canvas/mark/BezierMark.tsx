import type { MarkType } from "@/stores/mark-store";
import { useEffect, useMemo, useState } from "react";
import { Group, Line } from "react-konva";
import { useMarkStore } from "@/stores/mark-store";
import { Colors } from "@/types/types";
import MarkPoint from "./MarkPoint";

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

  // Closed cubic-bezier path through all 4 edges: corner[0], then for each
  // edge i, (handle[2i], handle[2i+1], corner[(i+1)%4]) -- the 4th edge's
  // endpoint is corner[0] again, so the path is already closed without
  // needing Line's own `closed` prop (which would add an extra straight
  // segment back to the start).
  const pathFlat = useMemo(() => {
    if (corners.length !== 4 || handles.length !== 8)
      return [];
    const flat = [corners[0].x, corners[0].y];
    for (let i = 0; i < 4; i++) {
      const h1 = handles[2 * i];
      const h2 = handles[2 * i + 1];
      const end = corners[(i + 1) % 4];
      flat.push(h1.x, h1.y, h2.x, h2.y, end.x, end.y);
    }
    return flat;
  }, [corners, handles]);

  if (corners.length !== 4 || handles.length !== 8)
    return null;

  return (
    <Group draggable>
      <Line
        id={mark.id}
        points={pathFlat}
        bezier
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
        }}
        onDragMove={(e) => {
          setMarkOffset({ x: e.target.x(), y: e.target.y() });
        }}
        onDragEnd={(e) => {
          const dx = e.target.x();
          const dy = e.target.y();
          useMarkStore.getState().translateBezierMark(mark.id, dx, dy);
          e.target.setPosition({ x: 0, y: 0 });
          setMarkOffset({ x: 0, y: 0 });
        }}
      />

      {/* Guide lines from each corner to its two adjacent (independent) handles. */}
      {handles.map((h, idx) => {
        const edge = Math.floor(idx / 2);
        const cornerIdx = idx % 2 === 0 ? edge : (edge + 1) % 4;
        const corner = corners[cornerIdx];
        return (
          <Line
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            offset={{ x: -markOffset.x, y: -markOffset.y }}
            points={[corner.x, corner.y, h.x, h.y]}
            stroke="white"
            opacity={0.4}
            strokeWidth={scale}
            listening={false}
          />
        );
      })}

      {handles.map((h, idx) => (
        <MarkPoint
          // eslint-disable-next-line react/no-array-index-key
          key={idx}
          position={h}
          offset={markOffset}
          scaleFactor={scale * 0.7}
          onDragMove={(e) => {
            setHandles((prev) => {
              const next = [...prev];
              next[idx] = { x: e.target.x(), y: e.target.y() };
              return next;
            });
          }}
          onDragEnd={(e) => {
            useMarkStore.getState().updateBezierHandle(mark.id, idx, { x: e.target.x(), y: e.target.y() });
          }}
        />
      ))}

      {corners.map((c, idx) => (
        <MarkPoint
          // eslint-disable-next-line react/no-array-index-key
          key={idx}
          position={c}
          offset={markOffset}
          scaleFactor={scale}
          onDragMove={(e) => {
            setCorners((prev) => {
              const next = [...prev];
              next[idx] = { x: e.target.x(), y: e.target.y() };
              return next;
            });
          }}
          onDragEnd={(e) => {
            useMarkStore.getState().updateBezierCorner(mark.id, idx, { x: e.target.x(), y: e.target.y() });
          }}
        />
      ))}
    </Group>
  );
}

export default BezierMark;
