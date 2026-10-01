import { describe, it, expect } from "vitest";
import {
  parseIPv4,
  parseCidr,
  cidrInfo,
  maskToPrefix,
  cidrsOverlap,
  cidrContains,
  formatIp,
} from "./ip";
describe("IPv4 boundaries", () => {
  it("calculates a non-network /26 input", () => {
    expect(cidrInfo(parseIPv4("192.168.10.130")!, 26)).toEqual({
      network: "192.168.10.128",
      broadcast: "192.168.10.191",
      netmask: "255.255.255.192",
      wildcard: "0.0.0.63",
      hostFirst: "192.168.10.129",
      hostLast: "192.168.10.190",
      hostCount: 62,
      isPrivate: true,
    });
  });
  it("handles /0, /31 and /32 without signed overflow", () => {
    expect(cidrInfo(0, 0).hostCount).toBe(4294967294);
    expect(cidrInfo(0xfffffffe, 31).hostCount).toBe(2);
    expect(cidrInfo(0xffffffff, 32).hostFirst).toBe("255.255.255.255");
    expect(cidrInfo(0xffffffff, 32).hostCount).toBe(1);
    expect(formatIp(parseIPv4("224.1.2.3")!)).toBe("224.1.2.3");
  });
  it("rejects malformed addresses, prefixes and noncontiguous masks", () => {
    for (const s of ["1.2.3", "256.0.0.1", "1e1.0.0.1", "::1", "-1.0.0.0"])
      expect(parseIPv4(s)).toBeNull();
    expect(parseCidr("10.0.0.0/33")).toBeNull();
    expect(maskToPrefix("255.0.255.0")).toBeNull();
    expect(maskToPrefix("255.255.255.192")).toBe(26);
    expect(maskToPrefix("0.0.0.0")).toBe(0);
    expect(maskToPrefix("255.255.255.255")).toBe(32);
  });
  it("detects containment and inclusive overlap", () => {
    expect(cidrsOverlap("10.0.0.0/8", "10.1.0.0/16")).toBe(true);
    expect(cidrsOverlap("10.0.0.0/25", "10.0.0.128/25")).toBe(false);
    expect(cidrContains("0.0.0.0/0", "255.255.255.255")).toBe(true);
    expect(cidrContains("192.168.1.0/24", "192.168.2.1")).toBe(false);
  });
});
