import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type SettingsStore = {
  snap: number;
  atlasResolution: number;
  atlasAlpha: boolean;
  setSnap: (x: number) => void;
  setAtlasResolution: (x: number) => void;
  setAtlasAlpha: (x: boolean) => void;
};

export const useSettingsStore = create(
  persist(
    immer<SettingsStore>(set => ({
      snap: 8,
      atlasResolution: 2048,
      atlasAlpha: true,
      setSnap: x => set((state) => {
        state.snap = x;
      }),
      setAtlasResolution: x => set((state) => {
        state.atlasResolution = x;
      }),
      setAtlasAlpha: x => set((state) => {
        state.atlasAlpha = x;
      }),
    })),
    { name: "settings-storage" },
  ),
);
