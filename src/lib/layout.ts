import type { DiagramTab } from "../types";
import { deviceTypes } from "./deviceTypes";
export function layoutDiagram(tab: DiagramTab): DiagramTab {
  const devices = tab.devices.map((d) => ({ ...d })),
    segments = tab.segments.map((s) => ({ ...s }));
  const contentW = Math.max(1000, Math.min(3, segments.length) * 500 - 80),
    centerX = 500 + contentW / 2;
  for (let tier = 0; tier <= 5; tier++) {
    const row = devices.filter(
      (d) => !d.segmentId && deviceTypes[d.type].tier === tier,
    );
    row.forEach((d, i) => {
      d.x = centerX - (row.length - 1) * 120 - 70 + i * 240;
      d.y = 40 + tier * 220;
    });
  }
  // Unassigned endpoints occupy their own row before subnet groups.
  let y =
    1160 +
    (devices.some((d) => !d.segmentId && deviceTypes[d.type].tier === 5)
      ? 220
      : 0);
  for (let start = 0; start < segments.length; start += 3) {
    const row = segments.slice(start, start + 3);
    row.forEach((s, i) => {
      const children = devices.filter((d) => d.segmentId === s.id);
      s.x = 500 + i * 500;
      s.y = y;
      s.w = 420;
      s.h = 110 + Math.ceil(children.length / 2) * 150;
      children.forEach((d, j) => {
        d.x = 30 + (j % 2) * 190;
        d.y = 60 + Math.floor(j / 2) * 150;
      });
    });
    y += Math.max(...row.map((s) => s.h)) + 80;
  }
  return { ...tab, devices, segments };
}
export function nextDevicePosition(
  tab: DiagramTab,
  segmentId: string | null,
  excludeId?: string,
) {
  if (!segmentId) return { x: 800, y: 600 };
  const peers = tab.devices.filter(
    (d) => d.segmentId === segmentId && d.id !== excludeId,
  );
  for (let index = 0; ; index++) {
    const x = 30 + (index % 2) * 190,
      y = 60 + Math.floor(index / 2) * 150;
    if (
      !peers.some(
        (d) => x < d.x + 140 && x + 140 > d.x && y < d.y + 70 && y + 70 > d.y,
      )
    )
      return { x, y };
  }
}

export function nextSegmentPosition(tab: DiagramTab) {
  const x = 500 + (tab.segments.length % 3) * 500;
  let y = 1160 + Math.floor(tab.segments.length / 3) * 400;
  const occupied = [
    ...tab.segments,
    ...tab.devices
      .filter((d) => !d.segmentId)
      .map((d) => ({ ...d, w: 140, h: 70 })),
  ];
  for (;;) {
    let nextY = y;
    for (const box of occupied) {
      if (
        x < box.x + box.w + 80 &&
        x + 420 + 80 > box.x &&
        y < box.y + box.h + 80 &&
        y + 110 + 80 > box.y
      ) {
        nextY = Math.max(nextY, box.y + box.h + 80);
      }
    }
    if (nextY === y) return { x, y };
    y = nextY;
  }
}
