import { apiService } from '@renderer/services/api.service';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';

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
  const failureCount = useRef(0);
  const MAX_FAILURES_BEFORE_DOWN = 3; // Allow up to 3 consecutive failures (15s) before marking as down

  const clearError = useCallback(() => {
    setError(null);
    failureCount.current = 0;
    setIsValid(true);
  }, []);

  // Check backend health periodically every 5 seconds
  useEffect(() => {
    const checkHealth = async () => {
      if (isChecking.current) return;
      isChecking.current = true;
      try {
        const healthy = await apiService.healthCheck();
        if (healthy) {
          failureCount.current = 0;
          setIsValid(true);
          setError(null);
        } else {
          handleFailure('Backend server is not reachable. Please start the Phantoma server.');
        }
      } catch {
        handleFailure('Cannot connect to backend server');
      } finally {
        isChecking.current = false;
      }
    };

    const handleFailure = (msg: string) => {
      failureCount.current++;
      if (failureCount.current >= MAX_FAILURES_BEFORE_DOWN) {
        setIsValid(false);
        setError(msg);
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

  return <ServerHealthContext.Provider value={value}>{children}</ServerHealthContext.Provider>;
};

export const useServerHealth = (): ServerHealthContextType => {
  const context = useContext(ServerHealthContext);
  if (!context) {
    throw new Error('useServerHealth must be used within a ServerHealthProvider');
  }
  return context;
};

export default ServerHealthProvider;
