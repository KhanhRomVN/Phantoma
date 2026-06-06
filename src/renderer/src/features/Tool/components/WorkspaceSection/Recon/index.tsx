// ============================================================================
// RECON — Main entry point with sub-view routing
// ============================================================================
import { useState } from 'react';
import DomainRecon from './Domain';

// import { IPServerPanel } from './IPServer/IPServerPanel';
// import { IPServerTargetList } from './IPServer/IPServerTargetList';
// import { ReconDataProvider as IPServerDataProvider } from './IPServer/ReconDataContext';

// import { WebsitePanel } from './Website/WebsitePanel';
// import { WebsiteTargetList } from './Website/WebsiteTargetList';
// import { ReconDataProvider as WebsiteDataProvider } from './Website/ReconDataContext';

// import { OrganizationPanel } from './Organization/OrganizationPanel';
// import { OrganizationTargetList } from './Organization/OrganizationTargetList';
// import { ReconDataProvider as OrganizationDataProvider } from './Organization/ReconDataContext';

// import { PersonPanel } from './Person/PersonPanel';
// import { PersonTargetList } from './Person/PersonTargetList';
// import { ReconDataProvider as PersonDataProvider } from './Person/ReconDataContext';

// import { SourceCodePanel } from './SourceCode/SourceCodePanel';
// import { SourceCodeTargetList } from './SourceCode/SourceCodeTargetList';
// import { ReconDataProvider as SourceCodeDataProvider } from './SourceCode/ReconDataContext';

// import { ServerPanel } from './Test/ServerPanel';
// import { ServerTargetList } from './Test/ServerTargetList';
// import { ReconDataProvider as TestDataProvider } from './Test/ReconDataContext';

interface ReconProps {
  activeSubItem?: string | null;
}

// Map sub-item IDs to their components and providers (for future sub-items)
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
  // 'recon-ipserver': {
  //   Panel: IPServerPanel,
  //   TargetList: IPServerTargetList,
  //   DataProvider: IPServerDataProvider,
  // },
  // 'recon-website': {
  //   Panel: WebsitePanel,
  //   TargetList: WebsiteTargetList,
  //   DataProvider: WebsiteDataProvider,
  // },
  // 'recon-organization': {
  //   Panel: OrganizationPanel,
  //   TargetList: OrganizationTargetList,
  //   DataProvider: OrganizationDataProvider,
  // },
  // 'recon-person': {
  //   Panel: PersonPanel,
  //   TargetList: PersonTargetList,
  //   DataProvider: PersonDataProvider,
  // },
  // 'recon-sourcecode': {
  //   Panel: SourceCodePanel,
  //   TargetList: SourceCodeTargetList,
  //   DataProvider: SourceCodeDataProvider,
  // },
  // 'recon-test': {
  //   Panel: ServerPanel,
  //   TargetList: ServerTargetList,
  //   DataProvider: TestDataProvider,
  // },
};

// Views that should show the target list (left sidebar)
const TARGET_LIST_VIEWS = new Set(Object.keys(VIEW_CONFIG));

export function Recon({ activeSubItem }: ReconProps) {
  // For domain recon (default or explicitly selected), render the new unified component
  const isDomainRecon = !activeSubItem || activeSubItem === 'recon-domain';

  if (isDomainRecon) {
    return <DomainRecon />;
  }

  // For other sub-items (when uncommented), use the old pattern
  const showTargetList = TARGET_LIST_VIEWS.has(activeSubItem);
  const config = VIEW_CONFIG[activeSubItem];

  if (!config) {
    return <div className="flex-1 flex items-center justify-center text-[#2a3548]">Module not implemented</div>;
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
