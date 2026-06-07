import { useState, useEffect, useRef } from 'react';
import { cn } from '../../../../../../../shared/lib/utils';
import type { ClientAttackData } from '../types/client-attack';

export function Log({ data }: { data: ClientAttackData }) {
  const [lines, setLines] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const LOG_LINES = data.attackLog && data.attackLog.length > 0
    ? data.attackLog
    : [
        `[*] Initializing client-side attack framework v2.0.0`,
        `[+] Campaign: ${data.campaignName}`,
        `[*] Target organization: ${data.target}`,
        `[+] Harvesting employee emails from LinkedIn...`,
        `[*] Cloning login page using Evilginx...`,
        `[+] Phishlet deployed — MFA capture enabled`,
        `[+] Credential captured: user@corp-target.com`,
        `[*] Generating msfvenom payload (x64/meterpreter/reverse_tcp)...`,
        `[+] Payload: invoice.docm — 3/72 VirusTotal`,
        `[+] Meterpreter session opened on target workstation`,
        `[*] Campaign complete. Risk score: ${data.riskScore.total}/100`,
      ];

  useEffect(() => {
    if (cursor >= LOG_LINES.length) return;
    const t = setTimeout(() => { setLines((prev) => [...prev, LOG_LINES[cursor]]); setCursor((c) => c + 1); }, 100 + Math.random() * 80);
    return () => clearTimeout(t);
  }, [cursor, data]);

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [lines]);

  return (
    <div ref={ref} className="flex-1 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed">
      <div className="text-[#c8d6f0] mb-2">phantoma-client-attack v2.0.0 — campaign: {data.campaignName} — {data.scanTime}</div>
      {lines.map((line, i) => (
        <div key={i} className={cn('mb-0.5', line.startsWith('[!]') || line.includes('FAILED') ? 'text-[#ff2d55]' : line.startsWith('[-]') ? 'text-[#ff6b35]' : line.startsWith('[*]') ? 'text-[#f5a623]' : 'text-[#30d158]')}>{line}</div>
      ))}
      {cursor < LOG_LINES.length && <span className="text-[#30d158] animate-pulse">█</span>}
    </div>
  );
}