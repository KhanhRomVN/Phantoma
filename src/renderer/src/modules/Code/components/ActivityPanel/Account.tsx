import { useState } from 'react';
import { AgentRootContext } from '@renderer/components/RightPanel/Zen/context/AgentRootContext';
import { SettingsProvider } from '@renderer/components/RightPanel/Zen/context/SettingsContext';
import AccountPanel from '@renderer/components/RightPanel/Zen/feature/Account';

export function Account() {
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);

  return (
    <div
      ref={setRootEl}
      className="relative flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col"
    >
      <AgentRootContext.Provider value={rootEl}>
        <SettingsProvider>
          <AccountPanel embedded isOpen />
        </SettingsProvider>
      </AgentRootContext.Provider>
    </div>
  );
}