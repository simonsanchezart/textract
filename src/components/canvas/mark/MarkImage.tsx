import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { MarkImageType } from "@/stores/mark-store";
import type { Vec2 } from "@/types/types";
import { useMemo, useState } from "react";
import { Group, Image, Line } from "react-konva";
import useImage from "use-image";
import { useShallow } from "zustand/react/shallow";
import { useMarkStore } from "@/stores/mark-store";
import { useCanvasStore } from "@/stores/canvas-store";
import { useSettingsStore } from "@/stores/settings-store";
import { CanvasType, Colors } from "@/types/types";
import { getMiddle, isShortcutModifierPressed } from "@/utils/utils";
import Mark from "./Mark";
import MarkPoint from "./MarkPoint";

function MarkImageComponent({ imageData }: { imageData: MarkImageType }) {
  const marks = useMarkStore(useShallow(s => s.marks));
  const canvasZoom = useCanvasStore(s => s.canvas[CanvasType.MARK].scale);
  const markHandleScale = useSettingsStore(s => s.markHandleScale);

  const [image] = useImage(imageData.src);
  const [currentPoints, setCurrentPoints] = useState<Vec2[]>([]);
  const currentPointsFlat = useMemo(() => currentPoints.flatMap(p => [p.x, p.y]), [currentPoints]);

  // Handle/line size is intentionally independent of the image's own pixel
  // dimensions -- the previous formula (imageData.sizeSum * 0.0001) gave a
  // base factor of ~0.1-0.3 for typical photos, so even maxing out
  // markHandleScale (4x) only reached a still-tiny on-screen size. A fixed
  // base means the Handles setting has a real, visible effect regardless of
  // what photo is loaded. Dividing by canvasZoom keeps the on-screen size
  // constant as the user zooms the canvas.
  const scaleFactor = useMemo(
    () => markHandleScale / (canvasZoom || 1),
    [markHandleScale, canvasZoom],
  );

  const addPoint = (e: KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getRelativePointerPosition()!;

    const updated = [...currentPoints, { x: pos.x, y: pos.y }];
    if (updated.length === 4) {
      const center = getMiddle(updated);
      const sortedPoints = updated.sort((a, b) => {
        const angleA = Math.atan2(center.y - a.y, center.x - a.x);
        const angleB = Math.atan2(center.y - b.y, center.x - b.x);

        return angleA < angleB ? 1 : -1;
      });

      useMarkStore.getState().addMark(imageData.id, {
        id: crypto.randomUUID(),
        imageId: imageData.id,
        points: sortedPoints,
        dirty: true,
      });

      setCurrentPoints([]);
    }
    else {
      setCurrentPoints(updated);
    }
  };

  const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target.name() !== "master")
      return;
    useMarkStore.getState().updateImagePosition(imageData.id, { x: e.currentTarget.attrs.x, y: e.currentTarget.attrs.y });
  };

  return (
    <Group
      id={imageData.id}
      name="master"
      onTransformEnd={(e) => {
        const attrs = e.currentTarget.attrs;
        const scale = { x: attrs.scaleX, y: attrs.scaleY };
        const pos = { x: attrs.x, y: attrs.y };
        const rotation = attrs.rotation;

        useMarkStore.getState().updateImageScale(imageData.id, scale);
        useMarkStore.getState().updateImageRotation(imageData.id, rotation);
        useMarkStore.getState().updateImagePosition(imageData.id, pos);
      }}
      x={imageData.position.x}
      y={imageData.position.y}
      rotation={imageData.rotation}
      scale={imageData.scale}
      resetScale={() => useMarkStore.getState().updateImageScale(imageData.id, { x: 1.0, y: 1.0 })}
      onClick={(e) => {
        if (e.evt.button === 2)
          setCurrentPoints([]);
        if (e.evt.button === 0 && isShortcutModifierPressed(e.evt))
          addPoint(e);
        else if (e.evt.button === 0)
          useCanvasStore.getState().clearSelectedPoints(CanvasType.MARK);
      }}
      onDragStart={(e) => {
        if (e.evt.buttons !== 1) {
          e.target.stopDrag();
          const stage = e.target.getStage();
          if (stage && e.evt.buttons === 4)
            stage.startDrag();
        }
      }}
      onDragEnd={onDragEnd}
      draggable
    >
      <Image image={image} />

      {currentPoints.map((m, id) => (
        // eslint-disable-next-line react/no-array-index-key
        <Group key={id}>
          <MarkPoint
            position={{ x: m.x, y: m.y }}
            scaleFactor={scaleFactor}
            onDragMove={(e) => {
              setCurrentPoints((prev) => {
                const next = [...prev];
                next[id] = { x: e.target.x(), y: e.target.y() };
                return next;
              });
            }}
          />

          <Line
            points={currentPointsFlat}
            fill={`${Colors.GREEN}22`}
            stroke={Colors.LIGHT}
            strokeWidth={0.25}
            closed
            listening={false}
            dash={[2, 5]}
          />
        </Group>
      ))}

      {imageData.markIds.map(id => marks[id] && <Mark key={id} mark={marks[id]} scale={scaleFactor} />)}
    </Group>
  );
}

export default MarkImageComponent;
