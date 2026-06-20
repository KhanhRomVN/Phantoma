import { useEffect } from 'react';
import DomainScan from './Domain';
import NetworkScan from './Network';
import { useModulePersistence } from '../../hooks/useModulePersistence';

interface ScanState {
  activeSubItem: string;
}

interface ScanProps {
  activeSubItem?: string | null;
}

export default function Scan({ activeSubItem: propSubItem }: ScanProps) {
  const [state, setState] = useModulePersistence<ScanState>('scanner', {
    activeSubItem: propSubItem || 'scan-domain',
  });

  // Đồng bộ prop với state (khi prop thay đổi từ bên ngoài)
  useEffect(() => {
    if (propSubItem && propSubItem !== state.activeSubItem) {
      setState({ activeSubItem: propSubItem });
    }
  }, [propSubItem]);

  const subItem = state.activeSubItem;

  switch (subItem) {
    case 'scan-domain':
      return (
        <div className="flex flex-col h-full overflow-hidden bg-[#0f1319]">
          <DomainScan initialDomain="phantoma.com" />
        </div>
      );

    case 'scan-network':
      return (
        <div className="flex flex-col h-full overflow-hidden bg-[#0f1319]">
          <NetworkScan initialTarget="104.18.32.0/24" />
        </div>
      );

    default:
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-2 bg-[#0f1319]">
          <span className="text-[32px] opacity-15">🚧</span>
          <div className="text-[13px] font-mono text-[#2a3548]">
            Module <span className="text-[#6a7a9a]">"{subItem}"</span> not implemented
          </div>
        </div>
      );
  }
}
