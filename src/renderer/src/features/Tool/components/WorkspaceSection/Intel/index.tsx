import { useState } from 'react';
import Domain from './Domain';
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
  const isDomainRecon = !activeSubItem || activeSubItem === 'recon-domain';

  if (isDomainRecon) {
    return <Domain />;
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
