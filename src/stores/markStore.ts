import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Point2D = {
    x: number;
    y: number;
};

export type Mark = {
    id: string;
    imageId: string;
    points: Point2D[];
};

export type MarkImage = {
    id: string;
    src: string;
    position: Point2D;
    markIds: string[];
};

type MarkStore = {
    images: Record<string, MarkImage>;
    marks: Record<string, Mark>;

    addImage: (image: MarkImage) => void;
    updateImagePosition: (imageId: string, newPos: Point2D) => void;
    addMark: (imageId: string, mark: Mark) => void;
    updateMark: (markId: string, newPoints: Point2D[]) => void;
    removeMark: (markId: string) => void;
};

export const useMarkStore = create(
    persist<MarkStore>(
        (set) => ({
            images: {},
            marks: {},

            addImage: (image) =>
                set((state) => ({
                    images: { ...state.images, [image.id]: image },
                })),

            updateImagePosition: (imageId: string, newPos: Point2D) =>
                set((state) => {
                    const image = state.images[imageId];
                    if (!image) return state;

                    return {
                        images: {
                            ...state.images,
                            [imageId]: {
                                ...image,
                                position: newPos,
                            },
                        },
                    };
                }),

            addMark: (imageId, mark) =>
                set((state) => {
                    const image = state.images[imageId];
                    if (!image) return state;

                    return {
                        marks: {
                            ...state.marks,
                            [mark.id]: mark,
                        },

                        images: {
                            ...state.images,
                            [imageId]: {
                                ...image,
                                markIds: [...image.markIds, mark.id],
                            },
                        },
                    };
                }),

            updateMark: (markId, newPoints) =>
                set((state) => {
                    const mark = state.marks[markId];
                    if (!mark) return state;

                    return {
                        marks: {
                            ...state.marks,
                            [markId]: { ...mark, points: newPoints },
                        },
                    };
                }),

            removeMark: (markId) =>
                set((state) => {
                    const mark = state.marks[markId];
                    if (!mark) return state;

                    const image = state.images[mark.imageId];
                    if (!image) return state;

                    const { [markId]: _, ...remainingmarks } = state.marks;

                    return {
                        marks: remainingmarks,
                        images: {
                            ...state.images,
                            [mark.imageId]: {
                                ...image,
                                markIds: image.markIds.filter((m) => m != markId),
                            },
                        },
                    };
                }),
        }),
        { name: "mark-storage" }
    )
);
