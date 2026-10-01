import { useState, useMemo } from "react";
import { Modal } from "./Modal";
import { parseCsv, applyImport, csvTemplate } from "../lib/csvImport";
import { download } from "../lib/download";
import { useProjectStore } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
import { useReactFlow } from "@xyflow/react";
export function CsvImportModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const s = useProjectStore(),
    tab = s.tabs.find((t) => t.id === s.activeTabId)!,
    ui = useUiStore(),
    flow = useReactFlow();
  const result = useMemo(() => {
    try {
      return {
        rows: text.trim() ? parseCsv(text, tab.segments) : [],
        error: "",
      };
    } catch (e) {
      return { rows: [], error: String(e) };
    }
  }, [text, tab.segments]);
  return (
    <Modal title="장비 목록 가져오기" onClose={onClose}>
      <p className="muted">
        엑셀 표 또는 CSV/TSV를 붙여넣으세요. IP가 잘못된 행은 제외합니다.
      </p>
      <div className="modal-actions">
        <label>
          CSV / TSV 파일
          <input
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file)
                try {
                  setText(await file.text());
                } catch {
                  ui.notify("파일을 읽을 수 없습니다");
                }
            }}
          />
        </label>
        <button
          onClick={() =>
            download(
              new Blob(["\uFEFF" + csvTemplate], {
                type: "text/csv;charset=utf-8",
              }),
              "NetGraph_장비_입력양식.csv",
            )
          }
        >
          입력 양식 내려받기
        </button>
      </div>
      <label>
        장비 목록 붙여넣기
        <textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={csvTemplate}
        />
      </label>
      {result.error && <p className="error">{result.error}</p>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>행</th>
              <th>장비명</th>
              <th>IP</th>
              <th>대역</th>
              <th>검증 상태</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r) => (
              <tr key={r.row} className={r.valid ? "" : "error"}>
                <td>{r.row}</td>
                <td>{r.name}</td>
                <td>{r.ip}</td>
                <td>
                  {r.segmentStatus}
                  <br />
                  {r.cidr}
                </td>
                <td>
                  {r.valid ? "반영 가능" : "제외"}
                  {r.messages.map((m, i) => (
                    <div key={i}>{m}</div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="modal-actions">
        <span>
          {result.rows.filter((r) => r.valid).length}개 반영 ·{" "}
          {result.rows.filter((r) => !r.valid).length}개 제외
        </span>
        <button
          className="primary"
          disabled={!result.rows.some((r) => r.valid)}
          onClick={() => {
            s.updateTab(applyImport(tab, result.rows));
            ui.select(null);
            ui.notify(
              `${result.rows.filter((r) => r.valid).length}개 장비 반영, ${result.rows.filter((r) => !r.valid).length}개 제외`,
            );
            onClose();
            setTimeout(() => void flow.fitView({ padding: 0.15 }), 100);
          }}
        >
          반영
        </button>
      </div>
    </Modal>
  );
}
