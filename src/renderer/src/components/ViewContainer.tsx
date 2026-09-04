/**
 * ViewContainer - Thay thế React Router
 * 
 * Component này quản lý việc hiển thị các module bằng cách ẩn/hiện
 * thay vì mount/unmount, giúp giữ nguyên state, UI và data của mỗi module
 */

import { useState, useEffect, ReactNode } from 'react';
import { useActiveModule } from '../modules/Tool/hooks/useActiveModule';

// Import all modules
import InspectorPage from '../modules/Tool';
import { Dashboard } from '../modules/Dashboard';
import Scan from '../modules/Scan';
import { Wireless } from '../modules/Wireless';
import Setting from '../modules/Setting';
import { Recon } from '../modules/Recon';
import TestPage from '../modules/Test';
import Code from '../modules/Code/Code';
import Emulate from '@renderer/modules/Emulate/Emulate';

export type ModuleId =
  | 'dashboard'
  | 'recon'
  | 'scanner'
  | 'tools'
  | 'test'
  | 'emulate'
  | 'code'
  | 'wireless'
  | 'target'
  | 'settings';

interface ModuleConfig {
  id: ModuleId;
  component: ReactNode;
  initialized: boolean;
}

export const ViewContainer = () => {
  const { activeModule } = useActiveModule('recon');
  
  // Khởi tạo tất cả modules một lần duy nhất
  const [modules] = useState<Map<ModuleId, ModuleConfig>>(() => {
    const map = new Map<ModuleId, ModuleConfig>();
    
    // Khởi tạo module mặc định (recon)
    map.set('recon', {
      id: 'recon',
      component: <Recon />,
      initialized: true,
    });
    
    return map;
  });

  // Lazy initialize modules when first accessed
  useEffect(() => {
    if (!modules.has(activeModule as ModuleId)) {
      const newModule: ModuleConfig = {
        id: activeModule as ModuleId,
        component: getModuleComponent(activeModule as ModuleId),
        initialized: true,
      };
      modules.set(activeModule as ModuleId, newModule);
    }
  }, [activeModule, modules]);

  return (
    <div className="relative w-full h-full">
      {Array.from(modules.entries()).map(([id, config]) => (
        <div
          key={id}
          className="absolute inset-0 w-full h-full"
          style={{
            display: activeModule === id ? 'block' : 'none',
            zIndex: activeModule === id ? 1 : 0,
          }}
        >
          {config.component}
        </div>
      ))}
    </div>
  );
};

// Helper function to get module component
function getModuleComponent(moduleId: ModuleId): ReactNode {
  switch (moduleId) {
    case 'dashboard':
      return <Dashboard />;
    case 'recon':
      return <Recon />;
    case 'scanner':
      return <Scan activeSubItem="scan-domain" />;
    case 'tools':
      return <InspectorPage />;
    case 'test':
      return <TestPage />;
    case 'emulate':
      return <Emulate />;
    case 'code':
      return <Code />;
    case 'wireless':
      return <Wireless />;
    case 'target':
      return <InspectorPage />;
    case 'settings':
      return <Setting />;
    default:
      return <Recon />;
  }
}
