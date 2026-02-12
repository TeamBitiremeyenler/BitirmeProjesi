import { StateCreator } from "zustand";

export type SearchSlice = {
  query: string;
  setQuery: (query: string) => void;
  clearQuery: () => void;
};

export const createSearchSlice: StateCreator<SearchSlice> = (set) => ({
  query: "",
  setQuery: (query) => set({ query }),
  clearQuery: () => set({ query: "" }),
});
