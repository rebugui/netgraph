import { beforeEach, afterEach, expect, it, vi } from "vitest";
let waitForPendingSaves: (() => Promise<void>) | undefined;

beforeEach(() => {
  vi.resetModules();
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  });
  vi.stubGlobal("window", { localStorage });
  vi.stubGlobal("navigator", {
    locks: { request: async (_: string, __: unknown, callback: () => void) => callback() },
  });
});
afterEach(async () => {
  await waitForPendingSaves?.();
  waitForPendingSaves = undefined;
  vi.unstubAllGlobals();
});

async function setup() {
  // Import after installing fresh storage so persistence is isolated per test.
  ({ waitForPendingSaves } = await import("../lib/projectStorage"));
  const { useProjectStore: store } = await import("./useProjectStore");
  store.getState().resetProject(true);
  return store;
}

it("avoids existing default names after deleting a tab and renaming another", async () => {
  const store = await setup();
  store.getState().addTab(false);
  const deletedId = store.getState().activeTabId;
  store.getState().addTab(false);
  store.getState().removeTab(deletedId);
  store.getState().addTab(false);
  let tabs = store.getState().tabs;
  expect(new Set(tabs.map((tab) => tab.name)).size).toBe(tabs.length);

  store.getState().renameTab(tabs[0].id, `구성도 ${tabs.length + 2}`);
  store.getState().addTab(false);
  tabs = store.getState().tabs;
  expect(new Set(tabs.map((tab) => tab.name)).size).toBe(tabs.length);
  expect(new Set(tabs.map((tab) => tab.id)).size).toBe(tabs.length);

  store.getState().renameTab(tabs[0].id, tabs[1].name);
  expect(store.getState().tabs[0].name).toBe(tabs[1].name);
});

it("gives repeated copies unique names while retaining independent graph references", async () => {
  const store = await setup();
  const source = store.getState().tabs[0];
  store.getState().dupTab(source.id);
  expect(store.getState().tabs[1].name).toBe(`${source.name} 복사`);
  store.getState().dupTab(source.id);
  store.getState().dupTab(source.id);

  const tabs = store.getState().tabs;
  expect(new Set(tabs.map((tab) => tab.name)).size).toBe(tabs.length);
  const ids = tabs.flatMap((tab) => [
    tab.id,
    ...tab.devices.map((device) => device.id),
    ...tab.segments.map((segment) => segment.id),
    ...tab.links.map((link) => link.id),
  ]);
  expect(new Set(ids).size).toBe(ids.length);
  for (const copy of tabs.slice(1)) {
    const nodes = new Set(
      [...copy.devices, ...copy.segments].map((node) => node.id),
    );
    expect(
      copy.links.map((link) => [nodes.has(link.from), nodes.has(link.to)]),
    ).toEqual(source.links.map(() => [true, true]));
  }
});
