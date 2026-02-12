import { StateCreator } from "zustand";

export type ViewMode = "list" | "grid";

export type BaseSlice = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
};

export const createBaseSlice: StateCreator<BaseSlice> = (set) => ({
  viewMode: "grid",
  setViewMode: (mode) => set({ viewMode: mode }),
});
