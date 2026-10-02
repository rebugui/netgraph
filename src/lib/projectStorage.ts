import type { StateStorage } from "zustand/middleware";
import { useUiStore } from "../store/useUiStore";
import { validateProject } from "./projectValidation";

export const STORAGE_KEY = "netgraph-project-v1";
let baselineRaw: string | null = null;
let baselineKnown = false;
let blocked = false;
let conflict = false;
let pending: Promise<void> = Promise.resolve();
let queued = 0;

function locksAvailable(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.locks?.request === "function";
}

function markConflict(): void {
  conflict = true;
  useUiStore.getState().setStorageState({ saveStatus: "conflict" });
}

export function unlockStorage(): void {
  if (!blocked) return;
  blocked = false;
  useUiStore.getState().setStorageState({
    storageStatus: "empty",
    rawBackup: null,
    saveStatus: locksAvailable() ? "saved" : "unsupported",
  });
}

function enqueue(name: string, value: string | null): void {
  if (blocked || conflict || !locksAvailable()) {
    if (!blocked && !conflict && !locksAvailable())
      useUiStore.getState().setStorageState({ saveStatus: "unsupported" });
    return;
  }
  queued++;
  useUiStore.getState().setStorageState({ saveStatus: "saving" });
  pending = pending.then(async () => {
    let succeeded = false;
    try {
      if (blocked || conflict) return;
      await navigator.locks.request(`${STORAGE_KEY}:write`, { mode: "exclusive" }, () => {
        if (blocked || conflict) return;
        const current = globalThis.localStorage.getItem(name);
        if (baselineKnown ? current !== baselineRaw : current !== null) {
          markConflict();
          return;
        }
        if (value === null) globalThis.localStorage.removeItem(name);
        else globalThis.localStorage.setItem(name, value);
        baselineRaw = value;
        baselineKnown = true;
        useUiStore.getState().setStorageState({
          storageStatus: value === null ? "empty" : "ready",
          rawBackup: null,
        });
        succeeded = true;
      });
    } catch {
      if (!conflict && !blocked)
        useUiStore.getState().setStorageState({ saveStatus: "failed" });
    } finally {
      queued--;
      if (queued === 0 && succeeded && !blocked && !conflict)
        useUiStore.getState().setStorageState({ saveStatus: "saved" });
    }
  });
}

export function waitForPendingSaves(): Promise<void> {
  return pending;
}

function compareExternal(): void {
  if (blocked || conflict) return;
  try {
    const current = globalThis.localStorage.getItem(STORAGE_KEY);
    if (baselineKnown ? current !== baselineRaw : current !== null) markConflict();
  } catch {
    baselineKnown = false;
    useUiStore.getState().setStorageState({ storageStatus: "unavailable", saveStatus: "failed" });
  }
}

export function registerStorageEvents(): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    try {
      if (event.storageArea === globalThis.localStorage) compareExternal();
    } catch {
      baselineKnown = false;
      useUiStore.getState().setStorageState({ storageStatus: "unavailable", saveStatus: "failed" });
    }
  };
  window.addEventListener("storage", onStorage);
  compareExternal();
  return () => window.removeEventListener("storage", onStorage);
}

export const projectStorage: StateStorage = {
  getItem(name) {
    let raw: string | null;
    try {
      raw = globalThis.localStorage.getItem(name);
    } catch {
      baselineKnown = false;
      useUiStore.getState().setStorageState({ storageStatus: "unavailable", saveStatus: "failed" });
      return null;
    }
    baselineRaw = raw;
    baselineKnown = true;
    if (raw === null) {
      useUiStore.getState().setStorageState({
        storageStatus: "empty", rawBackup: null,
        saveStatus: locksAvailable() ? "saved" : "unsupported",
      });
      return null;
    }
    try {
      const envelope: unknown = JSON.parse(raw);
      if (!envelope || typeof envelope !== "object" || Array.isArray(envelope) ||
        !("version" in envelope) || envelope.version !== 0 || !("state" in envelope))
        throw new Error("Invalid envelope");
      validateProject(envelope.state);
      const project = envelope.state;
      useUiStore.getState().setStorageState({
        storageStatus: "ready", rawBackup: null,
        saveStatus: locksAvailable() ? "saved" : "unsupported",
      });
      return JSON.stringify({
        state: {
          schema: project.schema, meta: project.meta, revisions: project.revisions,
          tabs: project.tabs, activeTabId: project.activeTabId,
        },
        version: 0,
      });
    } catch {
      blocked = true;
      useUiStore.getState().setStorageState({
        storageStatus: "blocked", rawBackup: raw,
        saveStatus: locksAvailable() ? "saved" : "unsupported",
      });
      return null;
    }
  },
  setItem(name, value) { enqueue(name, value); },
  removeItem(name) { enqueue(name, null); },
};
