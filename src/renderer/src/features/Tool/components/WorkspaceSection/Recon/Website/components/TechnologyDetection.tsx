import type { WebsiteData } from '../types/website-data';
import React from 'react';

function SectionHeader({
  accent = '#0af',
  children,
}: {
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

function TechBadge({ tech, color }: { tech: string; color?: string }) {
  return (
    <span
      className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#0a0e14] border border-[#1c2333]"
      style={{ color: color || '#8da0c0' }}
    >
      {tech}
    </span>
  );
}

export function TechnologyDetection({ data }: { data: WebsiteData }) {
  const { technologyDetection } = data;

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Frontend</SectionHeader>
          <div className="flex flex-wrap gap-1">
            {technologyDetection.frontendFramework.map((tech, i) => (
              <TechBadge key={i} tech={tech} color="#0af" />
            ))}
          </div>
        </div>

        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff6b35">Backend</SectionHeader>
          <div className="flex flex-wrap gap-1">
            {technologyDetection.backendFramework.map((tech, i) => (
              <TechBadge key={i} tech={tech} color="#ff6b35" />
            ))}
          </div>
        </div>

        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Web Server</SectionHeader>
          <div className="flex flex-wrap gap-1">
            {technologyDetection.webServer.map((tech, i) => (
              <TechBadge key={i} tech={tech} color="#30d158" />
            ))}
          </div>
        </div>

        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#f5a623">Runtime</SectionHeader>
          <div className="flex flex-wrap gap-1">
            {technologyDetection.runtime.map((tech, i) => (
              <TechBadge key={i} tech={tech} color="#f5a623" />
            ))}
          </div>
        </div>

        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#bf5af2">CDN</SectionHeader>
          <div className="flex flex-wrap gap-1">
            {technologyDetection.cdn.map((tech, i) => (
              <TechBadge key={i} tech={tech} color="#bf5af2" />
            ))}
          </div>
        </div>

        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">WAF</SectionHeader>
          <div className="flex flex-wrap gap-1">
            {technologyDetection.waf.map((tech, i) => (
              <TechBadge key={i} tech={tech} color="#ff2d55" />
            ))}
          </div>
        </div>

        {technologyDetection.cms && technologyDetection.cms.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#5e5ce6">CMS</SectionHeader>
            <div className="flex flex-wrap gap-1">
              {technologyDetection.cms.map((tech, i) => (
                <TechBadge key={i} tech={tech} color="#5e5ce6" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
