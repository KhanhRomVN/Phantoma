import { useState } from 'react';
import { cn } from '../../../../../shared/lib/utils';
import NetworkAttack from './Network/index';
import WebsiteAttack from './Website/index';
import ClientAttack from './Client/index';
import { Globe, Network, Users, Building2 } from 'lucide-react';

const ATTACK_MODULES = [
  { id: 'website', label: 'Website', icon: Globe, accent: '#0af', description: 'SQLi, XSS, LFI, SSRF, XXE, Deserialization' },
  { id: 'network', label: 'Network', icon: Network, accent: '#30d158', description: 'EternalBlue, Brute-force, Service RCE' },
  { id: 'client', label: 'Client', icon: Users, accent: '#f5a623', description: 'Phishing, Malware Dropper' },
  { id: 'ad', label: 'AD', icon: Building2, accent: '#ff2d55', description: 'Kerberoasting, DCSync, Golden Ticket' },
] as const;

type AttackModuleId = (typeof ATTACK_MODULES)[number]['id'];

export default function AttackWorkspace() {
  const [activeModule, setActiveModule] = useState<AttackModuleId>('network');

  const renderModule = () => {
    switch (activeModule) {
      case 'website':
        return <WebsiteAttack />;
      case 'network':
        return <NetworkAttack />;
      case 'client':
        return <ClientAttack />;
      case 'ad':
        return (
          <div className="flex-1 flex items-center justify-center bg-[#0f1319]">
            <div className="text-center">
              <div className="text-[32px] opacity-15 mb-2">🏛️</div>
              <div className="text-[11px] font-mono text-[#2a3548]">Active Directory Attack — Coming Soon</div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0f1319]">
      {/* Left sidebar: Module selector */}
      <div className="w-[220px] bg-[#0f1319] border-r border-[#1c2333] flex flex-col shrink-0 overflow-hidden">
        <div className="flex items-center px-3 h-[40px] border-b border-[#1c2333] shrink-0 bg-[#0f1319]">
          <span className="text-[14px] font-bold tracking-[0.12em] text-[#ff2d55] font-mono">
            ATTACK
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {ATTACK_MODULES.map((mod) => {
            const isActive = activeModule === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id)}
                className={cn(
                  'w-full text-left p-2.5 rounded transition-all border',
                  isActive
                    ? 'bg-[#0d1017] border-[#1c2333]'
                    : 'border-transparent hover:bg-[#111827] hover:border-[#1c2333]'
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <mod.icon
                    className="w-4 h-4"
                    style={{ color: isActive ? mod.accent : '#4a5a7a' }}
                  />
                  <span
                    className="text-[12px] font-mono font-bold"
                    style={{ color: isActive ? '#c8d6f0' : '#6a7a9a' }}
                  >
                    {mod.label}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[#2a3548] pl-6">
                  {mod.description}
                </div>
              </button>
            );
          })}
        </div>
        {/* Safety warning */}
        <div className="p-2 border-t border-[#1c2333] shrink-0">
          <div className="bg-[#ff2d5508] border border-[#ff2d5520] rounded p-2">
            <div className="text-[10px] font-mono text-[#ff2d55] leading-relaxed">
              ⚠️ Only attack targets you are authorized to test. All actions are logged.
            </div>
          </div>
        </div>
      </div>

      {/* Right content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderModule()}
      </div>
    </div>
  );
}