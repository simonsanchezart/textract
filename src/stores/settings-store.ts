import { size } from "@tauri-apps/plugin-fs";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { getCacheDirectory } from "@/utils/utils";

type SettingsStore = {
  checkUpdates: boolean;
  snap: number;
  atlasResolution: number;
  atlasAlpha: boolean;
  markHandleScale: number;
  cacheSize: number;
  setCheckUpdates: (x: boolean) => void;
  setSnap: (x: number) => void;
  setAtlasResolution: (x: number) => void;
  setAtlasAlpha: (x: boolean) => void;
  setMarkHandleScale: (x: number) => void;
  async calculateCacheSize: () => void;
};

export const useSettingsStore = create(
  persist(
    immer<SettingsStore>(set => ({
      checkUpdates: true,
      snap: 8,
      atlasResolution: 512,
      atlasAlpha: true,
      markHandleScale: 0.75,
      cacheSize: 0,
      setCheckUpdates: x => set((state) => {
        state.checkUpdates = x;
      }),
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
      calculateCacheSize: async () => {
          const cacheDir = await getCacheDirectory();
          const folderSize = await size(cacheDir);

          set((state) => {
            state.cacheSize = Number.parseFloat((folderSize / 1024 / 1024).toFixed(2));
          });
        }
    })),
    { name: "settings-storage" },
  ),
);
