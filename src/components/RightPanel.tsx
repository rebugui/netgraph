import { useProjectStore } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
import { DeviceForm, SegmentForm, LinkForm } from "./Forms";
import { Warnings } from "./Warnings";
import { IpCalculator } from "./IpCalculator";
export function RightPanel() {
  const s = useProjectStore(),
    tab = s.tabs.find((t) => t.id === s.activeTabId)!,
    ui = useUiStore();
  const d = tab.devices.find((d) => d.id === ui.selected),
    seg = tab.segments.find((n) => n.id === ui.selected),
    link = tab.links.find((l) => l.id === ui.selected);
  const saved = () => ui.notify("변경 사항을 적용했습니다");
  return (
    <aside className="right panel">
      <section>
        <h2>선택 정보</h2>
        {d ? (
          <DeviceForm
            key={d.id}
            initial={d}
            segments={tab.segments}
            submitLabel="변경 적용"
            onSave={(value) => {
              const { x: _, y: __, ...patch } = value;
              s.updateDevice(d.id, patch);
              saved();
            }}
          />
        ) : seg ? (
          <SegmentForm
            key={seg.id}
            initial={seg}
            submitLabel="변경 적용"
            onSave={(value) => {
              const { x: _, y: __, w: ___, h: ____, ...patch } = value;
              s.updateSegment(seg.id, patch);
              saved();
            }}
          />
        ) : link ? (
          <LinkForm
            key={link.id}
            initial={link}
            onSave={(value) => {
              s.updateLink(link.id, value);
              saved();
            }}
          />
        ) : (
          <div className="empty">
            캔버스에서 장비, 대역 또는
            <br />
            링크를 선택하세요.
          </div>
        )}
        {(d || seg || link) && (
          <button
            className="danger"
            onClick={() => {
              if (d) s.removeDevice(d.id);
              if (seg) s.removeSegment(seg.id);
              if (link) s.removeLink(link.id);
              ui.select(null);
            }}
          >
            선택 항목 삭제
          </button>
        )}
      </section>
      <Warnings />
      <IpCalculator />
    </aside>
  );
}
