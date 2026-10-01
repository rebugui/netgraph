import type { DiagramTab, Device } from "../types";
export function absoluteDevice(d: Device, tab: DiagramTab) {
  const s = tab.segments.find((s) => s.id === d.segmentId);
  return { x: d.x + (s?.x ?? 0), y: d.y + (s?.y ?? 0), w: 140, h: 70 };
}
export function contentBounds(tab: DiagramTab) {
  const boxes = [
    ...tab.segments,
    ...tab.devices.map((d) => absoluteDevice(d, tab)),
  ];
  if (!boxes.length) return { x: 500, y: 200, w: 500, h: 300 };
  const x = Math.min(...boxes.map((b) => b.x)),
    y = Math.min(...boxes.map((b) => b.y));
  return {
    x,
    y,
    w: Math.max(...boxes.map((b) => b.x + b.w)) - x,
    h: Math.max(...boxes.map((b) => b.y + b.h)) - y,
  };
}
export function legendBox(tab: DiagramTab) {
  const b = contentBounds(tab);
  const count = new Set(tab.devices.map((d) => d.type)).size;
  return {
    x: Math.max(460, b.x + b.w) + 20,
    y: Math.max(110, b.y + b.h) + 20,
    w: 260,
    h: 76 + Math.ceil(count / 2) * 24,
  };
}
