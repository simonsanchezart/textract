import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type SettingsStore = {
  snap: number;
  atlasResolution: number;
  atlasAlpha: boolean;
  markHandleScale: number;
  setSnap: (x: number) => void;
  setAtlasResolution: (x: number) => void;
  setAtlasAlpha: (x: boolean) => void;
  setMarkHandleScale: (x: number) => void;
};

export const useSettingsStore = create(
  persist(
    immer<SettingsStore>(set => ({
      snap: 8,
      atlasResolution: 512,
      atlasAlpha: true,
      markHandleScale: 1,
      setSnap: x => set((state) => {
        state.snap = x;
      }),
      setAtlasResolution: x => set((state) => {
        state.atlasResolution = x;
      }),
      setAtlasAlpha: x => set((state) => {
        state.atlasAlpha = x;
      }),
      setMarkHandleScale: x => set((state) => {
        state.markHandleScale = x;
      }),
    })),
    { name: "settings-storage" },
  ),
);
