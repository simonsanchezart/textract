import { ReactNode } from "react";
import { CgAdd } from "react-icons/cg";
import { open, confirm } from "@tauri-apps/plugin-dialog";
import Canvas from "./Canvas";
import { convertFileSrc } from "@tauri-apps/api/core";
import { MarkImageType, useMarkStore } from "../stores/markStore";
import MarkImage from "./MarkImage";
import { CanvasType } from "@/types/types";

//todo: test every image format

function MarkCanvas({ className = "" }: { className?: string; chldren?: ReactNode }) {
    const images = useMarkStore((state) => state.images);
    const addImage = useMarkStore((state) => state.addImage);
    const removeImage = useMarkStore((state) => state.removeImage);

    return (
        <div className={`relative h-full ${className}`} id="tester">
            <Canvas
                onDelete={async (ids) => {
                    for (const id of ids) removeImage(id);
                }}
                type={CanvasType.MARK}
            >
                {Object.values(images).map((i) => {
                    return <MarkImage key={i.id} imageData={i} />;
                })}
            </Canvas>

            <div className="flex text-center items-center absolute bottom-0 left-0 bg-dark-main-darker p-2 rounded-tr-2xl gap-2">
                <CgAdd
                    className="size-6 button-icon"
                    onClick={async () => {
                        const selectedImages = await open({
                            title: "Select image/s to open",
                            multiple: true,
                            directory: false,
                            filters: [{ name: "Image Files", extensions: ["png", "jpg", "jpeg", "tiff", "bmp"] }],
                        });

                        if (!selectedImages) return;
                        const internalUrls = selectedImages.map((i) => convertFileSrc(i));

                        const imageSet: MarkImageType[] = internalUrls.map((url) => ({
                            id: crypto.randomUUID(),
                            src: url,
                            scale: { x: 1, y: 1 },
                            position: { x: 0, y: 0 },
                            rotation: 0,
                            markIds: [],
                        }));

                        imageSet.map((i) => addImage(i));
                    }}
                />
            </div>
        </div>
    );
}

export default MarkCanvas;
