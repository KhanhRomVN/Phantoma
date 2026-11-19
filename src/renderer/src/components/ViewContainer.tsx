/**
 * ViewContainer - Thay thế React Router
 *
 * Component này quản lý việc hiển thị các module bằng cách ẩn/hiện
 * thay vì mount/unmount, giúp giữ nguyên state, UI và data của mỗi module
 */

import { useState, useEffect, Suspense } from 'react';
import { useActiveModule } from '@renderer/hooks/useActiveModule';
import {
  MODULE_DEFINITIONS,
  getDefaultModuleId,
  type ModuleId,
} from '@renderer/config/module-registry';

interface ModuleConfig {
  id: ModuleId;
  initialized: boolean;
}

export const ViewContainer = () => {
  const defaultModuleId = getDefaultModuleId();
  const { activeModule } = useActiveModule(defaultModuleId);

  // Track which modules have been initialized (for lazy loading)
  const [modules, setModules] = useState<Map<ModuleId, ModuleConfig>>(() => {
    const map = new Map<ModuleId, ModuleConfig>();
    // Initialize default module
    map.set(defaultModuleId, {
      id: defaultModuleId,
      initialized: true,
    });
    return map;
  });

  // Lazy initialize modules when first accessed
  useEffect(() => {
    if (!modules.has(activeModule as ModuleId)) {
      setModules((prev) => {
        const next = new Map(prev);
        next.set(activeModule as ModuleId, {
          id: activeModule as ModuleId,
          initialized: true,
        });
        return next;
      });
    }
  }, [activeModule, modules]);

  return (
    <div className="relative h-full w-full">
      {MODULE_DEFINITIONS.map((moduleDef) => {
        const isInitialized = modules.has(moduleDef.id);
        const isActive = activeModule === moduleDef.id;

        // Don't render until initialized
        if (!isInitialized) return null;

        return (
          <div
            key={moduleDef.id}
            className="absolute inset-0 h-full w-full"
            style={{
              display: isActive ? 'block' : 'none',
              zIndex: isActive ? 1 : 0,
            }}
          >
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-background">
                  <div className="text-sm text-text-secondary">Loading {moduleDef.title}...</div>
                </div>
              }
            >
              {moduleDef.component}
            </Suspense>
          </div>
        );
      })}
    </div>
  );
};
