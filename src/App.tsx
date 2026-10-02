import { useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { ResponsiveWorkspace } from "./components/ResponsiveWorkspace";
import { TopBar } from "./components/TopBar";
import { Toast } from "./components/Toast";
import { DiagramTabs } from "./components/DiagramTabs";
import { TemplateChoice } from "./components/TemplateChoice";
import { useProjectStore, projectSnapshot } from "./store/useProjectStore";
import { useUiStore } from "./store/useUiStore";
import { HistoryShortcuts } from "./components/HistoryShortcuts";
import { registerStorageEvents, unlockStorage } from "./lib/projectStorage";
import { download, fileName } from "./lib/download";
import "./styles.css";

function backupCurrent(): void {
  const project = projectSnapshot();
  download(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), fileName(project, "백업", "json"));
}

export default function App() {
  const storageStatus = useUiStore((state) => state.storageStatus);
  const saveStatus = useUiStore((state) => state.saveStatus);
  const rawBackup = useUiStore((state) => state.rawBackup);
  const [welcome, setWelcome] = useState(() => useUiStore.getState().storageStatus === "empty");
  const allowReload = useRef(false);
  useEffect(() => registerStorageEvents(), []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (allowReload.current || !["saving", "failed", "conflict", "unsupported"].includes(useUiStore.getState().saveStatus)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  if (storageStatus === "blocked") {
    return (
      <div className="recovery-screen">
        <section className="recovery">
          <h1>저장된 프로젝트를 열 수 없습니다</h1>
          <p>원본 데이터를 보호하기 위해 자동 저장을 중지했습니다. 원문을 먼저 내려받아 보관하세요.</p>
          <div className="recovery-actions">
            <button onClick={() => {
              if (rawBackup !== null) download(new Blob([rawBackup], { type: "application/json" }), "netgraph-원본-백업.json");
            }}>원문 JSON 백업</button>
            <button onClick={() => {
              if (!confirm("저장된 데이터를 초기화하고 빈 프로젝트를 시작할까요? 원본 JSON을 먼저 백업하세요.")) return;
              unlockStorage();
              useProjectStore.getState().resetProject(false);
              setWelcome(false);
            }}>확인 후 빈 프로젝트 시작</button>
          </div>
        </section>
      </div>
    );
  }
  return (
    <ReactFlowProvider>
      <div className="app">
        <HistoryShortcuts />
        <TopBar />
        {saveStatus !== "saved" && (
          <div className="storage-banner" role={saveStatus === "saving" ? "status" : "alert"}>
            <span>{saveStatus === "conflict" ? "다른 탭에서 데이터가 변경되었습니다. 이 탭의 자동 저장을 중지했습니다." :
              saveStatus === "failed" ? "자동 저장 실패 — JSON 백업을 저장하세요" :
              saveStatus === "unsupported" ? "이 브라우저에서는 안전한 자동 저장을 사용할 수 없습니다 — JSON 백업을 저장하세요" : "저장 중…"}</span>
            {saveStatus !== "saving" && <button onClick={backupCurrent}>현재 편집 JSON 백업</button>}
            {saveStatus === "conflict" && <button onClick={() => {
              if (!confirm("현재 편집 내용을 백업했나요? 저장된 최신 내용을 불러오면 이 탭의 미저장 편집이 사라집니다.")) return;
              allowReload.current = true;
              window.location.reload();
            }}>최신 내용 다시 불러오기</button>}
          </div>
        )}
        <DiagramTabs />
        <ResponsiveWorkspace />
        <Toast />
        {welcome && <TemplateChoice title="NetGraph 시작하기" onClose={() => setWelcome(false)}
          onChoose={(template) => {
            useProjectStore.getState().resetProject(template);
            setWelcome(false);
          }} />}
      </div>
    </ReactFlowProvider>
  );
}
