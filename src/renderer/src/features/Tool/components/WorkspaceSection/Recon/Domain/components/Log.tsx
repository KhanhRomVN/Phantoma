import { useState, useEffect, useRef } from 'react';
import { cn } from '../../../../../../../shared/lib/utils';
import type { ReconData } from '../index';

export function Log({ data }: { data: ReconData }) {
  const [lines, setLines] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Generate log lines based on data
  const LOG_LINES = [
    `[+] Resolving DNS: ${data.target} → ${data.targetIp}`,
    `[+] WHOIS lookup complete. Registrar: ${data.whoisData.registrar}`,
    `[+] Subdomain brute-force: ${data.subdomains.length} found`,
    `[+] Port scan (nmap -sV): ${data.ports.filter((p: { state: string }) => p.state === 'open').length} ports identified`,
    `[+] Email harvest: ${data.harvestedEmails.length} addresses found`,
    `[+] SSL: TLS 1.3, no critical misconfigs in cert chain`,
    `[+] WAF: ${data.infrastructure.waf} detected`,
    `[*] Scan complete. Risk score: ${data.riskScore.total}/100`,
  ];

  useEffect(() => {
    if (cursor >= LOG_LINES.length) return;
    const t = setTimeout(
      () => {
        setLines((prev) => [...prev, LOG_LINES[cursor]]);
        setCursor((c) => c + 1);
      },
      120 + Math.random() * 100,
    );
    return () => clearTimeout(t);
  }, [cursor, data]);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto p-3 bg-[#040608] font-mono text-[11px] leading-relaxed"
    >
      <div className="text-[#2a3548] mb-2">
        ghost-recon v2.0.0 — target: {data.target} — {data.scanTime}
      </div>
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            'mb-0.5',
            line.startsWith('[!]')
              ? 'text-[#ff2d55]'
              : line.startsWith('[*]')
                ? 'text-[#f5a623]'
                : 'text-[#30d158]',
          )}
        >
          {line}
        </div>
      ))}
      {cursor < LOG_LINES.length && <span className="text-[#30d158] animate-pulse">█</span>}
    </div>
  );
}
