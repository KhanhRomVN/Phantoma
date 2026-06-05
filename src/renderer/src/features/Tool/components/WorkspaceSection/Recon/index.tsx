// ============================================================================
// RECON — Main entry point
// Tab content is split into sub-folders, shared data/components in shared.tsx
// ============================================================================
import { useState } from 'react';
import { cn } from '../../../../../shared/lib/utils';
import { TARGET } from './shared';
import { TabOverview } from './Overview';
import { TabPorts } from './Ports';
import { TabDNS } from './DNS';
import { TabBreach } from './Breach';
import { TabExposure } from './Exposure';
import { TabIntel } from './Intel';
import { TerminalLog } from './Terminal';

const TABS = [
  { id: 'overview',  label: 'Overview',          accent: '#0af'    },
  { id: 'ports',     label: 'Ports & CVEs',       accent: '#ff2d55' },
  { id: 'dns',       label: 'DNS',                accent: '#30d158' },
  { id: 'breach',    label: 'Breach / Email',     accent: '#f5a623' },
  { id: 'exposure',  label: 'Exposure',           accent: '#ff6b35' },
  { id: 'intel',     label: 'WHOIS / TI / Certs', accent: '#bf5af2' },
  { id: 'terminal',  label: 'Scan Log',           accent: '#30d158' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function Recon() {
  const [active, setActive] = useState<TabId>('overview');

  const renderContent = () => {
    switch (active) {
      case 'overview':  return <TabOverview />;
      case 'ports':     return <TabPorts />;
      case 'dns':       return <TabDNS />;
      case 'breach':    return <TabBreach />;
      case 'exposure':  return <TabExposure />;
      case 'intel':     return <TabIntel />;
      case 'terminal':  return <TerminalLog />;
      default:          return null;
    }
  };

  const activeTab = TABS.find((t) => t.id === active)!;

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden bg-[#080b10]"
      style={{ fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace' }}
    >
      {/* Header bar */}
      <div className="flex items-center gap-0 px-3 h-[34px] bg-[#060810] border-b border-[#1c2333] shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              'h-full px-3 text-[9.5px] uppercase tracking-[0.1em] font-bold transition-all relative whitespace-nowrap',
              active === tab.id ? 'text-[#c8d6f0]' : 'text-[#2a3548] hover:text-[#4a5a7a]',
            )}
          >
            {tab.label}
            {active === tab.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: activeTab.accent }}
              />
            )}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff2d55] animate-pulse" />
            <span className="text-[9px] text-[#2a3548] font-mono">RISK 87/100</span>
          </div>
          <div className="w-px h-3 bg-[#1c2333]" />
          <input
            readOnly
            value={TARGET}
            className="h-5 w-36 bg-[#0d1017] border border-[#1c2333] rounded text-[#0af] text-[9.5px] px-2 outline-none font-mono"
          />
          <button className="h-5 px-2.5 bg-[#ff2d5515] border border-[#ff2d5530] text-[#ff2d55] text-[9px] font-bold uppercase tracking-wider rounded font-mono hover:bg-[#ff2d5525] transition-colors">
            ▶ Run
          </button>
          <button className="h-5 px-2 bg-[#1c2333] border border-[#2a3548] text-[#4a5a7a] text-[9px] rounded font-mono hover:text-[#8da0c0] transition-colors">
            Export
          </button>
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
