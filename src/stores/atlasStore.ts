import { Point2DType } from "@/types/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

//refactor: add ImageType for AtlasImageType and MarkImageType
//refactor: rename to AtlasImage,  move to namespace if conflict
export type AtlasImageType = {
    id: string;
    markId: string;
    base64: string;
    position: Point2DType;
    scale: Point2DType;
    rotation: number;
};

// refactor: make a parent Store for behavior shader with MarkStore
type AtlasStore = {
    images: Record<string, AtlasImageType>;

    //refactor: add to actions object
    addImage: (image: AtlasImageType) => void;
    removeImage: (imageId: string) => void;
    updateImagePosition: (imageId: string, newPos: Point2DType) => void;
    updateImageScale: (imageId: string, newScale: Point2DType) => void;
    updateImageRotation: (imageId: string, newRot: number) => void;
};

export const useAtlasStore = create(
    persist(
        immer<AtlasStore>((set) => ({
            images: {},

            addImage: (image) =>
                set((state) => {
                    state.images[image.id] = image;
                }),

            updateImagePosition: (imageId, newPos) =>
                set((state) => {
                    if (!state.images[imageId]) return;
                    state.images[imageId].position = newPos;
                }),

            updateImageScale: (imageId, newScale) =>
                set((state) => {
                    if (!state.images[imageId]) return;
                    state.images[imageId].scale = newScale;
                    console.log(newScale);
                }),

            updateImageRotation: (imageId, newRot) =>
                set((state) => {
                    if (!state.images[imageId]) return;
                    state.images[imageId].rotation = newRot;
                }),

            removeImage: (imageId) =>
                set((state) => {
                    const image = state.images[imageId];
                    if (!image) return;

                    delete state.images[imageId];
                }),
        })),
        { name: "atlas-storage" }
    )
);
