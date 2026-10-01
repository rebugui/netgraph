import type { DiagramTab } from "../types";
import { deviceTypes } from "./deviceTypes";
import {
  parseIPv4,
  parseCidr,
  cidrInfo,
  cidrContains,
  cidrsOverlap,
} from "./ip";
export interface Warning {
  level: "error" | "warn" | "info";
  deviceId?: string;
  segmentId?: string;
  message: string;
}
export function validate(tab: DiagramTab): Warning[] {
  const warnings: Warning[] = [];
  const ips = new Map<number, string[]>();
  for (const s of tab.segments) {
    const c = parseCidr(s.cidr);
    if (s.cidr.includes(":"))
      warnings.push({
        level: "info",
        segmentId: s.id,
        message: `${s.name}: 이 버전은 IPv4만 지원`,
      });
    else if (!c)
      warnings.push({
        level: "error",
        segmentId: s.id,
        message: `${s.name}: CIDR 형식 불량`,
      });
    if (s.gateway?.includes(":"))
      warnings.push({
        level: "info",
        segmentId: s.id,
        message: `${s.name}: 게이트웨이 — 이 버전은 IPv4만 지원`,
      });
    else if (s.gateway) {
      if (parseIPv4(s.gateway) === null)
        warnings.push({
          level: "error",
          segmentId: s.id,
          message: `${s.name}: 게이트웨이 IP 형식 불량`,
        });
      else if (c && !cidrContains(s.cidr, s.gateway))
        warnings.push({
          level: "error",
          segmentId: s.id,
          message: `${s.name}: 게이트웨이가 대역 밖입니다`,
        });
    }
  }
  for (let i = 0; i < tab.segments.length; i++)
    for (let j = i + 1; j < tab.segments.length; j++) {
      const a = tab.segments[i],
        b = tab.segments[j];
      if (cidrsOverlap(a.cidr, b.cidr)) {
        for (const s of [a, b])
          warnings.push({
            level: "warn",
            segmentId: s.id,
            message: `CIDR 중첩: ${a.name} ↔ ${b.name}`,
          });
        if (
          a.gateway &&
          b.gateway &&
          parseIPv4(a.gateway) !== null &&
          parseIPv4(a.gateway) === parseIPv4(b.gateway)
        )
          for (const s of [a, b])
            warnings.push({
              level: "warn",
              segmentId: s.id,
              message: `게이트웨이 중복: ${a.name} ↔ ${b.name}`,
            });
      }
    }
  for (const d of tab.devices) {
    const s = tab.segments.find((s) => s.id === d.segmentId);
    if (!s && deviceTypes[d.type].tier === 5)
      warnings.push({
        level: "info",
        deviceId: d.id,
        message: `${d.name}: 대역 미지정`,
      });
    if (!d.ip) continue;
    if (d.ip.includes(":")) {
      warnings.push({
        level: "info",
        deviceId: d.id,
        message: `${d.name}: 이 버전은 IPv4만 지원`,
      });
      continue;
    }
    const ip = parseIPv4(d.ip);
    if (ip === null) {
      warnings.push({
        level: "error",
        deviceId: d.id,
        message: `${d.name}: IP 형식 불량`,
      });
      continue;
    }
    ips.set(ip, [...(ips.get(ip) ?? []), d.id]);
    const c = s ? parseCidr(s.cidr) : null;
    if (s && c) {
      if (!cidrContains(s.cidr, d.ip))
        warnings.push({
          level: "error",
          deviceId: d.id,
          message: `${d.name}: 대역 밖 IP (${s.name})`,
        });
      const info = cidrInfo(c.ip, c.prefix);
      if (
        c.prefix < 31 &&
        (ip === parseIPv4(info.network) || ip === parseIPv4(info.broadcast))
      )
        warnings.push({
          level: "warn",
          deviceId: d.id,
          message: `${d.name}: 네트워크/브로드캐스트 주소 사용`,
        });
    }
  }
  for (const ids of ips.values())
    if (ids.length > 1)
      for (const id of ids)
        warnings.push({
          level: "warn",
          deviceId: id,
          message: `${tab.devices.find((d) => d.id === id)!.name}: 중복 IP`,
        });
  for (const l of tab.links)
    if (l.from === l.to)
      warnings.push({
        level: "warn",
        ...(tab.devices.some((d) => d.id === l.from)
          ? { deviceId: l.from }
          : { segmentId: l.from }),
        message: "링크 양단이 같습니다 (셀프 루프)",
      });
  return warnings;
}
