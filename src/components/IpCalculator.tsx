import { useState } from "react";
import { parseCidr, cidrInfo } from "../lib/ip";
import { useProjectStore } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
import { nextSegmentPosition } from "../lib/layout";
export function IpCalculator() {
  const [ip, setIp] = useState("192.168.10.130/26"),
    [prefix, setPrefix] = useState("26");
  const c = parseCidr(ip.includes("/") ? ip : `${ip}/${prefix}`),
    info = c ? cidrInfo(c.ip, c.prefix) : null;
  const store = useProjectStore(),
    ui = useUiStore();
  return (
    <section className="calculator">
      <h2>IP 계산기</h2>
      <div className="form">
        <label>
          IP 또는 IP/CIDR
          <input
            value={ip}
            onChange={(e) => {
              setIp(e.target.value);
              const p = parseCidr(e.target.value);
              if (p) setPrefix(String(p.prefix));
            }}
          />
        </label>
        <label>
          접두사 (0–32)
          <input
            type="number"
            min="0"
            max="32"
            value={prefix}
            onChange={(e) => {
              setPrefix(e.target.value);
              setIp(ip.split("/")[0]);
            }}
          />
        </label>
        {info ? (
          <>
            <div className="preview">
              네트워크: {info.network}/{c!.prefix}
              <br />
              브로드캐스트: {info.broadcast}
              <br />
              마스크: {info.netmask}
              <br />
              와일드카드: {info.wildcard}
              <br />
              가용호스트: {info.hostFirst} – {info.hostLast}
              <br />
              호스트 수: {info.hostCount.toLocaleString()}개<br />
              사설망: {info.isPrivate ? "예" : "아니오"}
            </div>
            <button
              onClick={() => {
                const t = store.tabs.find((t) => t.id === store.activeTabId)!;
                const id = store.addSegment({
                  name: `대역 ${t.segments.length + 1}`,
                  cidr: `${info.network}/${c!.prefix}`,
                  ...nextSegmentPosition(t),
                  w: 420,
                  h: 110,
                });
                ui.focus(id);
                ui.notify("계산한 대역을 추가했습니다");
              }}
            >
              이 대역으로 세그먼트 추가
            </button>
          </>
        ) : (
          <p className="error">
            {ip.includes(":")
              ? "이 버전은 IPv4만 지원"
              : "유효한 IPv4와 접두사를 입력하세요"}
          </p>
        )}
      </div>
    </section>
  );
}
