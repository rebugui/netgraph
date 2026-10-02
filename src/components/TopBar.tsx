import { useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useProjectStore, projectSnapshot } from "../store/useProjectStore";
import { undo, redo } from "../store/projectHistory";
import { useUiStore } from "../store/useUiStore";
import { useCompactLayout } from "../hooks/useCompactLayout";
import { layoutDiagram } from "../lib/layout";
import { download, fileName } from "../lib/download";
import { CsvImportModal } from "./CsvImportModal";
import { MetaModal } from "./MetaModal";
import { TemplateChoice } from "./TemplateChoice";
import { ExportMenu } from "./ExportMenu";

export function TopBar() {
  const s = useProjectStore(), ui = useUiStore(), flow = useReactFlow();
  const compact = useCompactLayout();
  const input = useRef<HTMLInputElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"csv" | "meta" | "new" | null>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); } };
    const onPointer = (event: PointerEvent) => { if (!header.current?.contains(event.target as Node)) setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onPointer); };
  }, [menuOpen]);
  const openModal = (value: "csv" | "meta" | "new") => {
    if (compact) menuButton.current?.focus();
    setMenuOpen(false);
    setModal(value);
  };
  const historyAction = (action: "undo" | "redo") => {
    const changed = action === "undo" ? undo() : redo();
    if (changed) ui.select(null);
    ui.notify(changed ? action === "undo" ? "실행을 취소했습니다" : "다시 실행했습니다" : action === "undo" ? "취소할 작업이 없습니다" : "다시 실행할 작업이 없습니다");
  };
  return (
    <>
      <header ref={header} className="topbar">
        <div className="topbar-main">
          <b>NetGraph</b>
          {compact && <>
            <button onClick={() => historyAction("undo")}>실행 취소</button>
            <button onClick={() => historyAction("redo")}>다시 실행</button>
            <button ref={menuButton} aria-expanded={menuOpen} aria-controls="topbar-actions" onClick={() => setMenuOpen(!menuOpen)}>메뉴</button>
          </>}
        </div>
        <div id="topbar-actions" className={`topbar-actions${compact && !menuOpen ? " collapsed" : ""}`}
          role="region" aria-label="프로젝트 작업" inert={compact && !menuOpen}>
          <span className="top-title">{s.meta.docTitle}</span>
          <small>{ui.saveStatus === "saved" && ui.storageStatus !== "unavailable" ? "로컬 자동 저장" : "JSON 백업을 저장하세요"}</small>
          <button onClick={() => openModal("meta")}>문서 정보</button>
          <button onClick={() => openModal("csv")}>CSV 가져오기</button>
          <button onClick={() => {
            if (confirm("드래그 조정한 위치가 초기화됩니다")) {
              s.updateTab(layoutDiagram(s.tabs.find((tab) => tab.id === s.activeTabId)!));
              setTimeout(() => void flow.fitView({ padding: 0.15 }), 100);
            }
          }}>자동 배치</button>
          <ExportMenu />
          <button onClick={() => {
            const project = projectSnapshot();
            download(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), fileName(project, "백업", "json"));
          }}>JSON 백업 저장</button>
          <button onClick={() => { if (compact) menuButton.current?.focus(); setMenuOpen(false); input.current?.click(); }}>JSON 불러오기</button>
          <button onClick={() => {
            if (confirm("현재 프로젝트가 초기화됩니다. 필요한 경우 JSON 백업을 먼저 저장하세요.")) openModal("new");
          }}>새 프로젝트</button>
        </div>
        <input hidden ref={input} type="file" accept=".json,application/json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            try {
              s.replaceProject(JSON.parse(await file.text()));
              ui.select(null);
              ui.notify("프로젝트를 복원했습니다");
              setTimeout(() => void flow.fitView({ padding: 0.15 }), 100);
            } catch (error) {
              ui.notify(error instanceof Error ? error.message : "JSON 복원 실패");
            }
          }} />
      </header>
      {modal === "csv" && <CsvImportModal onClose={() => setModal(null)} />}
      {modal === "meta" && <MetaModal onClose={() => setModal(null)} />}
      {modal === "new" && <TemplateChoice title="새 프로젝트" onClose={() => setModal(null)}
        onChoose={(template) => { s.resetProject(template); ui.select(null); setModal(null); }} />}
    </>
  );
}
