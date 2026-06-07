import type { SourceCodeData } from '../types/sourcecode-data';
import React from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

function SectionHeader({ accent = '#0af', children }: { accent?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-mono text-[#c8d6f0]">{label}</span>
      <span className="text-[16px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[9px] font-mono text-[#c8d6f0]">{sub}</span>}
    </div>
  );
}

function SecretCard({ title, secrets, color }: { title: string; secrets?: string[]; color: string }) {
  if (!secrets || secrets.length === 0) return null;
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
      <SectionHeader accent={color}>{title}</SectionHeader>
      {secrets.map((secret, idx) => (
        <div key={idx} className="text-[11px] font-mono py-1 border-b border-[#111827] last:border-0">
          <span className="text-[#c8d6f0] break-all">{secret}</span>
        </div>
      ))}
    </div>
  );
}

export function SecretExposure({ data }: { data: SourceCodeData }) {
  const { secretExposure, infrastructureInfo, appIntelligence } = data;
  
  const apiKeyCount = secretExposure.apiKeys?.length || 0;
  const tokenCount = secretExposure.secretTokens?.length || 0;
  const credentialCount = (secretExposure.databaseCredentials?.length || 0) + (secretExposure.cloudCredentials?.length || 0);
  
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="API Keys" value={apiKeyCount} sub="exposed" accent="#ff2d55" />
          <StatBox label="Tokens" value={tokenCount} sub="secrets" accent="#ff6b35" />
          <StatBox label="Credentials" value={credentialCount} sub="database/cloud" accent="#f5a623" />
          <StatBox label="CI/CD Configs" value={infrastructureInfo.ciCdConfig?.length || 0} sub="pipelines" accent="#0af" />
        </div>
        
        <SecretCard title="API Keys" secrets={secretExposure.apiKeys} color="#ff2d55" />
        <SecretCard title="Secret Tokens" secrets={secretExposure.secretTokens} color="#ff6b35" />
        <SecretCard title="SSH Keys" secrets={secretExposure.sshKeys} color="#f5a623" />
        <SecretCard title="Database Credentials" secrets={secretExposure.databaseCredentials} color="#30d158" />
        <SecretCard title="Cloud Credentials" secrets={secretExposure.cloudCredentials} color="#0af" />
        <SecretCard title="Hardcoded Passwords" secrets={secretExposure.hardcodedPasswords} color="#bf5af2" />
        
        {infrastructureInfo.ciCdConfig && infrastructureInfo.ciCdConfig.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#f5a623">CI/CD Configuration</SectionHeader>
            {infrastructureInfo.ciCdConfig.map((config, idx) => (
              <div key={idx} className="text-[11px] font-mono py-1 border-b border-[#111827] last:border-0">
                <span className="text-[#c8d6f0]">{config}</span>
              </div>
            ))}
          </div>
        )}
        
        {appIntelligence.apiEndpoints && appIntelligence.apiEndpoints.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#0af">Discovered API Endpoints</SectionHeader>
            <div className="flex flex-wrap gap-2">
              {appIntelligence.apiEndpoints.map((endpoint, idx) => (
                <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0a0e14] border border-[#1c2333] text-[#0af]">
                  {endpoint}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}