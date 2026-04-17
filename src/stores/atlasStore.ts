import { Vec2, ImageType } from "@/types/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { get, set, del } from "idb-keyval";

export interface AtlasImageType extends ImageType {
    markId: string;
    base64: string;
}

interface AtlasStore {
    images: Record<string, AtlasImageType>;

    addImage: (image: AtlasImageType) => void;
    removeImage: (imageId: string) => void;
    updateImagePosition: (imageId: string, newPos: Vec2) => void;
    updateImageScale: (imageId: string, newScale: Vec2) => void;
    updateImageRotation: (imageId: string, newRot: number) => void;
}

const indexedDBStorage = {
    getItem: async (name: string) => {
        return (await get(name)) ?? null;
    },
    setItem: async (name: string, value: string) => {
        await set(name, value);
    },
    removeItem: async (name: string) => {
        await del(name);
    },
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
        { name: "atlas-storage", storage: createJSONStorage(() => indexedDBStorage) }
    )
);
