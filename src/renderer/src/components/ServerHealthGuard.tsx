import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useServerHealth } from '../providers/ServerHealthProvider';

interface ServerHealthGuardProps {
  children: React.ReactNode;
}

export const ServerHealthGuard: React.FC<ServerHealthGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { error, isValid } = useServerHealth();

  useEffect(() => {
    // Always allow access to settings page
    if (location.pathname === '/settings') {
      return;
    }

    // If backend not reachable, redirect to settings
    if (!isValid || error) {
      navigate('/settings');
    }
  }, [isValid, error, navigate, location.pathname]);

  // Always render children on settings page
  if (location.pathname === '/settings') {
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