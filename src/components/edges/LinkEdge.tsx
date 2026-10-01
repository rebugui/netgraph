import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import type { EdgeProps, Edge } from "@xyflow/react";
import type { Link } from "../../types";
export function LinkEdge(props: EdgeProps<Edge<{ link: Link }>>) {
  const l = props.data!.link;
  const [path, x, y] = getSmoothStepPath(props);
  const label = [l.speed, l.vlans?.length ? `VLAN ${l.vlans.join(",")}` : ""]
    .filter(Boolean)
    .join(" · ");
  const style = {
    stroke: l.vpn ? "#7D3C98" : "#404040",
    strokeWidth: 2,
    strokeDasharray: l.vpn ? "6 4" : undefined,
  };
  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        style={{ ...style, stroke: l.redundant ? "transparent" : style.stroke }}
        interactionWidth={20}
      />
      {l.redundant &&
        [-2.5, 2.5].map((n) => (
          <path
            key={n}
            d={path}
            transform={`translate(${n},${n})`}
            fill="none"
            style={style}
          />
        ))}
      {(label || l.vpn) && (
        <EdgeLabelRenderer>
          <div
            className="edge-label"
            style={{
              transform: `translate(-50%,-50%) translate(${x}px,${y}px)`,
            }}
          >
            {l.vpn ? "🔒 " : ""}
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
