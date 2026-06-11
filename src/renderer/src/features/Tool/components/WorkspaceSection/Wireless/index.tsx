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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--background)',
        overflow: 'hidden',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        color: 'var(--text-primary)',
        position: 'relative',
      }}
    >
      {/* Scanline overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(54,134,255,0.015) 2px, rgba(54,134,255,0.015) 4px)',
          pointerEvents: 'none',
        }}
      />

      {/* ── TABS ── */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          padding: '0 12px',
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          background: 'var(--card-background)',
          zIndex: 1,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '10px 14px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: isActive ? 'var(--input-background)' : 'transparent',
                color: isActive ? tab.accent : 'var(--text-secondary)',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: isActive ? `2px solid ${tab.accent}` : '2px solid transparent',
                transition: 'all 0.15s',
                position: 'relative',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: isActive ? tab.accent : 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                {tab.icon}
              </span>
              <span style={{ color: 'var(--text-primary)' }}>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: 10,
                    minWidth: 18,
                    textAlign: 'center',
                    background: isActive ? `${tab.accent}20` : 'var(--border)',
                    color: isActive ? tab.accent : 'var(--text-secondary)',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, zIndex: 1 }}>
        {activeTab === 'scan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ScanTab
              networks={networks}
              onAction={handleAction}
              isScanning={isScanning}
              onScan={startScan}
              scanConfig={scanConfig}
              onScanConfig={setScanConfig}
              expandedRow={expandedRow}
              setExpandedRow={setExpandedRow}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <ChannelChart networks={networks} />
              <TopologyMap networks={networks} />
            </div>
            <ProbeSniffer probes={probes} />
          </div>
        )}
        {activeTab === 'attacks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
    </div>
  );
}

export default Wireless;
