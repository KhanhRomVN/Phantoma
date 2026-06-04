// src/renderer/src/features/Tool/components/WorkspaceSection/Settings/index.tsx
import { useState } from 'react';
import {
  ModuleTabBar,
  ToolbarButton,
  KVRow,
  ActionButton,
} from '../../../../../core/components/ui';

const TABS = ['General', 'Network', 'API Keys', 'Tools'] as const;

export function Settings() {
  const [theme, setTheme] = useState('dark');
  const [tunInterface, setTunInterface] = useState('tun0');
  const [lhost, setLhost] = useState('10.10.14.5');
  const [shodanKey, setShodanKey] = useState('••••••••••••••');
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ModuleTabBar
        tabs={TABS}
        active="General"
        onTabChange={() => {}}
        activeColor="text-amber-400 border-amber-400 bg-amber-500/5"
      />
      <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
            <div className="text-[11px] font-bold text-cyan-400 mb-2">General</div>
            <KVRow
              label="Theme"
              value={
                <select
                  className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-0.5"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  <option>dark</option>
                  <option>light</option>
                </select>
              }
            />
            <KVRow
              label="Font size"
              value={
                <select>
                  <option>12px</option>
                  <option>14px</option>
                </select>
              }
            />
            <KVRow label="Timestamps" value={<input type="checkbox" defaultChecked />} />
          </div>
          <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
            <div className="text-[11px] font-bold text-cyan-400 mb-2">Network</div>
            <KVRow
              label="TUN interface"
              value={
                <input
                  className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-0.5"
                  value={tunInterface}
                  onChange={(e) => setTunInterface(e.target.value)}
                />
              }
            />
            <KVRow
              label="LHOST"
              value={
                <input
                  className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-0.5"
                  value={lhost}
                  onChange={(e) => setLhost(e.target.value)}
                />
              }
            />
            <KVRow label="Default LPORT" value="4444" />
          </div>
          <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
            <div className="text-[11px] font-bold text-cyan-400 mb-2">API Keys</div>
            <KVRow
              label="Shodan"
              value={
                <input
                  type="password"
                  className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-0.5"
                  value={shodanKey}
                  onChange={(e) => setShodanKey(e.target.value)}
                />
              }
            />
            <KVRow label="HIBP" value={<input type="password" />} />
            <KVRow label="VirusTotal" value={<input type="password" />} />
          </div>
          <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
            <div className="text-[11px] font-bold text-cyan-400 mb-2">Tool Paths</div>
            <KVRow label="Nmap" value="/usr/bin/nmap" />
            <KVRow label="Hashcat" value="/usr/bin/hashcat" />
            <KVRow label="Wordlist dir" value="/opt/wordlists/" />
          </div>
          <ActionButton variant="green">Save Changes</ActionButton>
        </div>
      </div>
    </div>
  );
}

// ─── Generic stub for unimplemented modules ───────────────────────────────────
export function Stub({ title = 'Module', description }: { title?: string; description?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#080a0e] text-[#3d4a61]">
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M9 9h6M9 12h6M9 15h4" />
      </svg>
      <div className="text-[13px] font-semibold tracking-wide uppercase">{title}</div>
      {description && <div className="text-[11px] text-[#3d4a61]">{description}</div>}
    </div>
  );
}
