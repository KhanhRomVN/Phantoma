import type { IPServerData } from '../types/ip-server-data';
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

export function InfrastructureExposure({ data }: { data: IPServerData }) {
  const { infrastructureExposure } = data;
  
  const exposures = [
    { name: 'Docker', exposed: infrastructureExposure.dockerExposure, port: 2375, severity: 'HIGH' },
    { name: 'Kubernetes', exposed: infrastructureExposure.kubernetesExposure, port: 6443, severity: 'CRITICAL' },
    { name: 'Redis', exposed: infrastructureExposure.redisExposure, port: 6379, severity: 'HIGH' },
    { name: 'Elasticsearch', exposed: infrastructureExposure.elasticsearchExposure, port: 9200, severity: 'MEDIUM' },
    { name: 'MongoDB', exposed: infrastructureExposure.mongodbExposure, port: 27017, severity: 'CRITICAL' },
    { name: 'PostgreSQL', exposed: infrastructureExposure.postgresqlExposure, port: 5432, severity: 'HIGH' },
    { name: 'MySQL', exposed: infrastructureExposure.mysqlExposure, port: 3306, severity: 'HIGH' },
  ];
  
  const exposedCount = exposures.filter(e => e.exposed).length;
  const criticalExposures = exposures.filter(e => e.exposed && e.severity === 'CRITICAL').length;
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Exposed Services" value={exposedCount} sub="discovered" accent="#ff2d55" />
          <StatBox label="Critical" value={criticalExposures} sub="patch immediately" accent="#ff2d55" />
          <StatBox label="High Risk" value={exposures.filter(e => e.exposed && e.severity === 'HIGH').length} sub="prioritize" accent="#ff6b35" />
          <StatBox label="Medium Risk" value={exposures.filter(e => e.exposed && e.severity === 'MEDIUM').length} sub="review" accent="#f5a623" />
        </div>
        
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider">Service</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider">Default Port</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider">Status</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider">Risk Level</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {exposures.map((exp, idx) => (
                  <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                    <td className="p-2 font-mono text-[11px] text-[#0af]">{exp.name}</td>
                    <td className="p-2 text-[10px] text-[#6a7a9a]">{exp.port}/tcp</td>
                    <td className="p-2">
                      <span className={exp.exposed ? 'text-[#ff2d55] font-bold' : 'text-[#30d158]'}>
                        {exp.exposed ? 'EXPOSED' : 'Secure'}
                      </span>
                    </td>
                    <td className="p-2">
                      {exp.exposed && (
                        <span className="text-[8px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm" style={{ 
                          color: exp.severity === 'CRITICAL' ? '#ff2d55' : exp.severity === 'HIGH' ? '#ff6b35' : '#f5a623',
                          border: `1px solid ${exp.severity === 'CRITICAL' ? '#ff2d55' : exp.severity === 'HIGH' ? '#ff6b35' : '#f5a623'}40`,
                          background: `${exp.severity === 'CRITICAL' ? '#ff2d55' : exp.severity === 'HIGH' ? '#ff6b35' : '#f5a623'}12`
                        }}>
                          {exp.severity}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-[10px] text-[#8da0c0]">
                      {exp.exposed ? `Close port ${exp.port} or restrict access` : 'No action needed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {exposedCount > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#ff2d55">Critical Alert</SectionHeader>
            <div className="text-[10px] font-mono text-[#ff6b35]">
              ⚠️ {exposedCount} infrastructure service(s) exposed to the internet. This significantly increases attack surface.
              {criticalExposures > 0 && ` ${criticalExposures} critical severity services require immediate attention.`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}