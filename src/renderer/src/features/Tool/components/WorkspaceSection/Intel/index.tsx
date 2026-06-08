import { useState } from 'react';
import DomainRecon from './Domain';
import IpRecon from './IP';
import PersonRecon from './Person';

interface ReconProps {
  activeSubItem?: string | null;
}

const VIEW_CONFIG: Record<
  string,
  {
    Panel: React.ComponentType<{ activeDomain: string }>;
    TargetList: React.ComponentType<{
      activeDomain: string;
      onSelectDomain: (domain: string) => void;
    }>;
    DataProvider: React.ComponentType<{ children: React.ReactNode }>;
  }
> = {};

const TARGET_LIST_VIEWS = new Set(Object.keys(VIEW_CONFIG));

export function Recon({ activeSubItem }: ReconProps) {
  // Normalize sub-item: null/undefined defaults to domain recon
  const subItem = activeSubItem || 'recon-domain';

  switch (subItem) {
    case 'recon-domain':
      return <DomainRecon />;

    case 'recon-ip':
      return <IpRecon />;

    case 'recon-person':
      return <PersonRecon />;

    default: {
      // Legacy VIEW_CONFIG pattern for future extensibility
      const showTargetList = TARGET_LIST_VIEWS.has(subItem);
      const config = VIEW_CONFIG[subItem];

      if (!config) {
        return (
          <div className="flex-1 flex items-center justify-center flex-col gap-2">
            <span className="text-[32px] opacity-15">🚧</span>
            <div className="text-[13px] font-mono text-[#2a3548]">
              Module <span className="text-[#6a7a9a]">"{subItem}"</span> not implemented
            </div>
          </div>
        );
      }

      const [activeDomain, setActiveDomain] = useState<string>('phantom.tech');
      const { Panel, TargetList, DataProvider } = config;

      return (
        <div className="flex flex-1 overflow-hidden bg-[#080b10]">
          {showTargetList && (
            <TargetList activeDomain={activeDomain} onSelectDomain={setActiveDomain} />
          )}
          <div className="flex-1 flex flex-col overflow-hidden">
            <DataProvider>
              <Panel activeDomain={activeDomain} />
            </DataProvider>
          </div>
        </div>
      );
    }
  }
}
