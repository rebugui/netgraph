import { useEffect, useRef } from "react";
import { useCompactLayout } from "../hooks/useCompactLayout";
import { useUiStore } from "../store/useUiStore";
import { LeftPanel } from "./LeftPanel";
import { Canvas } from "./Canvas";
import { RightPanel } from "./RightPanel";

type Panel = "canvas" | "left" | "right";
const panels: { id: Panel; label: string }[] = [
  { id: "canvas", label: "도면" },
  { id: "left", label: "목록·추가" },
  { id: "right", label: "속성·검토" },
];

export function ResponsiveWorkspace() {
  const compact = useCompactLayout();
  const active = useUiStore((state) => state.mobilePanel);
  const setPanel = useUiStore((state) => state.setMobilePanel);
  const regions = useRef<Record<Panel, HTMLDivElement | null>>({ canvas: null, left: null, right: null });
  const buttons = useRef<Record<Panel, HTMLButtonElement | null>>({ canvas: null, left: null, right: null });

  useEffect(() => {
    if (!compact) return;
    const focused = document.activeElement;
    if (focused && panels.some(({ id }) => id !== active && regions.current[id]?.contains(focused)))
      buttons.current[active]?.focus();
  }, [active, compact]);

  return (
    <>
      <nav className="mobile-nav" aria-label="편집 화면" hidden={!compact}>
        {panels.map(({ id, label }) => (
          <button key={id} ref={(element) => { buttons.current[id] = element; }}
            aria-pressed={active === id} aria-controls={`workspace-${id}`}
            onClick={() => setPanel(id)}>{label}</button>
        ))}
      </nav>
      <div className={`workspace${compact ? " compact" : ""}`}>
        {panels.map(({ id }) => (
          <div key={id} id={`workspace-${id}`} className={`workspace-region region-${id}${compact && active !== id ? " inactive" : ""}`}
            ref={(element) => { regions.current[id] = element; }} inert={compact && active !== id}>
            {id === "left" ? <LeftPanel /> : id === "canvas" ? <Canvas /> : <RightPanel />}
          </div>
        ))}
      </div>
    </>
  );
}
