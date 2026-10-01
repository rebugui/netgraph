import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "./components/Canvas";
import { LeftPanel } from "./components/LeftPanel";
import { RightPanel } from "./components/RightPanel";
import { TopBar } from "./components/TopBar";
import { Toast } from "./components/Toast";
import { DiagramTabs } from "./components/DiagramTabs";
import { TemplateChoice } from "./components/TemplateChoice";
import { useProjectStore } from "./store/useProjectStore";
import { HistoryShortcuts } from "./components/HistoryShortcuts";
import "./styles.css";
export default function App() {
  const [welcome, setWelcome] = useState(
    () => !localStorage.getItem("netgraph-project-v1"),
  );
  return (
    <ReactFlowProvider>
      <div className="app">
        <HistoryShortcuts />
        <TopBar />
        <DiagramTabs />
        <div className="workspace">
          <LeftPanel />
          <Canvas />
          <RightPanel />
        </div>
        <Toast />
        {welcome && (
          <TemplateChoice
            title="NetGraph 시작하기"
            onClose={() => setWelcome(false)}
            onChoose={(template) => {
              useProjectStore.getState().resetProject(template);
              setWelcome(false);
            }}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}
