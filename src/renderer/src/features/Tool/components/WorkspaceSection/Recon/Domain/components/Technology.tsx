import type { ReconData } from '../types/recon-data';
import React from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

// UI Components
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

function TechBadge({ tech }: { tech: string }) {
  return (
    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#0a0e14] border border-[#1c2333] text-[#8da0c0]">
      {tech}
    </span>
  );
}

export function DomainTechnology({ data }: { data: ReconData }) {
  const tech = data.techStack;
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        {/* Frontend Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Frontend</SectionHeader>
          <div className="flex flex-wrap gap-1">
            {tech.frontend.map((t, i) => <TechBadge key={i} tech={t} />)}
          </div>
        </div>
        
        {/* Backend Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff6b35">Backend</SectionHeader>
          <div className="flex flex-wrap gap-1">
            {tech.backend.map((t, i) => <TechBadge key={i} tech={t} />)}
          </div>
        </div>
        
        {/* Database Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Database</SectionHeader>
          <div className="flex flex-wrap gap-1">
            {tech.database.map((t, i) => <TechBadge key={i} tech={t} />)}
          </div>
        </div>
        
        {/* Hosting Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#f5a623">Hosting</SectionHeader>
          <div className="flex flex-wrap gap-1">
            {tech.hosting.map((t, i) => <TechBadge key={i} tech={t} />)}
          </div>
        </div>
        
        {/* CDN Card */}
        {tech.cdn && tech.cdn.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#5e5ce6">CDN</SectionHeader>
            <div className="flex flex-wrap gap-1">
              {tech.cdn.map((t, i) => <TechBadge key={i} tech={t} />)}
            </div>
          </div>
        )}
        
        {/* Analytics Card */}
        {tech.analytics && tech.analytics.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#bf5af2">Analytics</SectionHeader>
            <div className="flex flex-wrap gap-1">
              {tech.analytics.map((t, i) => <TechBadge key={i} tech={t} />)}
            </div>
          </div>
        )}
        
        {/* CMS Card */}
        {tech.cms && tech.cms.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#ff9f4a">CMS</SectionHeader>
            <div className="flex flex-wrap gap-1">
              {tech.cms.map((t, i) => <TechBadge key={i} tech={t} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}