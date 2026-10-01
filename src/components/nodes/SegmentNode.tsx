import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import type { Segment } from "../../types";
export function SegmentNode({
  data,
}: NodeProps<Node<{ segment: Segment; color: string; warning?: boolean }>>) {
  const s = data.segment;
  return (
    <div
      className="segment-node"
      style={{ background: data.color, width: "100%", height: "100%" }}
    >
      <div className="segment-header">
        {data.warning ? "⚠ " : ""}
        {s.vlan ? `VLAN ${s.vlan} · ` : ""}
        {s.name} · {s.cidr}
        {s.gateway ? ` · GW ${s.gateway}` : ""}
      </div>
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="back-handle"
      />
      <Handle type="source" position={Position.Top} id="top" />
    </div>
  );
}
