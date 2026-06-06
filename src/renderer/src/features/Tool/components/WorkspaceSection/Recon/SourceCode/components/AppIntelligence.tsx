import type { SourceCodeData } from '../types/sourcecode-data';
import React from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

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

export function AppIntelligence({ data }: { data: SourceCodeData }) {
  const { appIntelligence } = data;
  
  const sections = [
    { title: 'API Endpoints', items: appIntelligence.apiEndpoints, accent: '#0af' },
    { title: 'Internal URLs', items: appIntelligence.internalUrls, accent: '#ff6b35' },
    { title: 'Debug Endpoints', items: appIntelligence.debugEndpoints, accent: '#ff2d55' },
    { title: 'Feature Flags', items: appIntelligence.featureFlags, accent: '#30d158' },
    { title: 'Admin Routes', items: appIntelligence.adminRoutes, accent: '#f5a623' },
    { title: 'Hidden Routes', items: appIntelligence.hiddenRoutes, accent: '#bf5af2' },
  ];
  
  const hasItems = sections.some(s => s.items && s.items.length > 0);
  
  if (!hasItems) {
    return (
      <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-6 text-center text-[10px] text-[#3a4558]">
          No application intelligence data found
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        {sections.map((section, idx) => (
          section.items && section.items.length > 0 && (
            <div key={idx} className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
              <SectionHeader accent={section.accent}>{section.title}</SectionHeader>
              {section.items.map((item, itemIdx) => (
                <div key={itemIdx} className="text-[10px] font-mono py-1 border-b border-[#111827] last:border-0">
                  <span className="text-[#8da0c0] break-all">{item}</span>
                </div>
              ))}
            </div>
          )
        ))}
      </div>
    </div>
  );
}