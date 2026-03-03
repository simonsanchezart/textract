import { ReactNode } from "react";
import Canvas from "./Canvas";
import { Rect } from "react-konva";
import { CgAdd, CgClose, CgMaximizeAlt, CgMinimizeAlt } from "react-icons/cg";

function MarkCanvas({ className }: { className?: string; chldren?: ReactNode }) {
    return (
        <div className="relative">
            <Canvas className={className}></Canvas>
            {/* toolbar: */}
            <div className="flex text-center items-center absolute right-0 bg-dark-main-darker p-2 rounded-bl-2xl gap-2">
                <CgAdd className="size-6 button-icon" />
            </div>
        </div>
    );
}
export default MarkCanvas;
