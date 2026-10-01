export function parseIPv4(s: string): number | null {
  const parts = s.trim().split(".");
  if (
    parts.length !== 4 ||
    parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255)
  )
    return null;
  return parts.reduce((n, p) => n * 256 + Number(p), 0) >>> 0;
}
export function formatIp(n: number): string {
  return [24, 16, 8, 0].map((b) => (n >>> b) & 255).join(".");
}
export function parseCidr(s: string): { ip: number; prefix: number } | null {
  const m = s.trim().match(/^([^/]+)\/(\d{1,2})$/);
  if (!m) return null;
  const ip = parseIPv4(m[1]),
    prefix = Number(m[2]);
  return ip === null || prefix > 32 ? null : { ip, prefix };
}
export const isValidCidr = (s: string) => parseCidr(s) !== null;
export function maskToPrefix(s: string): number | null {
  const mask = parseIPv4(s);
  if (mask === null) return null;
  const bits = mask.toString(2).padStart(32, "0");
  return /^1*0*$/.test(bits)
    ? bits.indexOf("0") === -1
      ? 32
      : bits.indexOf("0")
    : null;
}
export function cidrInfo(ip: number, prefix: number) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32)
    throw new Error("CIDR 접두사는 0–32입니다");
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ip & mask) >>> 0,
    broadcast = (network | ~mask) >>> 0;
  const hostFirst = prefix >= 31 ? network : network + 1,
    hostLast = prefix >= 31 ? broadcast : broadcast - 1;
  const privateRanges = [
    [0x0a000000, 0x0affffff],
    [0xac100000, 0xac1fffff],
    [0xc0a80000, 0xc0a8ffff],
  ];
  return {
    network: formatIp(network),
    broadcast: formatIp(broadcast),
    netmask: formatIp(mask),
    wildcard: formatIp(~mask >>> 0),
    hostFirst: formatIp(hostFirst),
    hostLast: formatIp(hostLast),
    hostCount: hostLast - hostFirst + 1,
    isPrivate: privateRanges.some(([a, b]) => network >= a && broadcast <= b),
  };
}
export function cidrContains(cidr: string, ip: string): boolean {
  const c = parseCidr(cidr),
    n = parseIPv4(ip);
  if (!c || n === null) return false;
  const r = cidrInfo(c.ip, c.prefix);
  return n >= parseIPv4(r.network)! && n <= parseIPv4(r.broadcast)!;
}
export function cidrsOverlap(a: string, b: string): boolean {
  const x = parseCidr(a),
    y = parseCidr(b);
  if (!x || !y) return false;
  const p = cidrInfo(x.ip, x.prefix),
    q = cidrInfo(y.ip, y.prefix);
  return (
    parseIPv4(p.network)! <= parseIPv4(q.broadcast)! &&
    parseIPv4(q.network)! <= parseIPv4(p.broadcast)!
  );
}
