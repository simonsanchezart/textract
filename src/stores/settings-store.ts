import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type SettingsStore = {
  snap: number;
  setSnap: (x: number) => void;
};

export const useSettingsStore = create(
  persist(
    immer<SettingsStore>(set => ({
      snap: 8,
      setSnap: x => set((state) => {
        state.snap = x;
      }),
    })),
    { name: "settings-storage" },
  ),
);
