import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Point2DType = {
    x: number;
    y: number;
};

export type MarkType = {
    id: string;
    imageId: string;
    points: Point2DType[];
};

export type MarkImageType = {
    id: string;
    src: string;
    position: Point2DType;
    markIds: string[];
};

type MarkStore = {
    images: Record<string, MarkImageType>;
    marks: Record<string, MarkType>;

    addImage: (image: MarkImageType) => void;
    updateImagePosition: (imageId: string, newPos: Point2DType) => void;
    addMark: (imageId: string, mark: MarkType) => void;
    updateMark: (markId: string, newPoints: Point2DType[]) => void;
    updateMarkPoint: (markId: string, pointIdx: number, newPoint: Point2DType) => void;
    removeMark: (markId: string) => void;
    removeImage: (imageId: string) => void;
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

            updateImagePosition: (imageId: string, newPos: Point2DType) =>
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
            updateMarkPoint: (markId: string, pointIdx: number, newPoint: Point2DType) =>
                set((state) => {
                    const mark = state.marks[markId];
                    if (!mark) return state;

                    const newPoints = [...mark.points];
                    newPoints[pointIdx] = newPoint;

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
            removeImage: (imageId) =>
                set((state) => {
                    const image = state.images[imageId];
                    if (!image) return state;

                    const { [imageId]: _, ...remainingImages } = state.images;

                    const remainingMarks = { ...state.marks };
                    for (const markId of image.markIds) {
                        delete remainingMarks[markId];
                    }

                    return {
                        images: remainingImages,
                        marks: remainingMarks,
                    };
                }),
        }),
        { name: "mark-storage" }
    )
);
