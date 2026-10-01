import PptxGenJS from "pptxgenjs";
import type { Project, DiagramTab, Link } from "../../types";
import { deviceTypes, segmentColors } from "../deviceTypes";
import { absoluteDevice, contentBounds, legendBox } from "../geometry";
import { fileName } from "../download";
function endpoint(
  tab: DiagramTab,
  id: string,
  handle: string | null | undefined,
) {
  const d = tab.devices.find((d) => d.id === id),
    seg = tab.segments.find((s) => s.id === id);
  const b = d ? absoluteDevice(d, tab) : seg;
  if (!b) return null;
  switch (handle ?? (seg ? "top" : "bottom")) {
    case "top":
      return { x: b.x + b.w / 2, y: b.y };
    case "left":
      return { x: b.x, y: b.y + b.h / 2 };
    case "right":
      return { x: b.x + b.w, y: b.y + b.h / 2 };
    default:
      return { x: b.x + b.w / 2, y: b.y + b.h };
  }
}
export async function exportPptx(project: Project, tabId: string | "all") {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "NETGRAPH", width: 13.33, height: 7.5 });
  pptx.layout = "NETGRAPH";
  pptx.author = project.meta.author;
  pptx.subject = "네트워크 구성도";
  pptx.title = project.meta.docTitle;
  pptx.theme = { headFontFace: "Malgun Gothic", bodyFontFace: "Malgun Gothic" };
  const tabs =
    tabId === "all" ? project.tabs : project.tabs.filter((t) => t.id === tabId);
  if (!tabs.length) throw new Error("내보낼 장을 찾을 수 없습니다");
  for (const tab of tabs) {
    const slide = pptx.addSlide(),
      m = project.meta;
    slide.addText(m.docTitle, {
      x: 0.3,
      y: 0.15,
      w: 12.7,
      h: 0.36,
      fontSize: 20,
      bold: true,
      color: "132E54",
      margin: 0,
    });
    slide.addTable(
      [
        ["장 이름", tab.name, "버전", m.version, "작성일", m.date],
        [
          "작성자",
          m.author || "—",
          "검토자",
          m.reviewer || "—",
          "구분",
          tab.kind,
        ],
      ].map((row) => row.map((text) => ({ text }))),
      {
        x: 0.3,
        y: 0.6,
        w: 12.73,
        h: 0.5,
        fontSize: 9,
        border: { pt: 0.5, color: "BCCBDF" },
        fill: { color: "F3F6FA" },
        margin: 0.04,
        rowH: 0.25,
        colW: [0.8, 4.8, 0.7, 2, 0.8, 3.63],
      },
    );
    const b = contentBounds(tab),
      legend = legendBox(tab),
      bw = Math.max(b.w, legend.x + legend.w - b.x),
      bh = Math.max(b.h, legend.y + legend.h - b.y),
      scale = Math.min(12.73 / bw, 5.9 / bh),
      font = Math.min(10, Math.max(6, Math.round(10 * scale * 96)));
    const X = (x: number) => 0.3 + (x - b.x) * scale,
      Y = (y: number) => 1.3 + (y - b.y) * scale;
    for (const [i, s] of tab.segments.entries()) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: X(s.x),
        y: Y(s.y),
        w: s.w * scale,
        h: s.h * scale,
        rectRadius: 0.05,
        fill: { color: segmentColors[i % segmentColors.length].slice(1) },
        line: { color: "8BA2BF", width: 0.7 },
      });
      slide.addText(
        `${s.vlan ? `VLAN ${s.vlan} · ` : ""}${s.name} · ${s.cidr}${s.gateway ? ` · GW ${s.gateway}` : ""}`,
        {
          x: X(s.x + 8),
          y: Y(s.y + 5),
          w: (s.w - 16) * scale,
          h: 40 * scale,
          fontSize: font,
          bold: true,
          margin: 0,
          breakLine: false,
          fit: "shrink",
        },
      );
    }
    const line = (
      a: { x: number; y: number },
      b: { x: number; y: number },
      l: Pick<Link, "vpn" | "redundant">,
    ) => {
      const dx = b.x - a.x,
        dy = b.y - a.y,
        len = Math.hypot(dx, dy) || 1;
      for (const offset of l.redundant ? [-2.5, 2.5] : [0]) {
        const ox = (-dy / len) * offset,
          oy = (dx / len) * offset;
        slide.addShape(pptx.ShapeType.line, {
          x: X(Math.min(a.x, b.x) + ox),
          y: Y(Math.min(a.y, b.y) + oy),
          w: Math.abs(dx) * scale,
          h: Math.abs(dy) * scale,
          flipH: dx < 0,
          flipV: dy < 0,
          line: {
            color: l.vpn ? "7D3C98" : "404040",
            width: 1,
            dashType: l.vpn ? "dash" : "solid",
          },
        });
      }
    };
    for (const l of tab.links) {
      const a = endpoint(tab, l.from, l.sourceHandle),
        z = endpoint(tab, l.to, l.targetHandle ?? "top");
      if (!a || !z) continue;
      line(a, z, l);
      const label = [
        l.vpn ? "🔒 VPN" : "",
        l.speed,
        l.vlans?.length ? `VLAN ${l.vlans.join(",")}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      if (label)
        slide.addText(label, {
          x: X((a.x + z.x) / 2) - 0.6,
          y: Y((a.y + z.y) / 2) - 0.08,
          w: 1.2,
          h: 0.16,
          fontSize: font,
          align: "center",
          fill: { color: "FFFFFF" },
          margin: 0,
          fit: "shrink",
        });
    }
    for (const d of tab.devices) {
      const box = absoluteDevice(d, tab),
        s = deviceTypes[d.type];
      slide.addShape(s.pptxShape as PptxGenJS.ShapeType, {
        x: X(box.x),
        y: Y(box.y),
        w: s.w * scale,
        h: s.h * scale,
        fill: { color: (d.color || s.fill).replace("#", "") },
        line: {
          color: s.line.slice(1),
          width: 0.7,
          dashType: d.type === "cloud" ? "dash" : "solid",
        },
      });
      slide.addText(
        [d.name, d.ip, d.hostName, d.model].filter(Boolean).join("\n"),
        {
          x: X(box.x + 5),
          y: Y(box.y + 5),
          w: (s.w - 10) * scale,
          h: (s.h - 10) * scale,
          fontSize: font,
          align: "center",
          valign: "middle",
          margin: 0,
          fit: "shrink",
          color: "172B4D",
        },
      );
    }
    slide.addShape(pptx.ShapeType.roundRect, {
      x: X(legend.x),
      y: Y(legend.y),
      w: legend.w * scale,
      h: legend.h * scale,
      fill: { color: "FFFFFF" },
      line: { color: "BCCBDF", width: 0.5 },
    });
    slide.addText("범례", {
      x: X(legend.x + 10),
      y: Y(legend.y + 6),
      w: legend.w * scale - 0.05,
      h: 18 * scale,
      fontSize: font,
      bold: true,
      margin: 0,
    });
    const types = [...new Set(tab.devices.map((d) => d.type))];
    types.forEach((type, i) => {
      const s = deviceTypes[type],
        x = legend.x + 10 + (i % 2) * 125,
        y = legend.y + 30 + Math.floor(i / 2) * 24;
      slide.addShape(s.pptxShape as PptxGenJS.ShapeType, {
        x: X(x),
        y: Y(y),
        w: 17 * scale,
        h: 12 * scale,
        fill: { color: s.fill.slice(1) },
        line: { color: s.line.slice(1), width: 0.5 },
      });
      slide.addText(s.label, {
        x: X(x + 22),
        y: Y(y),
        w: 100 * scale,
        h: 16 * scale,
        fontSize: font,
        margin: 0,
        fit: "shrink",
      });
    });
    const ly = legend.y + legend.h - 22;
    for (const [i, label] of ["일반", "이중화", "VPN"].entries()) {
      const x = legend.x + 10 + i * 82;
      line(
        { x, y: ly + 5 },
        { x: x + 20, y: ly + 5 },
        { vpn: i === 2, redundant: i === 1 },
      );
      slide.addText(label, {
        x: X(x + 25),
        y: Y(ly),
        w: 50 * scale,
        h: 15 * scale,
        fontSize: font,
        margin: 0,
        fit: "shrink",
      });
    }
  }
  const history = pptx.addSlide();
  history.addText("변경이력", {
    x: 0.4,
    y: 0.3,
    w: 12,
    h: 0.5,
    fontSize: 24,
    bold: true,
    color: "132E54",
  });
  history.addTable(
    [
      ["버전", "일자", "작성자", "변경 내용"],
      ...(project.revisions.length
        ? project.revisions.map((r) => [r.version, r.date, r.author, r.desc])
        : [["—", "—", "—", "등록된 변경이력이 없습니다"]]),
    ].map((row) => row.map((text) => ({ text }))),
    {
      x: 0.4,
      y: 1,
      w: 12.5,
      colW: [1, 1.4, 1.4, 8.7],
      fontSize: 11,
      border: { pt: 0.5, color: "BCCBDF" },
      margin: 0.08,
      autoPage: true,
      autoPageRepeatHeader: true,
      autoPageSlideStartY: 0.5,
    },
  );
  await pptx.writeFile({
    fileName: fileName(
      project,
      tabId === "all" ? "전체" : tabs[0].name,
      "pptx",
    ),
  });
}
