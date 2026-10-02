import { expect, it } from "vitest";
import type { DiagramTab, Segment } from "../types";
import { nextDevicePosition, nextSegmentPosition } from "./layout";

const segment = (id: string, x: number, y: number, h: number): Segment => ({
  id,
  name: id,
  cidr: "10.0.0.0/24",
  x,
  y,
  w: 420,
  h,
});
const tab: DiagramTab = {
  id: "tab",
  name: "test",
  kind: "논리",
  devices: [],
  links: [],
  segments: [
    segment("a", 500, 1160, 410),
    segment("b", 1000, 1160, 710),
    segment("c", 1500, 1160, 110),
  ],
};
it("places the next subnet beyond an occupied tall row with separation", () => {
  const next = nextSegmentPosition(tab);
  for (const s of tab.segments) {
    expect(
      next.x + 420 <= s.x ||
        next.x >= s.x + s.w ||
        next.y + 110 <= s.y ||
        next.y >= s.y + s.h,
    ).toBe(true);
  }
  expect(next.y).toBeGreaterThanOrEqual(
    tab.segments[0].y + tab.segments[0].h + 80,
  );
});
it("skips manually moved segments and unassigned devices without moving existing content", () => {
  const moved: DiagramTab = {
    ...tab,
    segments: [segment("moved", 1000, 1100, 800)],
    devices: [
      {
        id: "server",
        name: "server",
        type: "server",
        segmentId: null,
        x: 1000,
        y: 1950,
      },
    ],
  };
  const before = structuredClone(moved);
  const next = nextSegmentPosition(moved);
  expect(next.y).toBeGreaterThanOrEqual(2100);
  expect(moved).toEqual(before);
});
it("places consecutive unassigned devices outside every existing node with a 40px gap", () => {
  const crowded: DiagramTab = {
    ...tab,
    segments: [segment("block", 790, 760, 300)],
    devices: [],
  };
  const original = structuredClone(crowded);
  for (let index = 0; index < 3; index++) {
    const position = nextDevicePosition(crowded, null);
    for (const box of [
      ...crowded.segments,
      ...crowded.devices.filter((device) => device.segmentId === null).map((device) => ({ ...device, w: 140, h: 70 })),
    ]) {
      expect(
        position.x + 140 + 40 <= box.x || box.x + box.w + 40 <= position.x ||
        position.y + 70 + 40 <= box.y || box.y + box.h + 40 <= position.y,
      ).toBe(true);
    }
    crowded.devices.push({
      id: `device-${index}`, name: "장비", type: "server", segmentId: null, ...position,
    });
  }
  expect(crowded.segments).toEqual(original.segments);
  expect(nextDevicePosition(crowded, null, "device-0")).toEqual({
    x: crowded.devices[0].x, y: crowded.devices[0].y,
  });
});
