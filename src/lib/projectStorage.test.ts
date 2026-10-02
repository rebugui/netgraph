import { afterEach, beforeEach, expect, it, vi } from "vitest";

const KEY = "netgraph-project-v1";
let data: Map<string, string>;
let inaccessibleRead = false;
let inaccessibleWrite = false;
let waitForPendingSaves: (() => Promise<void>) | undefined;

beforeEach(() => {
  vi.resetModules();
  data = new Map();
  inaccessibleRead = false;
  inaccessibleWrite = false;
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => {
      if (inaccessibleRead) throw new DOMException("Denied", "SecurityError");
      return data.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (inaccessibleWrite) throw new DOMException("Full", "QuotaExceededError");
      data.set(key, value);
    },
    removeItem: (key: string) => { data.delete(key); },
  });
  vi.stubGlobal("navigator", {
    locks: { request: async (_: string, __: unknown, callback: () => void) => callback() },
  });
});
afterEach(async () => {
  await waitForPendingSaves?.();
  waitForPendingSaves = undefined;
  vi.unstubAllGlobals();
});

async function load() {
  // This import intentionally follows resetModules and the per-case browser stubs.
  const storage = await import("./projectStorage");
  waitForPendingSaves = storage.waitForPendingSaves;
  const { useProjectStore, projectSnapshot } = await import("../store/useProjectStore");
  const { useUiStore } = await import("../store/useUiStore");
  return { ...storage, useProjectStore, projectSnapshot, useUiStore };
}

it("keeps malformed original bytes untouched until a confirmed reset passes the locked comparison", async () => {
  const raw = '{"state":broken';
  data.set(KEY, raw);
  const { useProjectStore, useUiStore, unlockStorage, waitForPendingSaves } = await load();
  expect(useUiStore.getState().storageStatus).toBe("blocked");
  expect(useUiStore.getState().rawBackup).toBe(raw);
  useProjectStore.getState().resetProject(false);
  await waitForPendingSaves();
  expect(data.get(KEY)).toBe(raw);
  unlockStorage();
  data.set(KEY, "other tab changed the key");
  useProjectStore.getState().resetProject(false);
  await waitForPendingSaves();
  expect(useUiStore.getState().saveStatus).toBe("conflict");
  expect(data.get(KEY)).toBe("other tab changed the key");
});

it("serializes queued snapshots and reports saving until the final locked write", async () => {
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  vi.stubGlobal("navigator", {
    locks: { request: async (_: string, __: unknown, callback: () => void) => { await gate; return callback(); } },
  });
  const { useProjectStore, useUiStore, waitForPendingSaves } = await load();
  useProjectStore.getState().setMeta({ author: "first" });
  useProjectStore.getState().setMeta({ author: "latest" });
  expect(useUiStore.getState().saveStatus).toBe("saving");
  expect(data.has(KEY)).toBe(false);
  release!();
  await waitForPendingSaves();
  expect(useUiStore.getState().saveStatus).toBe("saved");
  expect(JSON.parse(data.get(KEY)!).state.meta.author).toBe("latest");
});

it("preserves an externally changed key rather than saving a stale edit", async () => {
  const { useProjectStore, useUiStore, waitForPendingSaves } = await load();
  useProjectStore.getState().setMeta({ author: "first" });
  await waitForPendingSaves();
  const foreign = data.get(KEY)!.replace("first", "other");
  data.set(KEY, foreign);
  useProjectStore.getState().setMeta({ author: "local unsaved" });
  await waitForPendingSaves();
  expect(useUiStore.getState().saveStatus).toBe("conflict");
  expect(useProjectStore.getState().meta.author).toBe("local unsaved");
  expect(data.get(KEY)).toBe(foreign);
});

it("recovers from write failure on the next edit without losing the latest snapshot", async () => {
  const { useProjectStore, useUiStore, waitForPendingSaves } = await load();
  inaccessibleWrite = true;
  useProjectStore.getState().setMeta({ author: "first" });
  await waitForPendingSaves();
  expect(useUiStore.getState().saveStatus).toBe("failed");
  inaccessibleWrite = false;
  useProjectStore.getState().setMeta({ author: "latest" });
  await waitForPendingSaves();
  expect(useUiStore.getState().saveStatus).toBe("saved");
  expect(JSON.parse(data.get(KEY)!).state.meta.author).toBe("latest");
});

it("never overwrites an unknown baseline discovered after read access returns", async () => {
  inaccessibleRead = true;
  const { useProjectStore, useUiStore, waitForPendingSaves } = await load();
  expect(useUiStore.getState().storageStatus).toBe("unavailable");
  inaccessibleRead = false;
  data.set(KEY, "existing user data");
  useProjectStore.getState().resetProject(false);
  await waitForPendingSaves();
  expect(useUiStore.getState().saveStatus).toBe("conflict");
  expect(data.get(KEY)).toBe("existing user data");
});

it("reads a valid envelope without writing it or merging foreign root fields into the store", async () => {
  const first = await load();
  const project = first.projectSnapshot();
  await first.waitForPendingSaves();
  vi.resetModules();
  const original = JSON.stringify({ version: 0, state: { ...project, injectedAction: "never merge" } });
  data.set(KEY, original);
  const second = await load();
  expect(second.useUiStore.getState().storageStatus).toBe("ready");
  expect(second.projectSnapshot()).toEqual(project);
  expect("injectedAction" in second.useProjectStore.getState()).toBe(false);
  expect(data.get(KEY)).toBe(original);
});

it("keeps loaded content readable but refuses writes without Web Locks", async () => {
  vi.stubGlobal("navigator", {});
  const { useProjectStore, useUiStore, waitForPendingSaves } = await load();
  useProjectStore.getState().setMeta({ author: "offline" });
  await waitForPendingSaves();
  expect(useUiStore.getState().saveStatus).toBe("unsupported");
  expect(useProjectStore.getState().meta.author).toBe("offline");
  expect(data.has(KEY)).toBe(false);
});
