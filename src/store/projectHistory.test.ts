import { beforeEach, afterEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  });
  vi.stubGlobal("window", { localStorage });
});
afterEach(() => vi.unstubAllGlobals());
async function setup() {
  // Static imports would run before the per-test storage and module reset.
  const { useProjectStore: store } = await import("./useProjectStore");
  store.getState().resetProject(true);
  // Each test needs a fresh subscription and store after installing its storage.
  const history = await import("./projectHistory");
  return { store, ...history };
}
it("undoes a multi-action deletion atomically and persists the restored graph", async () => {
  const { store, undo, redo } = await setup();
  const before = store.getState().tabs;
  const tab = before[0];
  store.getState().removeDevice(tab.devices[0].id);
  store.getState().removeDevice(tab.devices[1].id);
  expect(undo()).toBe(true);
  expect(store.getState().tabs).toEqual(before);
  expect(
    JSON.parse(localStorage.getItem("netgraph-project-v1")!).state.tabs,
  ).toEqual(before);
  expect(redo()).toBe(true);
  expect(store.getState().tabs[0].devices.map((d) => d.id)).toEqual(
    tab.devices.slice(2).map((d) => d.id),
  );
});
it("discards redo after new edits but ignores tab navigation", async () => {
  const { store, undo, redo } = await setup();
  store.getState().addTab(false);
  await Promise.resolve();
  store.getState().setMeta({ author: "first" });
  await Promise.resolve();
  expect(undo()).toBe(true);
  store.getState().setActiveTab(store.getState().tabs[0].id);
  expect(redo()).toBe(true);
  expect(store.getState().meta.author).toBe("first");
  undo();
  store.getState().setMeta({ author: "replacement" });
  expect(redo()).toBe(false);
  expect(store.getState().meta.author).toBe("replacement");
});
it("bounds history to the latest 100 operations", async () => {
  const { store, undo } = await setup();
  for (let i = 1; i <= 105; i++) {
    store.getState().setMeta({ version: String(i) });
    await Promise.resolve();
  }
  for (let i = 0; i < 100; i++) expect(undo()).toBe(true);
  expect(undo()).toBe(false);
  expect(store.getState().meta.version).toBe("5");
});
