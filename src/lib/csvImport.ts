import type { DeviceTypeId, DiagramTab, Segment } from "../types";
import { deviceTypes } from "./deviceTypes";
import { parseIPv4, parseCidr, maskToPrefix, cidrInfo } from "./ip";
import { layoutDiagram } from "./layout";
const aliases: Record<string, string[]> = {
  name: ["장비명", "이름", "name"],
  type: ["유형", "type"],
  ip: ["ip", "아이피"],
  mask: ["서브넷마스크", "마스크", "mask"],
  cidr: ["cidr", "대역"],
  hostName: ["호스트명", "hostname"],
  model: ["모델", "model"],
  segment: ["세그먼트명", "세그먼트", "segment"],
  vlan: ["vlan"],
  gateway: ["게이트웨이", "gateway"],
};
export const csvTemplate =
  "장비명,유형,IP,서브넷마스크,CIDR,호스트명,모델,세그먼트명,VLAN,게이트웨이\n업무서버,서버,192.168.20.10,255.255.255.0,,app01,Server,서버망,20,192.168.20.1";
export interface ImportRow {
  row: number;
  name: string;
  type: DeviceTypeId;
  ip: string;
  hostName: string;
  model: string;
  segmentName: string;
  cidr: string;
  vlan?: number;
  gateway: string;
  valid: boolean;
  messages: string[];
  segmentStatus: string;
}
function records(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("닫히지 않은 CSV 따옴표가 있습니다");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
const normalize = (s: string) =>
  s
    .replace(/^\uFEFF/, "")
    .replace(/\s/g, "")
    .toLowerCase();
export function parseCsv(text: string, segments: Segment[] = []): ImportRow[] {
  const rows = records(text, text.includes("\t") ? "\t" : ",");
  let header = -1;
  let cols: Record<string, number> = {};
  for (let i = 0; i < rows.length; i++) {
    const map: Record<string, number> = {};
    rows[i].forEach((v, j) => {
      for (const [k, names] of Object.entries(aliases))
        if (names.includes(normalize(v))) map[k] = j;
    });
    if (map.name !== undefined && Object.keys(map).length >= 2) {
      header = i;
      cols = map;
      break;
    }
  }
  if (header < 0)
    throw new Error("장비명과 유형/IP 등이 포함된 헤더를 찾을 수 없습니다");
  const planned = [...segments];
  return rows.slice(header + 1).map((cells, index) => {
    const get = (k: string) => cells[cols[k]] ?? "";
    const messages: string[] = [];
    let valid = true;
    const error = (m: string) => {
      valid = false;
      messages.push(m);
    };
    const name = get("name");
    if (!name) error("장비명 없음");
    const rawType = get("type");
    const type = (Object.entries(deviceTypes).find(
      ([id, s]) =>
        normalize(id) === normalize(rawType) ||
        normalize(s.label) === normalize(rawType),
    )?.[0] ?? "custom") as DeviceTypeId;
    if (
      type === "custom" &&
      !["custom", "사용자정의"].includes(normalize(rawType))
    )
      messages.push(`유형 미인식: ${rawType || "(빈 값)"} → 사용자 정의`);
    const rawIp = get("ip"),
      ipv6 = rawIp.includes(":"),
      parts = ipv6 ? [rawIp] : rawIp.split("/");
    const ip = parts[0];
    if (ip && !ipv6 && parseIPv4(ip) === null) error("IP 형식 불량");
    if (ipv6) messages.push("이 버전은 IPv4만 지원");
    let prefix: number | null = null,
      cidr = "";
    const cidrColumn = get("cidr"),
      mask = get("mask");
    if (parts.length > 1) {
      const c = parseCidr(rawIp);
      if (!c) error("IP 접미사 CIDR 불량");
      else prefix = c.prefix;
    }
    if (mask) {
      const m = maskToPrefix(mask);
      if (m === null) error("서브넷마스크 불량");
      else if (prefix !== null && prefix !== m)
        error("마스크와 IP 접두사 불일치");
      else prefix = m;
    }
    if (cidrColumn) {
      const c = parseCidr(cidrColumn);
      if (!c) error("CIDR 형식 불량");
      else {
        if (prefix !== null && prefix !== c.prefix)
          error("CIDR과 마스크/접두사 불일치");
        cidr = `${cidrInfo(c.ip, c.prefix).network}/${c.prefix}`;
      }
    } else if (prefix !== null && parseIPv4(ip) !== null)
      cidr = `${cidrInfo(parseIPv4(ip)!, prefix).network}/${prefix}`;
    const segmentName = get("segment"),
      existing = planned.find((s) =>
        segmentName ? s.name === segmentName : s.cidr === cidr && !!cidr,
      );
    if ((segmentName || mask) && !existing && !cidr)
      error("신규 대역의 CIDR 또는 IP/마스크 필요");
    const vlan = get("vlan") ? Number(get("vlan")) : undefined;
    if (
      vlan !== undefined &&
      (!Number.isInteger(vlan) || vlan < 1 || vlan > 4094)
    )
      error("VLAN 범위 불량");
    const gateway = get("gateway");
    if (gateway && !gateway.includes(":") && parseIPv4(gateway) === null)
      error("게이트웨이 형식 불량");
    const segmentStatus = existing
      ? "기존 대역"
      : cidr
        ? "신규 대역"
        : "미지정";
    if (valid && !existing && cidr)
      planned.push({
        id: "preview-" + index,
        name: segmentName || cidr,
        cidr,
        vlan,
        gateway,
        x: 0,
        y: 0,
        w: 420,
        h: 110,
      });
    return {
      row: header + index + 2,
      name,
      type,
      ip,
      hostName: get("hostName"),
      model: get("model"),
      segmentName,
      cidr,
      vlan,
      gateway,
      valid,
      messages,
      segmentStatus,
    };
  });
}
export function applyImport(tab: DiagramTab, rows: ImportRow[]): DiagramTab {
  const next = structuredClone(tab);
  for (const row of rows.filter((r) => r.valid)) {
    let segment = next.segments.find((s) =>
      row.segmentName
        ? s.name === row.segmentName
        : !!row.cidr && s.cidr === row.cidr,
    );
    if (!segment && row.cidr) {
      segment = {
        id: crypto.randomUUID(),
        name: row.segmentName || row.cidr,
        cidr: row.cidr,
        vlan: row.vlan,
        gateway: row.gateway,
        x: 0,
        y: 0,
        w: 420,
        h: 110,
      };
      next.segments.push(segment);
    }
    next.devices.push({
      id: crypto.randomUUID(),
      name: row.name,
      type: row.type,
      ip: row.ip,
      hostName: row.hostName,
      model: row.model,
      segmentId: segment?.id ?? null,
      x: 0,
      y: 0,
    });
  }
  return layoutDiagram(next);
}
