import { create } from "zustand";

type StorageStatus = "empty" | "ready" | "blocked" | "unavailable";
type SaveStatus = "saved" | "saving" | "failed" | "conflict" | "unsupported";
type MobilePanel = "canvas" | "left" | "right";

export const useUiStore = create<{
  selected: string | null;
  focusId: string | null;
  toast: string;
  mobilePanel: MobilePanel;
  storageStatus: StorageStatus;
  rawBackup: string | null;
  saveStatus: SaveStatus;
  select: (id: string | null) => void;
  focus: (id: string) => void;
  notify: (text: string) => void;
  setMobilePanel: (panel: MobilePanel) => void;
  setStorageState: (state: Partial<{
    storageStatus: StorageStatus;
    rawBackup: string | null;
    saveStatus: SaveStatus;
  }>) => void;
}>((set) => ({
  selected: null,
  focusId: null,
  toast: "",
  mobilePanel: "canvas",
  storageStatus: "empty",
  rawBackup: null,
  saveStatus: "saved",
  select: (selected) => set({ selected }),
  focus: (focusId) => set({ focusId, selected: focusId, mobilePanel: "canvas" }),
  notify: (toast) => set({ toast }),
  setMobilePanel: (mobilePanel) => set({ mobilePanel }),
  setStorageState: (state) => set(state),
}));
