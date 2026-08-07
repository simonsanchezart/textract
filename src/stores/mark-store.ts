import type { ImageType, Vec2 } from "@/types/types";
import { temporal } from "zundo";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type GridDims = {
  rows: number;
  cols: number;
};

export type PointMeta = {
  smooth: boolean;
  /** 0 = loosest curve, 1 = fully damped (identical to a straight line). Only meaningful when smooth. */
  tension: number;
};

const DEFAULT_TENSION = 0.5;

export type MarkType = {
  id: string;
  imageId: string;
  /** Unused (empty) for bezier marks -- they use corners/handles instead. */
  points: Vec2[];
  dirty: boolean;
  /** Defaults to "quad" for marks persisted before grid marks existed. */
  markType?: "quad" | "grid" | "bezier";
  /** Only set when markType is "grid" — points is a row-major rows*cols grid. */
  gridDims?: GridDims;
  /**
   * Only meaningful for grid marks, parallel to `points` by index. A missing
   * array, or a missing/absent entry within it, means "linear" (the default
   * for every point before this feature existed, and for every point a user
   * hasn't explicitly made smooth) -- so old persisted marks and marks that
   * never touch curve mode behave exactly as before.
   */
  pointMeta?: PointMeta[];
  /**
   * Only set when markType is "bezier": 4 corners in order
   * [top-left, top-right, bottom-right, bottom-left].
   */
  corners?: Vec2[];
  /**
   * Only set when markType is "bezier": 8 handles, 2 per edge, independent
   * (not mirrored across a corner). Edge i runs corners[i] -> corners[(i+1)%4]
   * as a cubic bezier: P0=corners[i], P1=handles[2i], P2=handles[2i+1],
   * P3=corners[(i+1)%4]. A newly-placed bezier mark seeds handles at the 1/3
   * and 2/3 points of each straight edge, which renders as a perfectly
   * straight line until the user drags a handle to bow it.
   */
  handles?: Vec2[];
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
  /**
   * Toggles smooth on/off for the given point indices on one mark. If any
   * of the points are currently non-smooth, this turns smooth ON for all of
   * them; only if every one of them is already smooth does it turn them all
   * off -- so toggling a mixed selection always "adds" smoothing first.
   */
  toggleSmoothForPoints: (markId: string, pointIndices: number[]) => void;
  adjustTensionForPoints: (markId: string, pointIndices: number[], delta: number) => void;
  updateBezierCorner: (markId: string, cornerIdx: number, newPoint: Vec2) => void;
  updateBezierHandle: (markId: string, handleIdx: number, newPoint: Vec2) => void;
  /** Shifts every corner and handle by the same delta, for a whole-mark drag. */
  translateBezierMark: (markId: string, dx: number, dy: number) => void;
  /**
   * Shifts a subset of corners/handles by the same delta, for a multi-select
   * group drag. Indices share one combined space so selection can span both
   * kinds of point: 0-3 are corners, 4-11 are handles (handle = index - 4).
   */
  translateBezierPoints: (markId: string, combinedIndices: number[], dx: number, dy: number) => void;
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

        toggleSmoothForPoints: (markId, pointIndices) =>
          set((state) => {
            const mark = state.marks[markId];
            if (!mark || pointIndices.length === 0)
              return;

            if (!mark.pointMeta)
              mark.pointMeta = mark.points.map(() => ({ smooth: false, tension: DEFAULT_TENSION }));
            while (mark.pointMeta.length < mark.points.length)
              mark.pointMeta.push({ smooth: false, tension: DEFAULT_TENSION });

            const allAlreadySmooth = pointIndices.every(i => mark.pointMeta![i]?.smooth);
            for (const i of pointIndices) {
              if (!mark.pointMeta[i])
                mark.pointMeta[i] = { smooth: false, tension: DEFAULT_TENSION };
              mark.pointMeta[i].smooth = !allAlreadySmooth;
            }
            mark.dirty = true;
          }),

        adjustTensionForPoints: (markId, pointIndices, delta) =>
          set((state) => {
            const mark = state.marks[markId];
            if (!mark || pointIndices.length === 0)
              return;

            if (!mark.pointMeta)
              mark.pointMeta = mark.points.map(() => ({ smooth: false, tension: DEFAULT_TENSION }));
            while (mark.pointMeta.length < mark.points.length)
              mark.pointMeta.push({ smooth: false, tension: DEFAULT_TENSION });

            for (const i of pointIndices) {
              if (!mark.pointMeta[i])
                mark.pointMeta[i] = { smooth: false, tension: DEFAULT_TENSION };
              mark.pointMeta[i].tension = Math.min(1, Math.max(0, mark.pointMeta[i].tension + delta));
            }
            mark.dirty = true;
          }),

        updateBezierCorner: (markId, cornerIdx, newPoint) =>
          set((state) => {
            const mark = state.marks[markId];
            if (!mark?.corners)
              return;
            mark.corners[cornerIdx] = newPoint;
            mark.dirty = true;
          }),

        updateBezierHandle: (markId, handleIdx, newPoint) =>
          set((state) => {
            const mark = state.marks[markId];
            if (!mark?.handles)
              return;
            mark.handles[handleIdx] = newPoint;
            mark.dirty = true;
          }),

        translateBezierMark: (markId, dx, dy) =>
          set((state) => {
            const mark = state.marks[markId];
            if (!mark?.corners || !mark.handles)
              return;
            mark.corners = mark.corners.map(p => ({ x: p.x + dx, y: p.y + dy }));
            mark.handles = mark.handles.map(p => ({ x: p.x + dx, y: p.y + dy }));
            mark.dirty = true;
          }),

        translateBezierPoints: (markId, combinedIndices, dx, dy) =>
          set((state) => {
            const mark = state.marks[markId];
            if (!mark?.corners || !mark.handles)
              return;
            for (const i of combinedIndices) {
              if (i < 4)
                mark.corners[i] = { x: mark.corners[i].x + dx, y: mark.corners[i].y + dy };
              else
                mark.handles[i - 4] = { x: mark.handles[i - 4].x + dx, y: mark.handles[i - 4].y + dy };
            }
            mark.dirty = true;
          }),
      })),
      {
        partialize: state => ({ images: state.images, marks: state.marks }),
        limit: 50,
        // A single logical edit (e.g. dragging a point) fires multiple store
        // actions back-to-back (updateMarkPoint per pointer-move, then
        // updateMarkDirty), and temporal snapshots on every set() call by
        // default -- without coalescing, one undo only reverts the last of
        // those (the invisible dirty flag), not the actual edit.
        //
        // This MUST be leading-edge. zundo calls handleSet with the state as
        // it was *before* that set (see `curriedHandleSet(pastState, ...)` in
        // zundo/dist/index.js). A trailing-edge debounce keeps the LAST
        // call's args, i.e. the state just before the final pointer-move --
        // so undo restored the point to ~where it already was and looked like
        // a no-op. Leading-edge keeps the FIRST call's args: the state from
        // before the drag began, which is what undo should restore.
        handleSet: handleSet => leadingDebounce<typeof handleSet>(handleSet, 300),
      },
    ),
    { name: "mark-storage" },
  ),
);

/**
 * Leading-edge debounce: invokes `fn` immediately on the first call, then
 * swallows further calls until `delayMs` has elapsed with no calls at all.
 *
 * Deliberately leading rather than trailing -- see the handleSet comment
 * above. A burst of calls therefore yields exactly one invocation, using the
 * arguments of the call that *started* the burst.
 */
function leadingDebounce<T extends (...args: Parameters<T>) => void>(fn: T, delayMs: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<T>) => {
    const isBurstStart = timer === undefined;

    if (timer)
      clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
    }, delayMs);

    if (isBurstStart)
      fn(...args);
  }) as T;
}
