import { CanvasType } from "@/types/types";
import Canvas from "./Canvas";

function AtlasCanvas({ className }: { className?: string }) {
    return <Canvas className={className} type={CanvasType.ATLAS}></Canvas>;
}
export default AtlasCanvas;
