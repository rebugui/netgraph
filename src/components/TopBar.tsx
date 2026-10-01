import { useState, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useProjectStore, projectSnapshot } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
import { layoutDiagram } from "../lib/layout";
import { download, fileName } from "../lib/download";
import { CsvImportModal } from "./CsvImportModal";
import { MetaModal } from "./MetaModal";
import { TemplateChoice } from "./TemplateChoice";
import { ExportMenu } from "./ExportMenu";
export function TopBar() {
  const s = useProjectStore(),
    ui = useUiStore(),
    flow = useReactFlow(),
    input = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState<"csv" | "meta" | "new" | null>(null);
  return (
    <>
      <header className="topbar">
        <b>NetGraph</b>
        <span className="top-title">{s.meta.docTitle}</span>
        <small>로컬 자동 저장</small>
        <button onClick={() => setModal("meta")}>문서 정보</button>
        <button onClick={() => setModal("csv")}>CSV 가져오기</button>
        <button
          onClick={() => {
            if (confirm("드래그 조정한 위치가 초기화됩니다")) {
              s.updateTab(
                layoutDiagram(s.tabs.find((t) => t.id === s.activeTabId)!),
              );
              setTimeout(() => void flow.fitView({ padding: 0.15 }), 100);
            }
          }}
        >
          자동 배치
        </button>
        <ExportMenu />
        <button
          onClick={() => {
            const p = projectSnapshot();
            download(
              new Blob([JSON.stringify(p, null, 2)], {
                type: "application/json",
              }),
              fileName(p, "백업", "json"),
            );
          }}
        >
          JSON 백업 저장
        </button>
        <button onClick={() => input.current?.click()}>JSON 불러오기</button>
        <button
          onClick={() => {
            if (
              confirm(
                "현재 프로젝트가 초기화됩니다. 필요한 경우 JSON 백업을 먼저 저장하세요.",
              )
            )
              setModal("new");
          }}
        >
          새 프로젝트
        </button>
        <input
          hidden
          ref={input}
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              s.replaceProject(JSON.parse(await file.text()));
              ui.select(null);
              ui.notify("프로젝트를 복원했습니다");
              setTimeout(() => void flow.fitView({ padding: 0.15 }), 100);
            } catch (error) {
              ui.notify(
                error instanceof Error ? error.message : "JSON 복원 실패",
              );
            }
          }}
        />
      </header>
      {modal === "csv" && <CsvImportModal onClose={() => setModal(null)} />}{" "}
      {modal === "meta" && <MetaModal onClose={() => setModal(null)} />}{" "}
      {modal === "new" && (
        <TemplateChoice
          title="새 프로젝트"
          onClose={() => setModal(null)}
          onChoose={(template) => {
            s.resetProject(template);
            ui.select(null);
            setModal(null);
          }}
        />
      )}
    </>
  );
}
