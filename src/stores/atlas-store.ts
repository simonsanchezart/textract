import type { ImageType, Vec2 } from "@/types/types";
import { del, get, set } from "idb-keyval";
import { temporal } from "zundo";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useMarkStore } from "./mark-store";
import { leadingDebounce } from "./store-utils";

export type AtlasImageType = {
  markId: string;
  base64: string;
} & ImageType;

type AtlasStore = {
  images: Record<string, AtlasImageType>;

  addImage: (image: AtlasImageType) => void;
  removeImage: (imageId: string) => void;
  updateImageBase64: (imageId: string, base64: string) => void;
  updateImagePosition: (imageId: string, newPos: Vec2) => void;
  updateImageScale: (imageId: string, newScale: Vec2) => void;
  updateImageRotation: (imageId: string, newRot: number) => void;
};

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
    temporal(
      immer<AtlasStore>(set => ({
        images: {},

        addImage: image =>
          set((state) => {
            state.images[image.id] = image;
          }),

        updateImagePosition: (imageId, newPos) =>
          set((state) => {
            if (!state.images[imageId])
              return;
            state.images[imageId].position = newPos;
          }),

        updateImageScale: (imageId, newScale) =>
          set((state) => {
            if (!state.images[imageId])
              return;
            state.images[imageId].scale = newScale;
          }),

        updateImageRotation: (imageId, newRot) =>
          set((state) => {
            if (!state.images[imageId])
              return;
            state.images[imageId].rotation = newRot;
          }),

        updateImageBase64: (imageId, base64) =>
          set((state) => {
            if (!state.images[imageId])
              return;
            state.images[imageId].base64 = base64;
          }),

        removeImage: imageId =>
          set((state) => {
            const image = state.images[imageId];
            if (!image)
              return;

            useMarkStore.getState().updateMarkDirty(image.markId, true);
            delete state.images[imageId];
          }),
      })),
      {
        limit: 50,
        // Same leading-edge requirement as mark-store's undo (see its own
        // comment for the full reasoning): a transform gesture fires 3
        // separate set() calls (scale, rotation, position) that must
        // coalesce into one undo step, and zundo's handleSet receives the
        // state from BEFORE the triggering set, so only a leading-edge
        // debounce restores to the pre-gesture state rather than a no-op.
        handleSet: handleSet => leadingDebounce<typeof handleSet>(handleSet, 300),
      },
    ),
    { name: "atlas-storage", storage: createJSONStorage(() => indexedDBStorage) },
  ),
);
