import type { DeviceTypeId } from "../types";
export interface TypeSpec {
  label: string;
  tier: number;
  shape: "cloud" | "rect" | "roundRect" | "ellipse" | "cylinder";
  fill: string;
  line: string;
  pptxShape: string;
  w: number;
  h: number;
}
const spec = (
  label: string,
  tier: number,
  shape: TypeSpec["shape"],
  fill: string,
  pptxShape: string = shape,
): TypeSpec => ({
  label,
  tier,
  shape,
  fill,
  pptxShape,
  line: "#404040",
  w: 140,
  h: 70,
});
export const deviceTypes: Record<DeviceTypeId, TypeSpec> = {
  internet: spec("인터넷", 0, "cloud", "#E8EEF7"),
  cloud: spec("외부클라우드", 1, "rect", "#F3E8FF"),
  firewall: spec("방화벽", 1, "rect", "#F2C9B5"),
  security: spec("보안장비(IPS/WAF)", 1, "roundRect", "#FDE68A"),
  router: spec("라우터", 2, "ellipse", "#FFFFFF"),
  l3switch: spec("L3 스위치", 3, "rect", "#B7C9DD"),
  l2switch: spec("L2 스위치", 4, "rect", "#C9DAF0"),
  ap: spec("무선 AP", 4, "roundRect", "#D9F0E5"),
  server: spec("서버", 5, "cylinder", "#CFD9EA", "can"),
  db: spec("DB", 5, "cylinder", "#E2E8F0", "can"),
  nas: spec("NAS", 5, "cylinder", "#D9E2F0", "can"),
  pc: spec("PC", 5, "rect", "#FFFFFF"),
  laptop: spec("노트북", 5, "rect", "#F0F0F0"),
  printer: spec("프린터", 5, "rect", "#EFE3F7"),
  camera: spec("CCTV", 5, "ellipse", "#FBE3E3"),
  ipphone: spec("IP전화", 5, "roundRect", "#E3F0FB"),
  custom: spec("사용자 정의", 5, "roundRect", "#EEEEEE"),
};
export const segmentColors = [
  "#EAF1FC",
  "#E9F5EE",
  "#F3ECF8",
  "#FFF3E5",
  "#E7F5F3",
  "#FCECF0",
];
