import { useState, useEffect, useRef } from 'react';
import { cn } from '../../../../../../../shared/lib/utils';
import type { WebsiteAttackData } from '../types/website-attack';

export function Log({ data }: { data: WebsiteAttackData }) {
  const [lines, setLines] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const LOG_LINES = data.attackLog && data.attackLog.length > 0
    ? data.attackLog
    : [
        `[*] Initializing web attack framework v2.0.0`,
        `[+] Target acquired: ${data.targetUrl}`,
        `[*] Crawling website structure...`,
        `[+] SQLi: UNION injection found in search.php`,
        `[+] SQLi: Extracted database — credentials found`,
        `[+] XSS: Reflected XSS in comment.php (name parameter)`,
        `[+] XSS: Stored XSS in guestbook.php`,
        `[+] LFI: Path traversal — /etc/passwd exposed`,
        `[+] SSRF: Internal access via proxy endpoint`,
        `[+] XXE: File read via XML injection`,
        `[-] Deserialization: No vulnerability detected`,
        `[+] Command Injection: RCE via ping utility`,
        `[+] Web shell uploaded to /uploads/shell.php`,
        `[*] Attack complete. Risk score: ${data.riskScore.total}/100`,
      ];

  useEffect(() => {
    if (cursor >= LOG_LINES.length) return;
    const t = setTimeout(
      () => {
        setLines((prev) => [...prev, LOG_LINES[cursor]]);
        setCursor((c) => c + 1);
      },
      100 + Math.random() * 80,
    );
    return () => clearTimeout(t);
  }, [cursor, data]);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  return (
    <div ref={ref} className="flex-1 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed">
      <div className="text-[#c8d6f0] mb-2">
        phantoma-web-attack v2.0.0 — target: {data.targetUrl} — {data.scanTime}
      </div>
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            'mb-0.5',
            line.startsWith('[!]') || line.includes('FAILED')
              ? 'text-[#ff2d55]'
              : line.startsWith('[-]')
                ? 'text-[#ff6b35]'
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