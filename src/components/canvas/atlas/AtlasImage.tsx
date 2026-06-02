import type Konva from "konva";
import type { AtlasImageType } from "@/stores/atlas-store";
import { Group, Image } from "react-konva";
import useImage from "use-image";
import { useAtlasStore } from "@/stores/atlas-store";

function AtlasImageComponent({ imageData }: { imageData: AtlasImageType }) {
  const [image] = useImage(imageData.base64);

  const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target.name() !== "master")
      return;
    useAtlasStore.getState().updateImagePosition(imageData.id, { x: e.currentTarget.attrs.x, y: e.currentTarget.attrs.y });
  };

  return (
    <Group
      id={imageData.id}
      name="master"
      x={imageData.position.x}
      y={imageData.position.y}
      rotation={imageData.rotation}
      scale={imageData.scale}
      resetScale={() => useAtlasStore.getState().updateImageScale(imageData.id, { x: 1.0, y: 1.0 })}
      onTransformEnd={(e) => {
        const attrs = e.currentTarget.attrs;
        const scale = { x: attrs.scaleX, y: attrs.scaleY };
        const pos = { x: attrs.x, y: attrs.y };
        const rotation = attrs.rotation;

        useAtlasStore.getState().updateImageScale(imageData.id, scale);
        useAtlasStore.getState().updateImageRotation(imageData.id, rotation);
        useAtlasStore.getState().updateImagePosition(imageData.id, pos);
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
    </Group>
  );
}

export default AtlasImageComponent;
