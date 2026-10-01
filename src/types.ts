export type DeviceTypeId =
  | "internet"
  | "cloud"
  | "firewall"
  | "security"
  | "router"
  | "l3switch"
  | "l2switch"
  | "ap"
  | "server"
  | "db"
  | "nas"
  | "pc"
  | "laptop"
  | "printer"
  | "camera"
  | "ipphone"
  | "custom";
export interface Device {
  id: string;
  name: string;
  type: DeviceTypeId;
  ip?: string;
  hostName?: string;
  model?: string;
  segmentId: string | null;
  color?: string;
  x: number;
  y: number;
}
export interface Segment {
  id: string;
  name: string;
  vlan?: number;
  cidr: string;
  gateway?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Link {
  id: string;
  from: string;
  to: string;
  vpn: boolean;
  redundant: boolean;
  speed?: string;
  vlans?: number[];
  sourceHandle?: string | null;
  targetHandle?: string | null;
}
export interface Revision {
  id: string;
  version: string;
  date: string;
  author: string;
  desc: string;
}
export interface DiagramTab {
  id: string;
  name: string;
  kind: "물리" | "논리" | "기타";
  segments: Segment[];
  devices: Device[];
  links: Link[];
}
export interface ProjectMeta {
  docTitle: string;
  version: string;
  date: string;
  author: string;
  reviewer: string;
}
export interface Project {
  schema: 1;
  meta: ProjectMeta;
  revisions: Revision[];
  tabs: DiagramTab[];
  activeTabId: string;
}
