import { useState } from "react";
import { projectSnapshot } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
type Format = "pptx-current" | "pptx-all" | "png" | "svg" | "pdf";
export function ExportMenu() {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const notify = useUiStore((s) => s.notify);
  async function run(format: Format) {
    setOpen(false);
    setBusy(true);
    try {
      const p = projectSnapshot();
      if (format.startsWith("pptx")) {
        const { exportPptx } = await import("../lib/export/pptx");
        await exportPptx(p, format === "pptx-all" ? "all" : p.activeTabId);
      } else if (format === "pdf") {
        const { exportPdf } = await import("../lib/export/pdf");
        await exportPdf(p);
      } else {
        const { exportImage } = await import("../lib/export/image");
        await exportImage(p, format as "png" | "svg");
      }
      notify("내보내기가 완료되었습니다");
    } catch (e) {
      notify(`내보내기 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="export-menu">
      <button disabled={busy} onClick={() => setOpen(!open)}>
        {busy ? "내보내는 중…" : "내보내기 ▾"}
      </button>
      {open && (
        <div className="dropdown">
          {(
            [
              ["pptx-current", "PPTX (현재 장)"],
              ["pptx-all", "PPTX (전체 장)"],
              ["png", "PNG"],
              ["svg", "SVG"],
              ["pdf", "PDF (전체 장)"],
            ] as const
          ).map(([format, label]) => (
            <button key={format} onClick={() => void run(format)}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
