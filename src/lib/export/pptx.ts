import PptxGenJS from "pptxgenjs";
import type { Project, DiagramTab, Link, Segment } from "../../types";
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
  const views: { sourceTab: DiagramTab; tab: DiagramTab; segment: Segment | null }[] =
    tabs.flatMap((sourceTab) => [
      { sourceTab, tab: sourceTab, segment: null },
      ...sourceTab.segments.map((segment) => {
        const devices = sourceTab.devices.filter((d) => d.segmentId === segment.id),
          ids = new Set([segment.id, ...devices.map((d) => d.id)]);
        return {
          sourceTab,
          segment,
          tab: {
            ...sourceTab,
            segments: [segment],
            devices,
            links: sourceTab.links.filter((l) => ids.has(l.from) && ids.has(l.to)),
          },
        };
      }),
    ]);
  for (const { sourceTab, tab, segment } of views) {
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
        ["장 이름", segment ? `${tab.name} · ${segment.name} 상세` : tab.name, "버전", m.version, "작성일", m.date],
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
    if (segment) {
      slide.addText(`${segment.name} 상세 · 대역 밖 연결은 전체 구성도 참조`, {
        x: 0.3, y: 1.12, w: 12.7, h: 0.16,
        fontSize: 9, color: "53627A", margin: 0,
      });
    }
    const b = contentBounds(tab),
      legend = segment
        ? { ...legendBox(tab), x: b.x + b.w + 40, y: b.y }
        : legendBox(tab),
      bw = Math.max(b.w, legend.x + legend.w - b.x),
      bh = Math.max(b.h, legend.y + legend.h - b.y),
      scale = Math.min(12.73 / bw, 5.9 / bh),
      font = Math.min(10, 10 * scale * 72),
      left = segment ? 0.3 + (12.73 - bw * scale) / 2 : 0.3;
    const X = (x: number) => left + (x - b.x) * scale,
      Y = (y: number) => 1.3 + (y - b.y) * scale;
    for (const s of tab.segments) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: X(s.x),
        y: Y(s.y),
        w: s.w * scale,
        h: s.h * scale,
        rectRadius: 0.05,
        fill: { color: segmentColors[sourceTab.segments.indexOf(s) % segmentColors.length].slice(1) },
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
    const occupied: { x: number; y: number; w: number; h: number }[] = [
      ...tab.devices.map((d) => absoluteDevice(d, tab)),
      { ...legend },
    ];
    const overlaps = (
      x: number,
      y: number,
      w: number,
      h: number,
      margin: number,
    ) =>
      occupied.reduce(
        (sum: number, other: { x: number; y: number; w: number; h: number }) =>
          sum +
          Math.max(
            0,
            Math.min(x + w, other.x + other.w + margin) -
              Math.max(x, other.x - margin),
          ) *
            Math.max(
              0,
              Math.min(y + h, other.y + other.h + margin) -
                Math.max(y, other.y - margin),
            ),
        0,
      );
    const labelOffsets = [-132, -112, -84, -56, -28, 0, 28, 56, 84, 112, 132]
      .flatMap((dx) =>
        [-120, -100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100, 120].map(
          (dy) => [dx, dy] as [number, number],
        ),
      )
      .sort((p, q) => Math.abs(p[0]) + Math.abs(p[1]) - Math.abs(q[0]) - Math.abs(q[1]));
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
      if (label) {
        const labelW = Math.min(1.2, Math.max(48, label.length * 10) * scale),
          labelH = Math.min(0.16, 30 * scale),
          w = labelW / scale,
          h = labelH / scale,
          mx = (a.x + z.x) / 2,
          my = (a.y + z.y) / 2;
        const box = { x: mx - w / 2, y: my - h / 2, w, h };
        let best = { x: box.x, y: box.y, cost: Infinity };
        for (const [dx, dy] of labelOffsets) {
          const x = Math.max(
              b.x,
              Math.min(mx + dx - w / 2, legend.x + legend.w - w),
            ),
            y = Math.max(b.y, Math.min(my + dy - h / 2, b.y + bh - h)),
            cost = overlaps(x, y, w, h, 4);
          if (cost === 0) {
            best = { x, y, cost };
            break;
          }
          if (cost < best.cost) best = { x, y, cost };
        }
        box.x = best.x;
        box.y = best.y;
        occupied.push(box);
        slide.addText(label, {
          x: X(box.x),
          y: Y(box.y),
          w: labelW,
          h: labelH,
          fontSize: font,
          align: "center",
          fill: { color: "FFFFFF" },
          margin: 0,
          fit: "shrink",
        });
      }
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
