import { CanvasType } from "@/types/types";
import Canvas from "../Canvas";
import { useAtlasStore } from "@/stores/atlasStore";
import AtlasImageComponent from "./AtlasImageComponent";

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
