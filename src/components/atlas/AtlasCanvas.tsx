import { CanvasType } from "@/types/types";
import Canvas from "../Canvas";
import { AtlasImageType, useAtlasStore } from "@/stores/atlasStore";
import useImage from "use-image";
import { Group, Image } from "react-konva";
import Konva from "konva";

function AtlasImageComponent({ imageData }: { imageData: AtlasImageType }) {
    const updateImagePosition = useAtlasStore((s) => s.updateImagePosition);
    const updateImageScale = useAtlasStore((s) => s.updateImageScale);
    const updateImageRotation = useAtlasStore((s) => s.updateImageRotation);
    const [image] = useImage(imageData.base64);

    const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
        if (e.target.name() !== "master") return;
        updateImagePosition(imageData.id, { x: e.currentTarget.attrs.x, y: e.currentTarget.attrs.y });
    };

    return (
        <Group
            id={imageData.id}
            name="master"
            x={imageData.position.x}
            y={imageData.position.y}
            rotation={imageData.rotation}
            scale={imageData.scale}
            onTransformEnd={(e) => {
                const attrs = e.currentTarget.attrs;
                const scale = { x: attrs.scaleX, y: attrs.scaleY };
                const pos = { x: attrs.x, y: attrs.y };
                const rotation = attrs.rotation;

                updateImageScale(imageData.id, scale);
                updateImageRotation(imageData.id, rotation);
                updateImagePosition(imageData.id, pos);
            }}
            onDragStart={(e) => {
                if (e.evt.buttons !== 1) {
                    e.target.stopDrag();
                    const stage = e.target.getStage();
                    if (stage && e.evt.buttons === 4) stage.startDrag();
                }
            }}
            onDragEnd={onDragEnd}
            draggable
        >
            <Image image={image} />
        </Group>
    );
}

function AtlasCanvas({ className }: { className?: string }) {
    const atlasImages = useAtlasStore((state) => state.images);
    const removeAtlasImage = useAtlasStore((state) => state.removeImage);

    return (
        <div className={`relative h-full ${className}`} id="tester">
            <Canvas
                onDelete={async (ids) => {
                    for (const id of ids) removeAtlasImage(id);
                }}
                type={CanvasType.ATLAS}
                transformerRatio={false}
            >
                {Object.values(atlasImages).map((i) => {
                    return <AtlasImageComponent key={i.id} imageData={i} />;
                })}
            </Canvas>
        </div>
    );
}
export default AtlasCanvas;
