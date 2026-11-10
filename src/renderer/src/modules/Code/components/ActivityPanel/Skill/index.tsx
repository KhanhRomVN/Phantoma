import { useState } from 'react';
import { AgentRootContext } from '@renderer/components/Widgets/Zen/context/AgentRootContext';
import { SettingsProvider } from '@renderer/components/Widgets/Zen/context/SettingsContext';
import { SkillPanel } from '@renderer/components/Widgets/Zen/feature/Marketplace';

export function Skill() {
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);

  return (
    <div ref={setRootEl} className="relative flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">

      <div className="relative flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
        <AgentRootContext.Provider value={rootEl}>
          <SettingsProvider>
            <SkillPanel
              header={
                <div className="flex items-center justify-between h-9 px-2 border-b border-divider flex-shrink-0 bg-sidebar-background">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-text-secondary truncate">
                    Skills
                  </span>
                </div>
              }
            />
          </SettingsProvider>
        </AgentRootContext.Provider>
      </div>
    </div>
  );
}