// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useState } from 'react';

// ── Utils ──
import { AgentRootContext } from '@renderer/modules/Code/shared/zen/zen-bridge';
import { SettingsProvider } from '@renderer/modules/Code/shared/zen/zen-bridge';
import { AccountPanel } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ─── Component ───────────────────────────────────────────────────────────────
export function Account() {
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);

  return (
    <div ref={setRootEl} className="relative flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
      <AgentRootContext.Provider value={rootEl}>
        <SettingsProvider>
          <AccountPanel embedded isOpen />
        </SettingsProvider>
      </AgentRootContext.Provider>
    </div>
  );
}
