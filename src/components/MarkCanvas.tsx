import { ReactNode } from "react";
import Canvas from "./Canvas";
import { CgAdd } from "react-icons/cg";

function MarkCanvas({ className = "" }: { className?: string; chldren?: ReactNode }) {
    return (
        <div className="relative h-full" id="tester">
            <Canvas className={`${className}`}></Canvas>
            <div className="flex text-center items-center absolute bottom-0 left-0 bg-dark-main-darker p-2 rounded-tr-2xl gap-2">
                <CgAdd className="size-6 button-icon" />
            </div>
        </div>
    );
}
export default MarkCanvas;
