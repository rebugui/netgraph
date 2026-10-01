import type { Node, Edge } from "@xyflow/react";
import type { DiagramTab, ProjectMeta } from "../types";
import { validate } from "../lib/validate";
import { segmentColors } from "../lib/deviceTypes";
import { legendBox } from "../lib/geometry";
import { DeviceNode } from "./nodes/DeviceNode";
import { SegmentNode } from "./nodes/SegmentNode";
import { TitleBlockNode } from "./nodes/TitleBlockNode";
import { LegendNode } from "./nodes/LegendNode";
import { LinkEdge } from "./edges/LinkEdge";
export const nodeTypes = {
  device: DeviceNode,
  segment: SegmentNode,
  title: TitleBlockNode,
  legend: LegendNode,
};
export const edgeTypes = { link: LinkEdge };
export function sceneNodes(tab: DiagramTab, meta: ProjectMeta): Node[] {
  const warnings = validate(tab),
    legend = legendBox(tab);
  return [
    ...tab.segments.map((s, i) => ({
      id: s.id,
      type: "segment",
      position: { x: s.x, y: s.y },
      style: { width: s.w, height: s.h },
      data: {
        segment: s,
        color: segmentColors[i % segmentColors.length],
        warning: warnings.some(
          (w) => w.segmentId === s.id && w.level !== "info",
        ),
      },
    })),
    ...tab.devices.map((d) => ({
      id: d.id,
      type: "device",
      position: { x: d.x, y: d.y },
      parentId: d.segmentId ?? undefined,
      extent: d.segmentId ? ("parent" as const) : undefined,
      style: { width: 140, height: 70 },
      data: {
        device: d,
        badge: (["error", "warn", "info"] as const).find((level) =>
          warnings.some((w) => w.deviceId === d.id && w.level === level),
        ),
      },
    })),
    {
      id: "__title",
      type: "title",
      position: { x: 0, y: 0 },
      style: { width: 460, height: 110 },
      draggable: false,
      selectable: false,
      deletable: false,
      connectable: false,
      data: { meta, tabName: tab.name },
    },
    {
      id: "__legend",
      type: "legend",
      position: { x: legend.x, y: legend.y },
      style: { width: legend.w, height: legend.h },
      draggable: false,
      selectable: false,
      deletable: false,
      connectable: false,
      data: { types: [...new Set(tab.devices.map((d) => d.type))] },
    },
  ];
}
export function sceneEdges(tab: DiagramTab, selected?: string | null): Edge[] {
  return tab.links.map((l) => ({
    id: l.id,
    source: l.from,
    target: l.to,
    sourceHandle: l.sourceHandle ?? "bottom",
    targetHandle: l.targetHandle ?? "top",
    type: "link",
    data: { link: l },
    selected: selected === l.id,
  }));
}
