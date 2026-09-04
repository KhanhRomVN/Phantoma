import React, { useEffect } from 'react';
import { useServerHealth } from '../providers/ServerHealthProvider';
import { useActiveModule } from '../modules/Tool/hooks/useActiveModule';

interface ServerHealthGuardProps {
  children: React.ReactNode;
}

export const ServerHealthGuard: React.FC<ServerHealthGuardProps> = ({ children }) => {
  const { activeModule, setActiveModule } = useActiveModule('recon');
  const { error, isValid } = useServerHealth();

  useEffect(() => {
    // Always allow access to settings page
    if (activeModule === 'settings') {
      return;
    }

    // If backend not reachable, redirect to settings
    if (!isValid || error) {
      setActiveModule('settings');
    }
  }, [isValid, error, setActiveModule, activeModule]);

  // Always render children on settings page
  if (activeModule === 'settings') {
    return <>{children}</>;
  }

  // If backend is valid, render children
  if (isValid && !error) {
    return <>{children}</>;
  }

  // Show loading state while checking
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="text-center">
        <div className="text-sm text-text-secondary">
          Connecting to Phantoma server...
        </div>
      </div>
    </div>
  );
};

export default ServerHealthGuard;