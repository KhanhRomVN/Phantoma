// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useState } from 'react';

// ── Utils ──
import { AgentRootContext } from '@renderer/modules/Code/shared/zen/zen-bridge';
import { SettingsProvider } from '@renderer/modules/Code/shared/zen/zen-bridge';
import { SkillPanel } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ─── Component ───────────────────────────────────────────────────────────────
export function Skill() {
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);

  return (
    <div ref={setRootEl} className="relative flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
      <div className="relative flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
        <AgentRootContext.Provider value={rootEl}>
          <SettingsProvider>
            <SkillPanel
              header={
                <div className="flex items-center justify-between h-9 px-2 border-b border-border flex-shrink-0 bg-panel-background">
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
