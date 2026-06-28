import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiClient } from '../services/ApiClient';

interface DatabaseContextType {
  databasePath: string | null;
  error: string | null;
  isValid: boolean;
  setDatabasePath: (path: string | null) => void;
  validateDatabase: (path: string) => Promise<boolean>;
  selectDatabaseFile: () => Promise<void>;
  createDatabaseFile: () => Promise<void>;
  setupAutoDatabase: () => Promise<void>;
  clearError: () => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [databasePath, setDatabasePath] = useState<string | null>(() => {
    // Backend Go tự quản lý DB path, không cần lưu localStorage
    return null;
  });
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const validateDatabase = useCallback(async (_path: string): Promise<boolean> => {
    try {
      const healthy = await apiClient.healthCheck();
      setIsValid(healthy);
      if (!healthy) {
        setError('Backend server is not reachable. Please start the Phantoma server.');
      } else {
        setError(null);
      }
      return healthy;
    } catch {
      setError('Cannot connect to backend server');
      setIsValid(false);
      return false;
    }
  }, []);

  const selectDatabaseFile = useCallback(async () => {
    // Database do Go backend quản lý — không cần chọn file
    setIsValid(true);
    setError(null);
  }, []);

  const createDatabaseFile = useCallback(async () => {
    // Database do Go backend quản lý — không cần tạo file
    setIsValid(true);
    setError(null);
  }, []);

  const setupAutoDatabase = useCallback(async () => {
    // Database do Go backend quản lý — tự động khởi tạo khi server start
    const healthy = await apiClient.healthCheck();
    if (healthy) {
      setIsValid(true);
      setError(null);
      setDatabasePath('server');
    } else {
      setError('Backend server is not reachable');
      setIsValid(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check backend health periodically
  useEffect(() => {
    const checkHealth = async () => {
      if (isChecking) return;
      setIsChecking(true);
      try {
        const healthy = await apiClient.healthCheck();
        if (healthy) {
          setIsValid(true);
          setError(null);
          setDatabasePath('server');
        } else {
          setIsValid(false);
          setError('Backend server is not reachable');
        }
      } catch {
        setIsValid(false);
        setError('Cannot connect to backend server');
      } finally {
        setIsChecking(false);
      }
    };

    // Check immediately
    checkHealth();

    // Check every 5 seconds
    const intervalId = setInterval(checkHealth, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const value: DatabaseContextType = {
    databasePath,
    error,
    isValid,
    setDatabasePath,
    validateDatabase,
    selectDatabaseFile,
    createDatabaseFile,
    setupAutoDatabase,
    clearError,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export default DatabaseProvider;