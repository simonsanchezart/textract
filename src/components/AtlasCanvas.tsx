import { CanvasType } from "@/types/types";
import Canvas from "./Canvas";
import { AtlasImageType, useAtlasStore } from "@/stores/atlasStore";
import useImage from "use-image";
import { Group, Image } from "react-konva";

function AtlasImageComponent({ imageData }: { imageData: AtlasImageType }) {
    const [image] = useImage(imageData.base64);

    return (
        <Group
            id={imageData.id}
            name="master"
            x={imageData.position.x}
            y={imageData.position.y}
            rotation={imageData.rotation}
            scale={imageData.scale}
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
            >
                {Object.values(atlasImages).map((i) => {
                    return <AtlasImageComponent key={i.id} imageData={i} />;
                })}
            </Canvas>
        </div>
    );
}
export default AtlasCanvas;
