/**
 * ViewContainer - Thay thế React Router
 *
 * Component này quản lý việc hiển thị các module bằng cách ẩn/hiện
 * thay vì mount/unmount, giúp giữ nguyên state, UI và data của mỗi module
 */

import { useState, useEffect, ReactNode } from 'react';

// Import all modules
import Setting from '../modules/Setting';
import { Recon } from '../modules/Recon';
import Code from '../modules/Code/Code';
import Emulate from '@renderer/modules/Emulate/Emulate';
import Test from '../modules/Test';

// -- Hooks --
import { useActiveModule } from '@renderer/hooks/useActiveModule';

export type ModuleId = 'recon' | 'emulate' | 'code' | 'settings' | 'test';

interface ModuleConfig {
  id: ModuleId;
  component: ReactNode;
  initialized: boolean;
}

export const ViewContainer = () => {
  const { activeModule } = useActiveModule('recon');

  // Khởi tạo tất cả modules một lần duy nhất
  const [modules, setModules] = useState<Map<ModuleId, ModuleConfig>>(() => {
    const map = new Map<ModuleId, ModuleConfig>();

    // Khởi tạo module mặc định (recon)
    map.set('recon', {
      id: 'recon',
      component: <Recon />,
      initialized: true,
    });

    return map;
  });

  // Lazy initialize modules when first accessed.
  // Dùng setModules với Map mới (immutable) thay vì mutate trực tiếp — mutate Map
  // không trigger re-render nên module mới sẽ không xuất hiện trong DOM.
  useEffect(() => {
    if (!modules.has(activeModule as ModuleId)) {
      setModules((prev) => {
        const next = new Map(prev);
        next.set(activeModule as ModuleId, {
          id: activeModule as ModuleId,
          component: getModuleComponent(activeModule as ModuleId),
          initialized: true,
        });
        return next;
      });
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
    case 'recon':
      return <Recon />;
    case 'emulate':
      return <Emulate />;
    case 'code':
      return <Code />;
    case 'settings':
      return <Setting />;
    case 'test':
      return <Test />;
    default:
      return <Recon />;
  }
}
