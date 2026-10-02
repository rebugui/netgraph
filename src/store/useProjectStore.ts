import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Project,
  DiagramTab,
  Device,
  Segment,
  Link,
  ProjectMeta,
  Revision,
} from "../types";
import { deviceTypes } from "../lib/deviceTypes";
import { projectStorage, STORAGE_KEY } from "../lib/projectStorage";
import { layoutDiagram, nextDevicePosition } from "../lib/layout";
import { validateProject } from "../lib/projectValidation";
export const uid = () => crypto.randomUUID();
export const today = () => new Date().toLocaleDateString("en-CA");
function uniqueTabName(tabs: DiagramTab[], base: string, suffix = 0): string {
  const names = new Set(tabs.map((tab) => tab.name));
  let name = suffix ? `${base} ${suffix}` : base;
  while (names.has(name)) {
    suffix = Math.max(2, suffix + 1);
    name = `${base} ${suffix}`;
  }
  return name;
}
function makeTab(template: boolean, name = "네트워크 구성도"): DiagramTab {
  const tab: DiagramTab = {
    id: uid(),
    name,
    kind: "물리",
    segments: [],
    devices: [],
    links: [],
  };
  if (template) {
    tab.segments = [
      {
        id: uid(),
        name: "사무망",
        vlan: 10,
        cidr: "192.168.10.0/24",
        gateway: "192.168.10.1",
        x: 500,
        y: 1160,
        w: 420,
        h: 110,
      },
      {
        id: uid(),
        name: "서버망",
        vlan: 20,
        cidr: "192.168.20.0/24",
        gateway: "192.168.20.1",
        x: 1000,
        y: 1160,
        w: 420,
        h: 110,
      },
    ];
    tab.devices = (["internet", "firewall", "router", "l3switch"] as const).map(
      (type, i) => ({
        id: uid(),
        name: deviceTypes[type].label,
        type,
        segmentId: null,
        x: 930,
        y: 40 + i * 220,
      }),
    );
    const ids = tab.devices.map((d) => d.id);
    tab.links = [
      [ids[0], ids[1]],
      [ids[1], ids[2]],
      [ids[2], ids[3]],
      [ids[3], tab.segments[0].id],
      [ids[3], tab.segments[1].id],
    ].map(([from, to]) => ({
      id: uid(),
      from,
      to,
      vpn: false,
      redundant: false,
      sourceHandle: "bottom",
      targetHandle: "top",
    }));
  }
  return layoutDiagram(tab);
}
function makeProject(template: boolean): Project {
  const tab = makeTab(template);
  return {
    schema: 1,
    meta: {
      docTitle: "네트워크 구성도",
      version: "1.0",
      date: today(),
      author: "",
      reviewer: "",
    },
    revisions: [],
    tabs: [tab],
    activeTabId: tab.id,
  };
}
interface Actions {
  addSegment: (s: Omit<Segment, "id">) => string;
  updateSegment: (id: string, p: Partial<Segment>) => void;
  removeSegment: (id: string) => void;
  addDevice: (d: Omit<Device, "id">) => string;
  updateDevice: (id: string, p: Partial<Device>) => void;
  removeDevice: (id: string) => void;
  addLink: (l: Omit<Link, "id">) => void;
  updateLink: (id: string, p: Partial<Link>) => void;
  removeLink: (id: string) => void;
  setNodePos: (id: string, x: number, y: number) => void;
  updateTab: (tab: DiagramTab) => void;
  addTab: (template: boolean) => void;
  dupTab: (id: string) => void;
  removeTab: (id: string) => void;
  renameTab: (id: string, name: string, kind?: DiagramTab["kind"]) => void;
  setActiveTab: (id: string) => void;
  setMeta: (p: Partial<ProjectMeta>) => void;
  addRevision: (r: Omit<Revision, "id">) => void;
  removeRevision: (id: string) => void;
  replaceProject: (p: unknown) => void;
  resetProject: (template: boolean) => void;
}
export const useProjectStore = create<Project & Actions>()(
  persist(
    (set, get) => {
      const edit = (fn: (t: DiagramTab) => DiagramTab) =>
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === s.activeTabId ? fn(t) : t)),
        }));
      return {
        ...makeProject(true),
        addSegment: (s) => {
          const id = uid();
          edit((t) => ({ ...t, segments: [...t.segments, { ...s, id }] }));
          return id;
        },
        updateSegment: (id, p) =>
          edit((t) => ({
            ...t,
            segments: t.segments.map((s) =>
              s.id === id ? { ...s, ...p, id } : s,
            ),
          })),
        removeSegment: (id) =>
          edit((t) => {
            const s = t.segments.find((s) => s.id === id);
            return {
              ...t,
              segments: t.segments.filter((s) => s.id !== id),
              devices: t.devices.map((d) =>
                d.segmentId === id
                  ? {
                      ...d,
                      segmentId: null,
                      x: d.x + (s?.x ?? 0),
                      y: d.y + (s?.y ?? 0),
                    }
                  : d,
              ),
              links: t.links.filter((l) => l.from !== id && l.to !== id),
            };
          }),
        addDevice: (d) => {
          const id = uid();
          edit((t) => ({
            ...t,
            devices: [...t.devices, { ...d, id }],
            segments: t.segments.map((s) =>
              s.id === d.segmentId
                ? {
                    ...s,
                    h: Math.max(s.h, d.y + 100),
                    w: Math.max(s.w, d.x + 170),
                  }
                : s,
            ),
          }));
          return id;
        },
        updateDevice: (id, p) =>
          edit((t) => {
            let updated: Device | undefined;
            const devices = t.devices.map((d) => {
              if (d.id !== id) return d;
              let pos = { x: d.x, y: d.y };
              if (p.segmentId !== undefined && p.segmentId !== d.segmentId) {
                const old = t.segments.find((s) => s.id === d.segmentId);
                pos = p.segmentId
                  ? nextDevicePosition(t, p.segmentId, id)
                  : { x: d.x + (old?.x ?? 0), y: d.y + (old?.y ?? 0) };
              }
              updated = { ...d, ...pos, ...p, id };
              return updated;
            });
            return {
              ...t,
              devices,
              segments: t.segments.map((s) =>
                updated?.segmentId === s.id
                  ? {
                      ...s,
                      h: Math.max(s.h, updated.y + 100),
                      w: Math.max(s.w, updated.x + 170),
                    }
                  : s,
              ),
            };
          }),
        removeDevice: (id) =>
          edit((t) => ({
            ...t,
            devices: t.devices.filter((d) => d.id !== id),
            links: t.links.filter((l) => l.from !== id && l.to !== id),
          })),
        addLink: (l) =>
          edit((t) => ({ ...t, links: [...t.links, { ...l, id: uid() }] })),
        updateLink: (id, p) =>
          edit((t) => ({
            ...t,
            links: t.links.map((l) => (l.id === id ? { ...l, ...p, id } : l)),
          })),
        removeLink: (id) =>
          edit((t) => ({ ...t, links: t.links.filter((l) => l.id !== id) })),
        setNodePos: (id, x, y) =>
          edit((t) => ({
            ...t,
            devices: t.devices.map((d) => (d.id === id ? { ...d, x, y } : d)),
            segments: t.segments.map((s) => (s.id === id ? { ...s, x, y } : s)),
          })),
        updateTab: (tab) =>
          set((s) => ({
            tabs: s.tabs.map((t) => (t.id === tab.id ? tab : t)),
          })),
        addTab: (template) => {
          const tabs = get().tabs;
          const tab = makeTab(
            template,
            uniqueTabName(tabs, "구성도", tabs.length + 1),
          );
          set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
        },
        dupTab: (id) => {
          const src = get().tabs.find((t) => t.id === id);
          if (!src) return;
          const t = structuredClone(src),
            map = new Map(
              [...t.devices, ...t.segments].map((n) => [n.id, uid()]),
            );
          t.id = uid();
          t.name = uniqueTabName(get().tabs, `${src.name} 복사`);
          t.segments.forEach((s) => (s.id = map.get(s.id)!));
          t.devices.forEach((d) => {
            d.id = map.get(d.id)!;
            d.segmentId = d.segmentId ? map.get(d.segmentId)! : null;
          });
          t.links.forEach((l) => {
            l.id = uid();
            l.from = map.get(l.from)!;
            l.to = map.get(l.to)!;
          });
          set((s) => ({ tabs: [...s.tabs, t], activeTabId: t.id }));
        },
        removeTab: (id) => {
          if (get().tabs.length === 1) return;
          set((s) => {
            const tabs = s.tabs.filter((t) => t.id !== id);
            return {
              tabs,
              activeTabId: s.activeTabId === id ? tabs[0].id : s.activeTabId,
            };
          });
        },
        renameTab: (id, name, kind) =>
          set((s) => ({
            tabs: s.tabs.map((t) =>
              t.id === id ? { ...t, name, kind: kind ?? t.kind } : t,
            ),
          })),
        setActiveTab: (id) => {
          if (get().tabs.some((t) => t.id === id)) set({ activeTabId: id });
        },
        setMeta: (p) => set((s) => ({ meta: { ...s.meta, ...p } })),
        addRevision: (r) =>
          set((s) => ({ revisions: [...s.revisions, { ...r, id: uid() }] })),
        removeRevision: (id) =>
          set((s) => ({ revisions: s.revisions.filter((r) => r.id !== id) })),
        replaceProject: (p) => {
          validateProject(p);
          set(structuredClone(p));
        },
        resetProject: (template) => set(makeProject(template)),
      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => projectStorage),
      partialize: (s) => ({
        schema: s.schema,
        meta: s.meta,
        revisions: s.revisions,
        tabs: s.tabs,
        activeTabId: s.activeTabId,
      }),
    },
  ),
);
export function projectSnapshot(): Project {
  const s = useProjectStore.getState();
  return structuredClone({
    schema: s.schema,
    meta: s.meta,
    revisions: s.revisions,
    tabs: s.tabs,
    activeTabId: s.activeTabId,
  });
}
