import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import type { Device } from "../../types";
import { deviceTypes } from "../../lib/deviceTypes";
export type DeviceData = { device: Device; badge?: "error" | "warn" | "info" };
export function DeviceNode({ data }: NodeProps<Node<DeviceData>>) {
  const d = data.device,
    s = deviceTypes[d.type],
    fill = d.color || s.fill;
  return (
    <div className="device-node" data-device-name={d.name}>
      <svg
        width="140"
        height="70"
        viewBox="0 0 140 70"
        className="device-shape"
      >
        <g
          fill={fill}
          stroke={s.line}
          strokeWidth="1.5"
          strokeDasharray={d.type === "cloud" ? "5 3" : undefined}
        >
          {s.shape === "ellipse" ? (
            <ellipse cx="70" cy="35" rx="68" ry="33" />
          ) : s.shape === "cloud" ? (
            <path d="M24 61C1 61 0 37 16 30C8 11 32 2 47 14C55 -1 87 -1 97 15C120 5 140 25 126 38C145 50 132 66 112 62Z" />
          ) : s.shape === "cylinder" ? (
            <>
              <path d="M2 12V58C2 72 138 72 138 58V12" />
              <ellipse cx="70" cy="12" rx="68" ry="10" />
            </>
          ) : (
            <rect
              x="1"
              y="1"
              width="138"
              height="68"
              rx={s.shape === "roundRect" ? 12 : 2}
            />
          )}
        </g>
      </svg>
      <div className="device-label">
        <strong>{d.name}</strong>
        {[d.ip, d.hostName, d.model].filter(Boolean).map((v, i) => (
          <span key={i}>{v}</span>
        ))}
      </div>
      {data.badge && (
        <span
          className={`badge ${data.badge}`}
          title={
            data.badge === "error"
              ? "대역 밖 IP 또는 형식 오류"
              : data.badge === "warn"
                ? "IP 경고"
                : "대역 미지정"
          }
        />
      )}
      {(
        [
          ["top", Position.Top],
          ["bottom", Position.Bottom],
          ["left", Position.Left],
          ["right", Position.Right],
        ] as const
      ).map(([id, position]) => (
        <span key={id}>
          <Handle
            type="target"
            id={id}
            position={position}
            className="back-handle"
          />
          <Handle type="source" id={id} position={position} />
        </span>
      ))}
    </div>
  );
}
