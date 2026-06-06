import { useState, useEffect, useRef } from 'react';
import { cn } from '../../../../../../../shared/lib/utils';
import type { ReconData } from '../ReconDataContext';

export function TerminalLog({ data }: { data: ReconData }) {
  const [lines, setLines] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  
  // Generate log lines based on data
  const LOG_LINES = [
    `[+] Resolving DNS: ${data.target} → ${data.targetIp}`,
    '[+] WHOIS lookup complete. Registrar: ' + data.whoisData.registrar.name,
    `[+] Subdomain brute-force: ${data.subdomains.length} found (${data.subdomains.filter(s => s.risk === 'critical').length} critical)`,
    `[+] Port scan (nmap -sV): ${data.ports.filter(p => p.state === 'open').length} ports identified`,
    ...data.ports.filter(p => p.state === 'open' && p.risk === 'critical').map(p => `[!] CRITICAL: Port ${p.port} (${p.service}) exposed — ${p.cve.join(', ') || 'no CVE'}`),
    `[+] Google dorks: ${data.googleDorks.reduce((acc, d) => acc + d.results, 0)} indexed results found`,
    ...data.cloudAssets.filter(a => a.risk === 'critical').map(a => `[!] ${a.type} bucket ${a.name}: ${a.perm} — ${a.files.slice(0, 2).join(', ')}`),
    ...data.codeRepos.filter(r => r.secrets.length > 0).map(r => `[!] GitHub: ${r.repo} — ${r.secrets[0]} leaked in commit history`),
    `[+] Email harvest: ${data.harvestedEmails.length} addresses found, ${data.harvestedEmails.filter(e => e.breach).length} confirmed in breach data`,
    '[+] SSL: TLS 1.3, no critical misconfigs in cert chain',
    '[+] WAF: Cloudflare Enterprise detected',
    `[*] Scan complete. Risk score: ${data.riskScore.total}/100 (${data.riskScore.total >= 80 ? 'CRITICAL' : data.riskScore.total >= 60 ? 'HIGH' : 'MEDIUM'})`,
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