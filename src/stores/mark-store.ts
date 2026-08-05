import type { ImageType, Vec2 } from "@/types/types";
import { temporal } from "zundo";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type MarkType = {
  id: string;
  imageId: string;
  points: Vec2[];
  dirty: boolean;
};

export type MarkImageType = {
  filepath: string;
  src: string;
  markIds: string[];
  sizeSum: number;
} & ImageType;

type MarkStore = {
  images: Record<string, MarkImageType>;
  marks: Record<string, MarkType>;

  addImage: (image: MarkImageType) => void;
  updateImagePosition: (imageId: string, newPos: Vec2) => void;
  updateImageScale: (imageId: string, newScale: Vec2) => void;
  updateImageRotation: (imageId: string, newRot: number) => void;
  addMark: (imageId: string, mark: MarkType) => void;
  updateMark: (markId: string, newPoints: Vec2[]) => void;
  updateMarkPoint: (markId: string, pointIdx: number, newPoint: Vec2) => void;
  updateMarkDirty: (markId: string, dirty: boolean) => void;
  removeMark: (markId: string) => void;
  removeImage: (imageId: string) => void;
};

export const useMarkStore = create(
  persist(
    temporal(
      immer<MarkStore>(set => ({
        images: {},
        marks: {},

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

        addMark: (imageId, mark) =>
          set((state) => {
            if (!state.images[imageId])
              return;
            state.marks[mark.id] = mark;
            state.images[imageId].markIds.push(mark.id);
          }),

        updateMark: (markId, newPoints) =>
          set((state) => {
            if (!state.marks[markId])
              return;
            state.marks[markId].points = newPoints;
          }),

        updateMarkPoint: (markId, pointIdx, newPoint) =>
          set((state) => {
            if (!state.marks[markId])
              return;
            state.marks[markId].points[pointIdx] = newPoint;
          }),

        updateMarkDirty: (markId, dirty) =>
          set((state) => {
            if (!state.marks[markId])
              return;
            state.marks[markId].dirty = dirty;
          }),

        removeMark: markId =>
          set((state) => {
            const mark = state.marks[markId];
            if (!mark)
              return;
            if (!state.images[mark.imageId])
              return;

            delete state.marks[markId];
            state.images[mark.imageId].markIds = state.images[mark.imageId].markIds.filter(
              id => id !== markId,
            );
          }),

        removeImage: imageId =>
          set((state) => {
            const image = state.images[imageId];
            if (!image)
              return;

            for (const markId of image.markIds) {
              delete state.marks[markId];
            }

            delete state.images[imageId];
          }),
      })),
      {
        partialize: state => ({ images: state.images, marks: state.marks }),
        limit: 50,
        // A single logical edit (e.g. dragging a point) fires multiple store
        // actions back-to-back (updateMarkPoint then updateMarkDirty), and
        // temporal snapshots on every set() call by default -- without this,
        // one undo only reverts the last of those (the invisible dirty
        // flag), not the actual edit. Debouncing handleSet coalesces a burst
        // of same-tick calls into a single history entry.
        handleSet: handleSet => debounce<typeof handleSet>(handleSet, 300),
      },
    ),
    { name: "mark-storage" },
  ),
);

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delayMs: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<T>) => {
    if (timer)
      clearTimeout(timer);
    timer = setTimeout(fn, delayMs, ...args);
  }) as T;
}
