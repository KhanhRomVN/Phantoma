import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { apiClient } from '../services/ApiClient';

interface ServerHealthContextType {
  error: string | null;
  isValid: boolean;
  clearError: () => void;
}

const ServerHealthContext = createContext<ServerHealthContextType | undefined>(undefined);

interface ServerHealthProviderProps {
  children: ReactNode;
}

export const ServerHealthProvider: React.FC<ServerHealthProviderProps> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean>(false);
  const isChecking = useRef(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check backend health periodically every 5 seconds
  useEffect(() => {
    const checkHealth = async () => {
      if (isChecking.current) return;
      isChecking.current = true;
      try {
        const healthy = await apiClient.healthCheck();
        if (healthy) {
          setIsValid(true);
          setError(null);
        } else {
          setIsValid(false);
          setError('Backend server is not reachable. Please start the Phantoma server.');
        }
      } catch {
        setIsValid(false);
        setError('Cannot connect to backend server');
      } finally {
        isChecking.current = false;
      }
    };

    // Check immediately on mount
    checkHealth();

    // Check every 5 seconds
    const intervalId = setInterval(checkHealth, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const value: ServerHealthContextType = {
    error,
    isValid,
    clearError,
  };

  return (
    <ServerHealthContext.Provider value={value}>
      {children}
    </ServerHealthContext.Provider>
  );
};

export const useServerHealth = (): ServerHealthContextType => {
  const context = useContext(ServerHealthContext);
  if (!context) {
    throw new Error('useServerHealth must be used within a ServerHealthProvider');
  }
  return context;
};

export default ServerHealthProvider;