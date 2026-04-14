import { ReactNode } from "react";
import { CgAdd } from "react-icons/cg";
import { FaPlay } from "react-icons/fa";
import { open } from "@tauri-apps/plugin-dialog";
import Canvas from "../Canvas";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { MarkImageType, useMarkStore } from "../../stores/markStore";
import MarkImage from "./MarkImage";
import { CanvasType } from "@/types/types";
import { useShallow } from "zustand/react/shallow";
import { AtlasImageType, useAtlasStore } from "@/stores/atlasStore";

//todo: test every image format

function MarkCanvas({ className = "" }: { className?: string; chldren?: ReactNode }) {
    const marks = useMarkStore(useShallow((state) => state.marks));
    const markImages = useMarkStore((state) => state.images);
    const addMarkImage = useMarkStore((state) => state.addImage);
    const removeMarkImage = useMarkStore((state) => state.removeImage);
    const addAtlasImage = useAtlasStore((state) => state.addImage);

    return (
        <div className={`relative h-full ${className}`}>
            <Canvas
                onDelete={async (ids) => {
                    for (const id of ids) removeMarkImage(id);
                }}
                canvasType={CanvasType.MARK}
            >
                {Object.values(markImages).map((i) => {
                    return <MarkImage key={i.id} imageData={i} />;
                })}
            </Canvas>

            {/* refactor: extract into reusable 'toolbar' element */}
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

                        for (const img of selectedImages) {
                            const assetUrl = convertFileSrc(img);
                            //research: check how to create some sort of default constructor for this
                            const markImage: MarkImageType = {
                                id: crypto.randomUUID(),
                                filepath: img,
                                src: assetUrl,
                                position: { x: 0, y: 0 },
                                rotation: 0,
                                scale: { x: 1, y: 1 },
                                markIds: [],
                            };

                            addMarkImage(markImage);
                        }
                    }}
                />

                <FaPlay
                    className="size-4 button-icon"
                    onClick={async () => {
                        await Promise.all(
                            Object.values(markImages).map(async (i) => {
                                const markIds = i.markIds;
                                const markPoints = markIds.flatMap((id) =>
                                    marks[id].points.flatMap((p) => [Math.round(p.x), Math.round(p.y)])
                                );

                                const results: string[] = await invoke("transform_image", {
                                    imgPath: i.filepath,
                                    points: markPoints,
                                });

                                for (const [i, img] of results.entries()) {
                                    //research: check how to create some sort of default constructor for this
                                    const atlasImage: AtlasImageType = {
                                        id: crypto.randomUUID(),
                                        base64: img,
                                        markId: markIds[i],
                                        position: { x: 0, y: 0 },
                                        rotation: 0,
                                        scale: { x: 1, y: 1 },
                                    };

                                    addAtlasImage(atlasImage);
                                }
                            })
                        );
                    }}
                />
            </div>
        </div>
    );
}

export default MarkCanvas;
