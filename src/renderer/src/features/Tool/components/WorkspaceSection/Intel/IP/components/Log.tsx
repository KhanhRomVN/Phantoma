import { useState, useEffect, useRef } from 'react';
import { cn } from '../../../../../../../shared/lib/utils';
import type { ReconData } from '../types/recon-data';

export function Log({ data }: { data: ReconData }) {
  const [lines, setLines] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Generate log lines based on data
  const LOG_LINES = [
    `[+] Scanning IP: ${data.target}`,
    `[+] Target domain: ${data.targetDomain || 'N/A'}`,
    `[+] Shodan scan: ${data.ports.length} ports found`,
    `[+] Reverse IP lookup: ${data.hostedDomains.length} domains hosted`,
    `[+] GeoIP: ${data.geoIpData[0]?.city || 'Unknown'}, ${data.geoIpData[0]?.country || 'Unknown'}`,
    `[+] BGP: ${data.bgpData[0]?.asn || 'Unknown ASN'} — ${data.bgpData.length} prefixes`,
    `[+] Threat Intel: ${data.threatReports.length} reports found`,
    `[+] Abuse Reports: ${data.abuseReports.length} entries`,
    `[+] Spam Lists: ${data.spamListings.length} listings`,
    `[+] SSL Certs: ${data.ipCertificates.length} certificates`,
    `[*] Scan complete. ${data.ports.length} ports, ${data.hostedDomains.length} domains, ${data.threatReports.length} threats`,
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
      className="flex-1 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed"
    >
      <div className="text-[#c8d6f0] mb-2">
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