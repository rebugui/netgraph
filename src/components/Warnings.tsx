import { useMemo } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
import { validate } from "../lib/validate";
export function Warnings() {
  const tab = useProjectStore((s) =>
    s.tabs.find((t) => t.id === s.activeTabId)!,
  );
  const warnings = useMemo(() => validate(tab), [tab]),
    focus = useUiStore((s) => s.focus);
  return (
    <section className="warnings">
      <h2>
        검증 경고 <span className="count">{warnings.length}</span>
      </h2>
      {warnings.length ? (
        <div className="item-list">
          {warnings.map((w, i) => (
            <button
              className={w.level}
              key={i}
              onClick={() => focus((w.deviceId ?? w.segmentId)!)}
            >
              {w.level === "error"
                ? "오류"
                : w.level === "warn"
                  ? "주의"
                  : "안내"}{" "}
              · {w.message}
            </button>
          ))}
        </div>
      ) : (
        <p className="preview">검증 완료 · 경고 없음</p>
      )}
    </section>
  );
}
