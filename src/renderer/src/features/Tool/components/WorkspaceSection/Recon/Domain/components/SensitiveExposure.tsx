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

function KV({ k, v, vc = 'text-[#6a7a9a]' }: { k: string; v: string | number | React.ReactNode; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[11px] font-mono', vc)}>{v}</span>
    </div>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-widest font-mono text-[#3a4558]">{label}</span>
      <span className="text-[15px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[8px] font-mono text-[#2a3548]">{sub}</span>}
    </div>
  );
}

export function DomainSensitiveExposure({ data }: { data: ReconData }) {
  // @ts-ignore - sensitiveExposure is added in JSON but not in type yet
  const sensitive = data.sensitiveExposure || {};
  
  const envExposure = sensitive.envExposure || [];
  const gitExposure = sensitive.gitExposure || [];
  const backupFiles = sensitive.backupFiles || [];
  const configFiles = sensitive.configFiles || [];
  const apiKeys = sensitive.apiKeys || [];
  const secretTokens = sensitive.secretTokens || [];
  const logFiles = sensitive.logFiles || [];
  
  const totalExposures = envExposure.length + gitExposure.length + backupFiles.length + configFiles.length + apiKeys.length + secretTokens.length + logFiles.length;
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Total Exposures" value={totalExposures} sub="sensitive findings" accent="#ff2d55" />
          <StatBox label="API Keys" value={apiKeys.length} sub="credentials leaked" accent="#ff6b35" />
          <StatBox label="Backup Files" value={backupFiles.length} sub="data exposure" accent="#f5a623" />
          <StatBox label="Config Files" value={configFiles.length} sub="misconfigurations" accent="#0af" />
        </div>
        
        {/* .env Exposure Card */}
        {envExposure.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff2d55">.env Exposure</SectionHeader>
            {envExposure.map((url: string, i: number) => (
              <KV key={i} k={`Path ${i + 1}`} v={url} vc="text-[#ff6b35]" />
            ))}
          </div>
        )}
        
        {/* .git Exposure Card */}
        {gitExposure.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff2d55">.git Exposure</SectionHeader>
            {gitExposure.map((url: string, i: number) => (
              <KV key={i} k={`Path ${i + 1}`} v={url} vc="text-[#ff6b35]" />
            ))}
          </div>
        )}
        
        {/* API Keys Card */}
        {apiKeys.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff6b35">API Keys</SectionHeader>
            {apiKeys.map((key: string, i: number) => (
              <KV key={i} k={`Key ${i + 1}`} v={key} vc="text-[#0af]" />
            ))}
          </div>
        )}
        
        {/* Secret Tokens Card */}
        {secretTokens.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff6b35">Secret Tokens</SectionHeader>
            {secretTokens.map((token: string, i: number) => (
              <KV key={i} k={`Token ${i + 1}`} v={token} vc="text-[#0af]" />
            ))}
          </div>
        )}
        
        {/* Backup Files Card */}
        {backupFiles.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#f5a623">Backup Files</SectionHeader>
            {backupFiles.map((file: string, i: number) => (
              <KV key={i} k={`File ${i + 1}`} v={file} vc="text-[#8da0c0]" />
            ))}
          </div>
        )}
        
        {/* Config Files Card */}
        {configFiles.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#f5a623">Config Files</SectionHeader>
            {configFiles.map((file: string, i: number) => (
              <KV key={i} k={`File ${i + 1}`} v={file} vc="text-[#8da0c0]" />
            ))}
          </div>
        )}
        
        {/* Database Dump Card */}
        {sensitive.databaseDump && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff2d55">Database Dump</SectionHeader>
            <KV k="URL" v={sensitive.databaseDump} vc="text-[#ff6b35]" />
          </div>
        )}
        
        {/* Jenkins/Kibana Exposure Card */}
        {(sensitive.jenkinsExposure || sensitive.kibanaExposure) && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff2d55">CI/CD & Monitoring Exposure</SectionHeader>
            {sensitive.jenkinsExposure && <KV k="Jenkins" v={sensitive.jenkinsExposure} vc="text-[#ff6b35]" />}
            {sensitive.kibanaExposure && <KV k="Kibana" v={sensitive.kibanaExposure} vc="text-[#ff6b35]" />}
          </div>
        )}
        
        {/* Public S3 Bucket Card */}
        {sensitive.publicS3Bucket && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#f5a623">Public S3 Bucket</SectionHeader>
            <KV k="Bucket" v={sensitive.publicS3Bucket} vc="text-[#0af]" />
          </div>
        )}
        
        {/* Firebase Config Card */}
        {sensitive.firebaseConfig && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#f5a623">Firebase Config</SectionHeader>
            <KV k="Config" v={sensitive.firebaseConfig} vc="text-[#8da0c0]" />
          </div>
        )}
        
        {/* Log Files Card */}
        {logFiles.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#f5a623">Log Files</SectionHeader>
            {logFiles.map((log: string, i: number) => (
              <KV key={i} k={`Log ${i + 1}`} v={log} vc="text-[#8da0c0]" />
            ))}
          </div>
        )}
        
        {/* Source Code Exposure Card */}
        {sensitive.sourceCodeExposure && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff2d55">Source Code Exposure</SectionHeader>
            <KV k="URL" v={sensitive.sourceCodeExposure} vc="text-[#ff6b35]" />
          </div>
        )}
      </div>
    </div>
  );
}