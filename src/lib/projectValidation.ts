import type { Project, ProjectMeta, Device, Revision } from "../types";
import { deviceTypes } from "./deviceTypes";

export function validateProject(value: unknown): asserts value is Project {
  const fail = () => {
    throw new Error("유효하지 않은 프로젝트 JSON입니다 (schema 1 필요).");
  };
  if (!value || typeof value !== "object") return fail();
  const p = value as Project;
  const str = (x: unknown) => typeof x === "string";
  const num = (x: unknown) => typeof x === "number" && Number.isFinite(x);
  if (
    p.schema !== 1 ||
    !p.meta ||
    !["docTitle", "version", "date", "author", "reviewer"].every((k) =>
      str(p.meta[k as keyof ProjectMeta]),
    ) ||
    !Array.isArray(p.tabs) ||
    !p.tabs.length ||
    !Array.isArray(p.revisions)
  )
    return fail();
  const tabIds = new Set<string>();
  for (const t of p.tabs) {
    if (
      !t ||
      !str(t.id) ||
      tabIds.has(t.id) ||
      !str(t.name) ||
      !["물리", "논리", "기타"].includes(t.kind) ||
      !Array.isArray(t.devices) ||
      !Array.isArray(t.segments) ||
      !Array.isArray(t.links)
    )
      return fail();
    tabIds.add(t.id);
    const ids = new Set<string>();
    for (const n of [...t.segments, ...t.devices]) {
      if (
        !n ||
        !str(n.id) ||
        n.id.startsWith("__") ||
        ids.has(n.id) ||
        !str(n.name) ||
        !num(n.x) ||
        !num(n.y)
      )
        return fail();
      ids.add(n.id);
    }
    for (const s of t.segments)
      if (
        !str(s.cidr) ||
        !num(s.w) ||
        !num(s.h) ||
        s.w < 140 ||
        s.h < 70 ||
        (s.gateway !== undefined && !str(s.gateway)) ||
        (s.vlan !== undefined &&
          (!Number.isInteger(s.vlan) || s.vlan < 1 || s.vlan > 4094))
      )
        return fail();
    for (const d of t.devices)
      if (
        !Object.hasOwn(deviceTypes, d.type) ||
        (d.segmentId !== null &&
          !t.segments.some((s) => s.id === d.segmentId)) ||
        ["ip", "hostName", "model", "color"].some(
          (k) =>
            d[k as keyof Device] !== undefined && !str(d[k as keyof Device]),
        )
      )
        return fail();
    const links = new Set<string>();
    for (const l of t.links) {
      if (
        !l ||
        !str(l.id) ||
        links.has(l.id) ||
        !ids.has(l.from) ||
        !ids.has(l.to) ||
        typeof l.vpn !== "boolean" ||
        typeof l.redundant !== "boolean" ||
        (l.speed !== undefined && !str(l.speed)) ||
        (l.vlans !== undefined &&
          (!Array.isArray(l.vlans) ||
            l.vlans.some((v) => !Number.isInteger(v) || v < 1 || v > 4094))) ||
        [l.sourceHandle, l.targetHandle].some(
          (h) =>
            h !== undefined &&
            h !== null &&
            !["top", "bottom", "left", "right"].includes(h),
        )
      )
        return fail();
      links.add(l.id);
    }
  }
  if (
    !tabIds.has(p.activeTabId) ||
    p.revisions.some(
      (r) =>
        !r ||
        !["id", "version", "date", "author", "desc"].every((k) =>
          str(r[k as keyof Revision]),
        ),
    )
  )
    return fail();
}
