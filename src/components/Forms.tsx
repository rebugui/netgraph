import { useState } from "react";
import type { Device, Segment, Link, DeviceTypeId } from "../types";
import { deviceTypes } from "../lib/deviceTypes";
import { parseCidr, cidrInfo } from "../lib/ip";
export function SegmentForm({
  initial,
  onSave,
  submitLabel = "대역 추가",
}: {
  initial?: Segment;
  onSave: (s: Omit<Segment, "id">) => void;
  submitLabel?: string;
}) {
  const [s, set] = useState<Omit<Segment, "id">>(
    initial ?? {
      name: "",
      cidr: "",
      gateway: "",
      x: 500,
      y: 1160,
      w: 420,
      h: 110,
    },
  );
  const c = parseCidr(s.cidr),
    info = c ? cidrInfo(c.ip, c.prefix) : null;
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(s);
      }}
    >
      <label>
        대역 이름
        <input
          required
          value={s.name}
          onChange={(e) => set({ ...s, name: e.target.value })}
        />
      </label>
      <div className="form-row">
        <label>
          VLAN
          <input
            type="number"
            min="1"
            max="4094"
            value={s.vlan ?? ""}
            onChange={(e) =>
              set({
                ...s,
                vlan: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </label>
        <label>
          CIDR
          <input
            required
            placeholder="192.168.10.0/24"
            value={s.cidr}
            onChange={(e) => set({ ...s, cidr: e.target.value.trim() })}
          />
        </label>
      </div>
      <label>
        게이트웨이
        <input
          value={s.gateway ?? ""}
          onChange={(e) => set({ ...s, gateway: e.target.value.trim() })}
        />
      </label>
      {s.cidr &&
        (info ? (
          <div className="preview">
            네트워크 {info.network}/{c!.prefix}
            <br />
            가용 {info.hostFirst} – {info.hostLast}
            <br />
            호스트 {info.hostCount.toLocaleString()}개
          </div>
        ) : (
          <p className="error">
            {s.cidr.includes(":")
              ? "이 버전은 IPv4만 지원"
              : "CIDR 형식이 올바르지 않습니다"}
          </p>
        ))}
      <button className="primary" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
export function DeviceForm({
  initial,
  segments,
  onSave,
  submitLabel = "장비 추가",
}: {
  initial?: Device;
  segments: Segment[];
  onSave: (d: Omit<Device, "id">) => void;
  submitLabel?: string;
}) {
  const [d, set] = useState<Omit<Device, "id">>(
    initial ?? {
      name: "",
      type: "server",
      ip: "",
      hostName: "",
      model: "",
      segmentId: null,
      x: 800,
      y: 600,
    },
  );
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(d);
      }}
    >
      <label>
        장비명
        <input
          required
          value={d.name}
          onChange={(e) => set({ ...d, name: e.target.value })}
        />
      </label>
      <label>
        유형
        <select
          value={d.type}
          onChange={(e) => set({ ...d, type: e.target.value as DeviceTypeId })}
        >
          {Object.entries(deviceTypes).map(([id, s]) => (
            <option key={id} value={id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        IP 주소
        <input
          placeholder="192.168.10.10"
          value={d.ip ?? ""}
          onChange={(e) => set({ ...d, ip: e.target.value.trim() })}
        />
      </label>
      {d.ip?.includes(":") && <p className="preview">이 버전은 IPv4만 지원</p>}
      <label>
        호스트명
        <input
          value={d.hostName ?? ""}
          onChange={(e) => set({ ...d, hostName: e.target.value })}
        />
      </label>
      <label>
        모델
        <input
          value={d.model ?? ""}
          onChange={(e) => set({ ...d, model: e.target.value })}
        />
      </label>
      <label>
        소속 대역
        <select
          value={d.segmentId ?? ""}
          onChange={(e) => set({ ...d, segmentId: e.target.value || null })}
        >
          <option value="">미소속 (코어 계층)</option>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {d.type === "custom" && (
        <label>
          사용자 정의 색상
          <input
            type="color"
            value={d.color || "#eeeeee"}
            onChange={(e) => set({ ...d, color: e.target.value })}
          />
        </label>
      )}
      <button className="primary" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
export function LinkForm({
  initial,
  onSave,
}: {
  initial: Link;
  onSave: (l: Link) => void;
}) {
  const [l, set] = useState(initial),
    [vlans, setVlans] = useState(initial.vlans?.join(",") ?? "");
  const values = vlans.trim()
    ? vlans.split(",").map((v) => Number(v.trim()))
    : [];
  const valid = values.every((v) => Number.isInteger(v) && v >= 1 && v <= 4094);
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ ...l, vlans: values });
      }}
    >
      <label>
        속도
        <input
          placeholder="1G / 10G"
          value={l.speed ?? ""}
          onChange={(e) => set({ ...l, speed: e.target.value })}
        />
      </label>
      <label>
        VLAN 태그 (쉼표 구분)
        <input value={vlans} onChange={(e) => setVlans(e.target.value)} />
      </label>
      {!valid && <p className="error">VLAN은 1–4094의 정수입니다</p>}
      <label className="check">
        <input
          type="checkbox"
          checked={l.vpn}
          onChange={(e) => set({ ...l, vpn: e.target.checked })}
        />
        VPN 터널
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={l.redundant}
          onChange={(e) => set({ ...l, redundant: e.target.checked })}
        />
        이중화 링크
      </label>
      <button className="primary" disabled={!valid}>
        변경 적용
      </button>
    </form>
  );
}
