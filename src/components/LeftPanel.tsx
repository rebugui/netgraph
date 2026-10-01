import { useState } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
import { deviceTypes } from "../lib/deviceTypes";
import { DeviceForm, SegmentForm } from "./Forms";
import { nextDevicePosition, nextSegmentPosition } from "../lib/layout";
export function LeftPanel() {
  const state = useProjectStore(),
    tab = state.tabs.find((t) => t.id === state.activeTabId)!,
    ui = useUiStore();
  const [mode, setMode] = useState("대역"),
    [generation, reset] = useState(0);
  return (
    <aside className="left panel">
      <div className="panel-heading">
        <h2>구성 요소</h2>
        <span className="count">{tab.devices.length} 장비</span>
      </div>
      <div className="switcher">
        {["대역", "장비", "링크"].map((m) => (
          <button
            className={mode === m ? "active" : ""}
            key={m}
            onClick={() => setMode(m)}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="panel-content">
        {mode === "대역" ? (
          <>
            <div className="item-list">
              {tab.segments.map((s) => (
                <button
                  key={s.id}
                  onClick={() => ui.focus(s.id)}
                  className={ui.selected === s.id ? "selected" : ""}
                >
                  <strong>{s.name}</strong>
                  <small>
                    {s.vlan ? `VLAN ${s.vlan} · ` : ""}
                    {s.cidr}
                  </small>
                </button>
              ))}
            </div>
            <h3>새 대역</h3>
            <SegmentForm
              key={`${tab.id}-${generation}`}
              onSave={(s) => {
                ui.select(
                  state.addSegment({
                    ...s,
                    ...nextSegmentPosition(tab),
                  }),
                );
                reset(generation + 1);
                ui.notify("대역을 추가했습니다");
              }}
            />
          </>
        ) : mode === "장비" ? (
          <>
            <details>
              <summary>장비 팔레트 · 캔버스로 드래그</summary>
              <div className="palette">
                {Object.entries(deviceTypes).map(([id, s]) => (
                  <div
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("application/netgraph", id)
                    }
                    key={id}
                    style={{ borderLeftColor: s.fill }}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
            </details>
            <div className="item-list">
              {tab.devices.map((d) => (
                <button
                  key={d.id}
                  onClick={() => ui.focus(d.id)}
                  className={ui.selected === d.id ? "selected" : ""}
                >
                  <strong>{d.name}</strong>
                  <small>
                    {deviceTypes[d.type].label} · {d.ip || "IP 없음"}
                  </small>
                  <em>
                    {tab.segments.find((s) => s.id === d.segmentId)?.name ??
                      "미소속"}
                  </em>
                </button>
              ))}
            </div>
            <h3>새 장비</h3>
            <DeviceForm
              key={`${tab.id}-${generation}`}
              segments={tab.segments}
              onSave={(d) => {
                ui.select(
                  state.addDevice({
                    ...d,
                    ...nextDevicePosition(tab, d.segmentId),
                  }),
                );
                reset(generation + 1);
                ui.notify("장비를 추가했습니다");
              }}
            />
          </>
        ) : (
          <>
            <p className="muted">캔버스의 연결점을 드래그해 링크를 만듭니다.</p>
            <div className="item-list">
              {tab.links.map((l) => (
                <button key={l.id} onClick={() => ui.select(l.id)}>
                  <strong>
                    {[l.from, l.to]
                      .map(
                        (id) =>
                          [...tab.devices, ...tab.segments].find(
                            (n) => n.id === id,
                          )?.name,
                      )
                      .join(" ↔ ")}
                  </strong>
                  <small>
                    {l.speed || "속도 미지정"}
                    {l.vpn ? " · VPN" : ""}
                    {l.redundant ? " · 이중화" : ""}
                  </small>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
