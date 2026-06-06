import type { PersonData } from '../types/person-data';
import React from 'react';

function SectionHeader({ accent = '#0af', children }: { accent?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-widest font-mono text-[#3a4558]">{label}</span>
      <span className="text-[15px] font-bold font-mono leading-none" style={{ color: accent }}>{value}</span>
      {sub && <span className="text-[8px] font-mono text-[#2a3548]">{sub}</span>}
    </div>
  );
}

const PLATFORM_META: Record<string, { color: string; label: string }> = {
  'Twitter/X':  { color: '#1DA1F2', label: 'Twitter/X' },
  linkedin:     { color: '#0077B5', label: 'LinkedIn' },
  github:       { color: '#6e5494', label: 'GitHub' },
  facebook:     { color: '#1877F2', label: 'Facebook' },
  instagram:    { color: '#E4405F', label: 'Instagram' },
  tiktok:       { color: '#69C9D0', label: 'TikTok' },
  reddit:       { color: '#FF4500', label: 'Reddit' },
  discord:      { color: '#5865F2', label: 'Discord' },
  youtube:      { color: '#FF0000', label: 'YouTube' },
  telegram:     { color: '#2AABEE', label: 'Telegram' },
};

function SocialRow({ platform, handle }: { platform: string; handle?: string | null }) {
  if (!handle) return null;
  const meta = PLATFORM_META[platform] || { color: '#0af', label: platform };
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#111827] last:border-0">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
        <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide">{meta.label}</span>
      </div>
      <span className="text-[11px] font-mono" style={{ color: meta.color }}>{handle}</span>
    </div>
  );
}

export function SocialMedia({ data }: { data: PersonData }) {
  const { socialMedia } = data;
  const entries = Object.entries(socialMedia).filter(([, v]) => v);
  const activeProfiles = entries.length;
  const total = Object.keys(socialMedia).length;

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-3 gap-2 mb-1">
          <StatBox label="Active Profiles" value={activeProfiles} sub={`of ${total} checked`} accent="#0af" />
          <StatBox label="LinkedIn"        value={socialMedia.linkedin  ? '✓ Found' : '— None'} sub="" accent={socialMedia.linkedin  ? '#0077B5' : '#3a4558'} />
          <StatBox label="GitHub"          value={socialMedia.github    ? '✓ Found' : '— None'} sub="" accent={socialMedia.github    ? '#6e5494' : '#3a4558'} />
        </div>

        {/* Coverage bar */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Platform Coverage</SectionHeader>
          <div className="space-y-1.5">
            {Object.entries(socialMedia).map(([platform, handle]) => {
              const meta = PLATFORM_META[platform] || { color: '#6a7a9a', label: platform };
              const found = !!handle;
              return (
                <div key={platform} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#3a4558] w-24 shrink-0">{meta.label}</span>
                  <div className="flex-1 h-1 bg-[#111827] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: found ? '100%' : '0%', backgroundColor: meta.color }}
                    />
                  </div>
                  <span className="text-[9px] font-mono w-10 text-right" style={{ color: found ? meta.color : '#2a3548' }}>
                    {found ? 'FOUND' : 'N/A'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* All social links */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Social Media Profiles</SectionHeader>
          <SocialRow platform="Twitter/X" handle={socialMedia.twitter} />
          <SocialRow platform="linkedin"  handle={socialMedia.linkedin} />
          <SocialRow platform="github"    handle={socialMedia.github} />
          <SocialRow platform="facebook"  handle={socialMedia.facebook} />
          <SocialRow platform="instagram" handle={socialMedia.instagram} />
          <SocialRow platform="tiktok"    handle={socialMedia.tiktok} />
          <SocialRow platform="reddit"    handle={socialMedia.reddit} />
          <SocialRow platform="discord"   handle={socialMedia.discord} />
          <SocialRow platform="youtube"   handle={socialMedia.youtube} />
          <SocialRow platform="telegram"  handle={socialMedia.telegram} />
          {activeProfiles === 0 && (
            <span className="text-[10px] font-mono text-[#3a4558]">No social media profiles found</span>
          )}
        </div>
      </div>
    </div>
  );
}