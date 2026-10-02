import { useState } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
import { TemplateChoice } from "./TemplateChoice";
import { Modal } from "./Modal";
import type { DiagramTab } from "../types";
import { useCompactLayout } from "../hooks/useCompactLayout";
export function DiagramTabs() {
  const s = useProjectStore(),
    select = useUiStore((s) => s.select);
  const compact = useCompactLayout();
  const [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<{
      id: string;
      name: string;
      kind: DiagramTab["kind"];
    } | null>(null),
    [context, setContext] = useState<{
      id: string;
      x: number;
      y: number;
    } | null>(null);
  return (
    <>
      <nav className="diagram-tabs" aria-label="구성도 탭">
        {s.tabs.map((t) => (
          <div
            key={t.id}
            className={`tab ${s.activeTabId === t.id ? "active" : ""}`}
            onContextMenu={(e) => {
              e.preventDefault();
              setContext({ id: t.id, x: e.clientX, y: e.clientY });
            }}
          >
            <button
              onClick={() => {
                s.setActiveTab(t.id);
                select(null);
              }}
              onDoubleClick={() =>
                setEditing({ id: t.id, name: t.name, kind: t.kind })
              }
            >
              <span>{t.kind}</span>
              {t.name}
            </button>
            <button
              aria-label={`${t.name} 삭제`}
              disabled={s.tabs.length === 1}
              onClick={() => {
                s.removeTab(t.id);
                select(null);
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          className="add-tab"
          aria-label="구성도 추가"
          onClick={() => setAdding(true)}
        >
          ＋
        </button>
        {compact && <button className="tab-actions" onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setContext({ id: s.activeTabId, x: rect.left, y: rect.bottom });
        }}>현재 장 작업</button>}
        <span className="tabs-hint">더블클릭: 이름 · 우클릭: 복제</span>
      </nav>
      {adding && (
        <TemplateChoice
          title="새 구성도"
          onClose={() => setAdding(false)}
          onChoose={(template) => {
            s.addTab(template);
            select(null);
            setAdding(false);
          }}
        />
      )}
      {editing && (
        <Modal title="구성도 이름 · 구분" onClose={() => setEditing(null)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              s.renameTab(editing.id, editing.name, editing.kind);
              setEditing(null);
            }}
          >
            <label>
              장 이름
              <input
                required
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <label>
              구분
              <select
                value={editing.kind}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    kind: e.target.value as DiagramTab["kind"],
                  })
                }
              >
                {["물리", "논리", "기타"].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <button className="primary">이름 적용</button>
          </form>
        </Modal>
      )}
      {context && (
        <div className="context-backdrop" onClick={() => setContext(null)}>
          <div
            className="context-menu"
            style={{
              left: Math.min(context.x, window.innerWidth - 150),
              top: context.y,
            }}
          >
            <button
              onClick={() => {
                s.dupTab(context.id);
                select(null);
              }}
            >
              구성도 복제
            </button>
            <button
              onClick={() => {
                const t = s.tabs.find((t) => t.id === context.id)!;
                setEditing({ id: t.id, name: t.name, kind: t.kind });
              }}
            >
              이름 · 구분 변경
            </button>
          </div>
        </div>
      )}
    </>
  );
}
