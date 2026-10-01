import { create } from "zustand";
export const useUiStore = create<{
  selected: string | null;
  focusId: string | null;
  toast: string;
  select: (id: string | null) => void;
  focus: (id: string) => void;
  notify: (text: string) => void;
}>((set) => ({
  selected: null,
  focusId: null,
  toast: "",
  select: (selected) => set({ selected }),
  focus: (focusId) => set({ focusId, selected: focusId }),
  notify: (toast) => set({ toast }),
}));
