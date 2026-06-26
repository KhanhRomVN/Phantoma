import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDatabase } from '../providers/DatabaseProvider';

interface DatabaseGuardProps {
  children: React.ReactNode;
}

export const DatabaseGuard: React.FC<DatabaseGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { databasePath, error, isValid } = useDatabase();

  useEffect(() => {
    // Always allow access to settings page
    if (location.pathname === '/settings') {
      return;
    }

    // If no database path or invalid, redirect to settings
    if (!databasePath || !isValid || error) {
      navigate('/settings');
    }
  }, [databasePath, isValid, error, navigate, location.pathname]);

  // Always render children on settings page
  if (location.pathname === '/settings') {
    return <>{children}</>;
  }

  // If database is valid, render children
  if (databasePath && isValid && !error) {
    return <>{children}</>;
  }

  // Show loading state while checking or redirecting
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="text-center">
        <div className="text-sm text-text-secondary">Checking database...</div>
      </div>
    </div>
  );
};

export default DatabaseGuard;