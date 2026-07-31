import { useState, useEffect, useRef } from 'react';
import { cn } from '../../../../shared/lib/utils';
import type { ReconData } from '../../types/person/recon-data';

export function Log({ data }: { data: ReconData }) {
  const [lines, setLines] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const idInfo = data.identityInfo;
  const contactInfo = data.contactInfo;
  const socialMedia = data.socialMedia;
  const tech = data.technicalFootprint;
  const leaks = data.leakExposure;

  const socialCount = socialMedia
    ? Object.entries(socialMedia).filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v))
        .length
    : 0;

  const LOG_LINES = [
    `[+] Scanning email: ${data.target}`,
    `[+] Identity: ${idInfo?.fullName || 'Unknown'}, ${idInfo?.estimatedAge || '?'} y/o, ${idInfo?.location || 'Unknown'}`,
    `[+] Aliases found: ${idInfo?.alias?.length || 0} handles`,
    `[+] Usernames: ${idInfo?.username?.length || 0} unique usernames across platforms`,
    `[+] Contact: ${contactInfo?.email?.length || 0} emails, ${contactInfo?.phoneNumber?.length || 0} phones`,
    `[+] Messenger: ${contactInfo?.messengerAccounts?.length || 0} accounts`,
    `[+] Social Media: ${socialCount} profiles found`,
    `[+] GitHub: ${tech?.repositoryContributions?.length || 0} repos, ${tech?.toolsPublished?.length || 0} tools published`,
    `[+] Domains: ${tech?.domainOwnership?.length || 0} owned`,
    `[+] Conferences: ${tech?.conferences?.length || 0} attended`,
    `[+] CTF Results: ${tech?.ctfResults?.length || 0} competitions`,
    `[+] Breaches: ${leaks?.passwordLeaks?.length || 0} password leaks found`,
    `[+] Dark Web: ${leaks?.darkwebMentions?.length || 0} mentions`,
    `[+] Registered Services: ${data.registeredServices?.length || 0} services`,
    `[+] Noise: ${data.noiseResults?.length || 0} false positives / collisions`,
    `[*] Scan complete. Confidence: ${Math.round(data.confidence * 100)}%`,
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
