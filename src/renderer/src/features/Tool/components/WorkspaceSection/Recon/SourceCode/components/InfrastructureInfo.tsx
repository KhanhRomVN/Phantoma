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

function KV({ k, v, vc = 'text-[#6a7a9a]' }: { k: string; v: string | number | React.ReactNode; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[11px] font-mono', vc)}>{v}</span>
    </div>
  );
}

export function InfrastructureInfo({ data }: { data: SourceCodeData }) {
  const { infrastructureInfo } = data;
  
  const sections = [
    { title: 'CI/CD Config', items: infrastructureInfo.ciCdConfig, accent: '#0af' },
    { title: 'Docker Config', items: infrastructureInfo.dockerConfig, accent: '#30d158' },
    { title: 'Kubernetes Config', items: infrastructureInfo.kubernetesConfig, accent: '#f5a623' },
    { title: 'Terraform', items: infrastructureInfo.terraform, accent: '#bf5af2' },
    { title: 'CloudFormation', items: infrastructureInfo.cloudFormation, accent: '#ff6b35' },
    { title: 'Deployment Scripts', items: infrastructureInfo.deploymentScripts, accent: '#ff2d55' },
  ];
  
  const hasItems = sections.some(s => s.items && s.items.length > 0);
  
  if (!hasItems) {
    return (
      <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-6 text-center text-[10px] text-[#3a4558]">
          No infrastructure configuration files found
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