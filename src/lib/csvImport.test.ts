import { it, expect } from "vitest";
import { parseCsv, applyImport } from "./csvImport";
import type { DiagramTab } from "../types";
const empty: DiagramTab = {
  id: "tab",
  name: "Test",
  kind: "물리",
  segments: [],
  devices: [],
  links: [],
};
it("finds aliased TSV headers after a preamble and parses suffix IP", () => {
  const rows = parseCsv(
    "보고서\nname\ttype\tip\thostname\nweb\tserver\t10.0.1.5/24\tweb01",
  );
  expect(rows[0]).toMatchObject({
    name: "web",
    type: "server",
    ip: "10.0.1.5",
    cidr: "10.0.1.0/24",
    valid: true,
    hostName: "web01",
  });
});
it("normalizes dotted masks and CIDRs into one segment", () => {
  const rows = parseCsv(
    "장비명,유형,IP,마스크,CIDR\na,서버,10.0.0.3,255.255.255.192,\nb,DB,10.0.0.4,,10.0.0.9/26",
  );
  expect(rows.map((r) => r.cidr)).toEqual(["10.0.0.0/26", "10.0.0.0/26"]);
  expect(rows.map((r) => r.segmentStatus)).toEqual(["신규 대역", "기존 대역"]);
  const tab = applyImport(empty, rows);
  expect(tab.segments).toHaveLength(1);
  expect(tab.devices[0].segmentId).toBe(tab.devices[1].segmentId);
});
it("excludes invalid IPs, preserves unknown types and unassigned rows", () => {
  const rows = parseCsv("이름,type,IP\na,Alien,1.2.3.4\nb,server,999.0.0.1");
  expect(rows[0]).toMatchObject({
    type: "custom",
    valid: true,
    segmentStatus: "미지정",
  });
  expect(rows[0].messages[0]).toContain("유형 미인식");
  expect(rows[1].valid).toBe(false);
  expect(
    applyImport(empty, rows).devices.map((d) => [d.name, d.segmentId]),
  ).toEqual([["a", null]]);
});
it("handles quoted commas, escaped quotes and embedded newlines", () => {
  const rows = parseCsv(
    'name,type,ip,model\n"web,1",server,1.2.3.4,"model ""A""\nline"',
  );
  expect(rows[0].name).toBe("web,1");
  expect(rows[0].model).toBe('model "A"\nline');
});
it("matches existing segment names without network columns", () => {
  const segments = [
    {
      id: "s",
      name: "사무망",
      cidr: "10.0.0.0/24",
      x: 0,
      y: 0,
      w: 420,
      h: 110,
    },
  ];
  const rows = parseCsv("name,type,ip,segment\na,pc,10.0.0.5,사무망", segments);
  expect(rows[0].segmentStatus).toBe("기존 대역");
  expect(applyImport({ ...empty, segments }, rows).devices[0].segmentId).toBe(
    "s",
  );
});
it("flags invalid masks and contradictory prefixes", () => {
  const rows = parseCsv(
    "name,type,ip,mask\na,pc,10.0.0.5,255.0.255.0\nb,pc,10.0.0.6/25,255.255.255.0",
  );
  expect(rows.every((r) => !r.valid)).toBe(true);
});
it("keeps explicit segment names distinct while grouping repeated and nameless rows", () => {
  const segments = [
    {
      id: "office",
      name: "사무망",
      cidr: "10.0.0.0/24",
      x: 0,
      y: 0,
      w: 420,
      h: 110,
    },
  ];
  const rows = parseCsv(
    "name,type,ip,segment\nweb,server,10.0.0.2/24,서버망\nweb2,server,10.0.0.3,서버망\ndb,db,10.0.0.4/24,DB망\npc,pc,10.0.0.5/24,",
    segments,
  );
  expect(rows.map((r) => r.segmentStatus)).toEqual([
    "신규 대역",
    "기존 대역",
    "신규 대역",
    "기존 대역",
  ]);
  const tab = applyImport({ ...empty, segments }, rows);
  expect(tab.segments.map((s) => [s.name, s.cidr])).toEqual([
    ["사무망", "10.0.0.0/24"],
    ["서버망", "10.0.0.0/24"],
    ["DB망", "10.0.0.0/24"],
  ]);
  const server = tab.segments.find((s) => s.name === "서버망")!;
  const database = tab.segments.find((s) => s.name === "DB망")!;
  expect(tab.devices.map((d) => [d.name, d.segmentId])).toEqual([
    ["web", server.id],
    ["web2", server.id],
    ["db", database.id],
    ["pc", "office"],
  ]);
});
it("preserves IPv6 prefix notation without deriving an IPv4 segment", () => {
  const rows = parseCsv("name,type,ip\nipv6,server,fe80::1/64");
  expect(rows[0]).toMatchObject({
    ip: "fe80::1/64",
    valid: true,
    cidr: "",
    segmentStatus: "미지정",
  });
  expect(rows[0].messages).toContain("이 버전은 IPv4만 지원");
  const tab = applyImport(empty, rows);
  expect(tab.segments).toEqual([]);
  expect(tab.devices.map((d) => [d.ip, d.segmentId])).toEqual([
    ["fe80::1/64", null],
  ]);
});
it("still excludes malformed IPv4 suffixes", () => {
  const rows = parseCsv(
    "name,type,ip\nwide,pc,10.0.0.1/64\ntext,pc,10.0.0.2/nope\nextra,pc,10.0.0.3/24/25",
  );
  for (const row of rows) {
    expect(row.valid).toBe(false);
    expect(row.messages).toContain("IP 접미사 CIDR 불량");
  }
  expect(applyImport(empty, rows).devices).toEqual([]);
});
