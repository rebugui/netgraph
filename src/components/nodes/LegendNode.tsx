import type { Node, NodeProps } from "@xyflow/react";
import type { DeviceTypeId } from "../../types";
import { deviceTypes } from "../../lib/deviceTypes";
export function LegendNode({
  data,
}: NodeProps<Node<{ types: DeviceTypeId[] }>>) {
  return (
    <div className="legend">
      <strong>범례</strong>
      <div className="legend-types">
        {data.types.map((t) => (
          <div key={t}>
            <i
              style={{
                background: deviceTypes[t].fill,
                borderRadius:
                  deviceTypes[t].shape === "ellipse" ? "50%" : "3px",
              }}
            />
            {deviceTypes[t].label}
          </div>
        ))}
      </div>
      <div className="legend-links">
        <span>
          <i />
          일반
        </span>
        <span>
          <i className="double" />
          이중화
        </span>
        <span>
          <i className="vpn" />
          🔒 VPN
        </span>
      </div>
    </div>
  );
}
