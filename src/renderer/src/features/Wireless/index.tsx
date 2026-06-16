import { useState } from 'react';
import type { TabType } from './types';
import { Wifi, Zap, VenetianMask, KeyRound, ShieldCheck, Monitor, ScrollText, BarChart3 } from 'lucide-react';
import { useWireless } from './hooks/useWireless';
import { ScanTab } from './components/scan/ScanTab';
import { AttacksTab } from './components/attacks/AttacksTab';
import { EvilTwinTab } from './components/evil_twin/EvilTwinTab';
import { CrackTab } from './components/crack/CrackTab';
import { WPSAttackPanel } from './components/attacks/WPSAttackPanel';
import { ChannelChart } from './components/scan/ChannelChart';
import { DeauthManager } from './components/attacks/DeauthManager';
import { TopologyMap } from './components/scan/TopologyMap';
import { ProbeSniffer } from './components/scan/ProbeSniffer';
import { WPA3EntTab } from './components/wpa3_ent/WPA3EntTab';
import { MacTab } from './components/mac/MacTab';
import { LogTab } from './components/log/LogTab';
import { ReportTab } from './components/report/ReportTab';
import { PMKIDPanel } from './components/attacks/PMKIDPanel';

interface TooltipState {
  text: string;
  x: number;
  y: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Wireless() {
  const {
    networks,
    activeAttacks,
    evilTwinSessions,
    crackJobs,
    wpa3Results,
    entCaptures,
    krackResults,
    macEntries,
    logMessages,
    isScanning,
    activeTab,
    expandedRow,
    scanConfig,
    stats,
    setActiveTab,
    setExpandedRow,
    setScanConfig,
    handleAction,
    startScan,
    stopAttack,
    stopEvilTwin,
    addMacSpoof,
    log,
    deauthSessions,
    probes,
  } = useWireless();

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const TABS: { id: TabType; label: string; accent: string; badge?: number; icon: React.ReactNode }[] = [
    { id: 'scan', label: 'SCAN', accent: 'var(--primary)', badge: networks.length, icon: <Wifi size={14} /> },
    { id: 'attacks', label: 'ATTACKS', accent: 'var(--error)', badge: stats.running || undefined, icon: <Zap size={14} /> },
    { id: 'evil_twin', label: 'EVIL TWIN', accent: 'var(--accent-purple)', badge: stats.evilActive || undefined, icon: <VenetianMask size={14} /> },
    { id: 'crack', label: 'CRACK', accent: 'var(--warning)', badge: crackJobs.filter((j) => j.status === 'running').length || undefined, icon: <KeyRound size={14} /> },
    { id: 'wpa3_ent', label: 'WPA3/ENT', accent: 'var(--warning)', icon: <ShieldCheck size={14} /> },
    { id: 'mac', label: 'MAC SPOOF', accent: 'var(--success)', icon: <Monitor size={14} /> },
    { id: 'log', label: 'LOG', accent: 'var(--text-secondary)', badge: logMessages.length > 3 ? logMessages.length : undefined, icon: <ScrollText size={14} /> },
    { id: 'report', label: 'REPORT', accent: 'var(--primary)', icon: <BarChart3 size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden font-mono text-text-primary relative">
      {/* Scanline overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(54,134,255,0.015)_2px,rgba(54,134,255,0.015)_4px)]" />

      {/* ── TABS ── */}
      <div className="flex gap-0.5 px-3 flex-shrink-0 border-b border-border bg-card-background z-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 text-xs font-bold tracking-wider py-2.5 px-3.5 cursor-pointer font-mono
                transition-all duration-150 relative whitespace-nowrap border-t-0 border-l-0 border-r-0 border-b-2
                ${isActive ? `bg-input-background text-[${tab.accent}]` : 'bg-transparent text-text-secondary'}
                ${isActive ? `border-b-2 border-solid border-[${tab.accent}]` : 'border-b-2 border-transparent'}
              `}
            >
              <span className={`flex items-center ${isActive ? `text-[${tab.accent}]` : 'text-text-secondary'}`}>
                {tab.icon}
              </span>
              <span className="text-text-primary">{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`
                    text-[8px] font-extrabold py-px px-1.5 rounded-full min-w-[18px] text-center
                    ${isActive ? `bg-[${tab.accent}]/20 text-[${tab.accent}]` : 'bg-border text-text-secondary'}
                  `}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto p-3.5 z-1">
        {activeTab === 'scan' && (
          <div className="flex flex-col gap-2">
            <ScanTab
              networks={networks}
              onAction={handleAction}
              isScanning={isScanning}
              onScan={startScan}
              scanConfig={scanConfig}
              onScanConfig={setScanConfig}
              expandedRow={expandedRow}
              setExpandedRow={setExpandedRow}
              onTooltipShow={setTooltip}
            />
            <div className="grid grid-cols-2 gap-2">
              <ChannelChart networks={networks} />
              <TopologyMap networks={networks} />
            </div>
            <ProbeSniffer probes={probes} />
          </div>
        )}
        {activeTab === 'attacks' && (
          <div className="flex flex-col gap-2">
            <AttacksTab attacks={activeAttacks} onStop={stopAttack} />
            <WPSAttackPanel networks={networks} onAction={handleAction} />
            <DeauthManager sessions={deauthSessions} networks={networks} />
            <PMKIDPanel networks={networks} onAction={handleAction} />
          </div>
        )}
        {activeTab === 'evil_twin' && (
          <EvilTwinTab sessions={evilTwinSessions} onStop={stopEvilTwin} />
        )}
        {activeTab === 'crack' && (
          <CrackTab jobs={crackJobs} onNewJob={() => log('New crack job dialog...')} />
        )}
        {activeTab === 'wpa3_ent' && (
          <WPA3EntTab
            wpa3Results={wpa3Results}
            entCaptures={entCaptures}
            krackResults={krackResults}
          />
        )}
        {activeTab === 'mac' && <MacTab entries={macEntries} onAdd={addMacSpoof} />}
        {activeTab === 'log' && <LogTab messages={logMessages} />}
        {activeTab === 'report' && (
          <ReportTab networks={networks} attacks={activeAttacks} crackedCount={stats.cracked} />
        )}
      </div>
      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            top: tooltip.y,
            left: tooltip.x,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            fontSize: 11,
            padding: '6px 10px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            fontFamily: 'monospace',
            border: '1px solid var(--primary)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

export default Wireless;
