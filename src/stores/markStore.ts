import { Point2DType } from "@/types/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type MarkType = {
    id: string;
    imageId: string;
    points: Point2DType[];
};

export type MarkImageType = {
    id: string;
    originalSrc: string;
    src: string;
    position: Point2DType;
    scale: Point2DType;
    rotation: number;
    markIds: string[];
};

type MarkStore = {
    images: Record<string, MarkImageType>;
    marks: Record<string, MarkType>;

    addImage: (image: MarkImageType) => void;
    updateImagePosition: (imageId: string, newPos: Point2DType) => void;
    updateImageScale: (imageId: string, newScale: Point2DType) => void;
    updateImageRotation: (imageId: string, newRot: number) => void;
    addMark: (imageId: string, mark: MarkType) => void;
    updateMark: (markId: string, newPoints: Point2DType[]) => void;
    updateMarkPoint: (markId: string, pointIdx: number, newPoint: Point2DType) => void;
    removeMark: (markId: string) => void;
    removeImage: (imageId: string) => void;
};

export const useMarkStore = create(
    persist(
        immer<MarkStore>((set) => ({
            images: {},
            marks: {},

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

            addMark: (imageId, mark) =>
                set((state) => {
                    if (!state.images[imageId]) return;
                    state.marks[mark.id] = mark;
                    state.images[imageId].markIds.push(mark.id);
                }),

            updateMark: (markId, newPoints) =>
                set((state) => {
                    if (!state.marks[markId]) return;
                    state.marks[markId].points = newPoints;
                }),

            updateMarkPoint: (markId, pointIdx, newPoint) =>
                set((state) => {
                    if (!state.marks[markId]) return;
                    state.marks[markId].points[pointIdx] = newPoint;
                }),

            removeMark: (markId) =>
                set((state) => {
                    const mark = state.marks[markId];
                    if (!mark) return;
                    if (!state.images[mark.imageId]) return;

                    delete state.marks[markId];
                    state.images[mark.imageId].markIds = state.images[mark.imageId].markIds.filter(
                        (id) => id !== markId
                    );
                }),

            removeImage: (imageId) =>
                set((state) => {
                    const image = state.images[imageId];
                    if (!image) return;

                    for (const markId of image.markIds) {
                        delete state.marks[markId];
                    }

                    delete state.images[imageId];
                }),
        })),
        { name: "mark-storage" }
    )
);

