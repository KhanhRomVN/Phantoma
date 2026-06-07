import { useState } from 'react';
import DomainScan from './Domain';

interface ScanProps {
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
> = {
  'scan-network': {
    Panel: () => <div className="flex-1 flex items-center justify-center text-[#2a3548]">Network Scan — Coming Soon</div>,
    TargetList: () => null,
    DataProvider: ({ children }) => <>{children}</>,
  },
  'scan-website': {
    Panel: () => <div className="flex-1 flex items-center justify-center text-[#2a3548]">Website Scan — Coming Soon</div>,
    TargetList: () => null,
    DataProvider: ({ children }) => <>{children}</>,
  },
};

const TARGET_LIST_VIEWS = new Set(Object.keys(VIEW_CONFIG));

export function Scan({ activeSubItem }: ScanProps) {
  const isDomainScan = !activeSubItem || activeSubItem === 'scan-domain';

  if (isDomainScan) {
    return <DomainScan />;
  }

  const showTargetList = TARGET_LIST_VIEWS.has(activeSubItem);
  const config = VIEW_CONFIG[activeSubItem];

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#2a3548]">
        Module not implemented
      </div>
    );
  }

  const [activeDomain, setActiveDomain] = useState<string>('example.com');
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