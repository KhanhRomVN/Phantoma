import { useState, useEffect } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { useReconData } from './ReconDataContext';
import { TabOverview } from './Overview';
import { IPServerNetworkInfo } from './NetworkInfo';
import { IPServerPortService } from './PortService';
import { IPServerOSDetection } from './OSDetection';
import { IPServerSecurityAnalysis } from './SecurityAnalysis';
import { IPServerInfrastructureExposure } from './InfrastructureExposure';
import { TerminalLog } from './Terminal';

const SUB_TABS = [
  { id: 'overview', label: 'Overview', accent: '#0af' },
  { id: 'network-info', label: 'Network Information', accent: '#30d158' },
  { id: 'port-service', label: 'Port & Service Scan', accent: '#ff2d55' },
  { id: 'os-detection', label: 'OS Detection', accent: '#f5a623' },
  { id: 'security-analysis', label: 'Security Analysis', accent: '#ff2d55' },
  { id: 'infrastructure-exposure', label: 'Infrastructure Exposure', accent: '#ff6b35' },
  { id: 'terminal', label: 'Log', accent: '#30d158' },
] as const;

type SubTabId = (typeof SUB_TABS)[number]['id'];

interface IPServerPanelProps {
  activeDomain: string;
}

export function IPServerPanel({ activeDomain }: IPServerPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('overview');
  const [domainInput, setDomainInput] = useState(activeDomain);
  const { data, fetchData, isLoading } = useReconData();
  const activeTab = SUB_TABS.find((t) => t.id === activeSubTab)!;

  // Update input when activeDomain changes (from card click)
  useEffect(() => {
    setDomainInput(activeDomain);
  }, [activeDomain]);

  const handleLookup = () => {
    if (!domainInput.trim()) return;
    fetchData(domainInput.trim());
  };

  const renderContent = () => {
    if (!data) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#080b10]">
          <div className="text-[32px] opacity-15">🌐</div>
          <div className="text-[11px] font-mono text-[#2a3548]">Enter an IP and click "Lookup" to start reconnaissance</div>
        </div>
      );
    }

    switch (activeSubTab) {
      case 'overview': return <TabOverview data={data} />;
      case 'network-info': return <IPServerNetworkInfo data={data} />;
      case 'port-service': return <IPServerPortService data={data} />;
      case 'os-detection': return <IPServerOSDetection data={data} />;
      case 'security-analysis': return <IPServerSecurityAnalysis data={data} />;
      case 'infrastructure-exposure': return <IPServerInfrastructureExposure data={data} />;
      case 'terminal': return <TerminalLog data={data} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#060810] border-b border-[#1c2333] shrink-0">
        <input
          type="text"
          value={domainInput}
          onChange={(e) => setDomainInput(e.target.value)}
          placeholder="192.168.1.1"
          className="h-6 w-64 bg-[#0d1017] border border-[#1c2333] rounded text-[#0af] text-[12px] px-2 outline-none font-mono"
          onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
        />
        <button
          onClick={handleLookup}
          disabled={isLoading || !domainInput.trim()}
          className="h-6 w-6 flex items-center justify-center bg-[#0af15] border border-[#0af30] text-[#0af] rounded font-mono hover:bg-[#0af25] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Lookup"
        >
          ▶
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-0 gap-y-1 px-3 py-1 bg-[#060810] border-b border-[#1c2333] shrink-0">
        {SUB_TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} className={cn('px-3 py-1 text-[12px] uppercase tracking-[0.1em] font-bold transition-all relative whitespace-nowrap', activeSubTab === tab.id ? 'text-[#c8d6f0]' : 'text-[#2a3548] hover:text-[#4a5a7a]')}>
            {tab.label}
            {activeSubTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: activeTab.accent }} />}
          </button>
        ))}
      </div>
      {renderContent()}
    </div>
  );
}