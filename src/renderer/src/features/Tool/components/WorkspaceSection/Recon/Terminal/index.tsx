import { useState, useEffect, useRef } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { TARGET, SCAN_TIME } from '../shared';

const LOG_LINES = [
  '[+] Resolving DNS: phantom.tech → 198.51.100.78',
  '[+] WHOIS lookup complete. Registrar: NameCheap',
  '[+] Subdomain brute-force: 16 found (4 critical)',
  '[+] Port scan (nmap -sV): 10 ports identified',
  '[!] CRITICAL: Port 3306 (MySQL) exposed to 0.0.0.0',
  '[!] CRITICAL: Port 6379 (Redis) no auth — CVE-2022-0543 (CVSS 10.0)',
  '[!] CRITICAL: Jenkins 2.401.1 — auth bypass CVE-2023-27898',
  '[+] Google dorks: 29 indexed results found',
  '[!] S3 bucket phantom-backups: PUBLIC READ — customer_emails.csv exposed',
  '[!] GitHub: phantom-security/backend — AWS_ACCESS_KEY_ID leaked in commit history',
  '[!] Dark web: RDP access to phantom.tech infra for sale ($2500)',
  '[+] Email harvest: 8 addresses found, 3 confirmed in breach data',
  '[+] SSL: TLS 1.3, no critical misconfigs in cert chain',
  '[+] WAF: Cloudflare Enterprise detected',
  '[*] Scan complete. Risk score: 87/100 (CRITICAL)',
];

export function TerminalLog() {
  const [lines, setLines] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

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
  }, [cursor]);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto p-3 bg-[#040608] font-mono text-[10px] leading-relaxed"
    >
      <div className="text-[#2a3548] mb-2">
        ghost-recon v2.0.0 — target: {TARGET} — {SCAN_TIME}
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
      {cursor < LOG_LINES.length && (
        <span className="text-[#30d158] animate-pulse">█</span>
      )}
    </div>
  );
}
