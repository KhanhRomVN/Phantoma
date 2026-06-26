import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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

const STORAGE_KEY = 'sqlite_path';

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [databasePath, setDatabasePath] = useState<string | null>(() => {
    let path = localStorage.getItem(STORAGE_KEY) || null;
    // Check if the stored path is the old project path
    if (path && path.includes('Documents/Coding/Systema & Phantoma - Combo Https And Hacking')) {
      localStorage.removeItem(STORAGE_KEY);
      path = null;
    }
    
    return path;
  });
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const validateDatabase = useCallback(async (path: string): Promise<boolean> => {
    if (!path) {
      setError('No database file selected');
      setIsValid(false);
      return false;
    }

    try {
      const result = await window.api.invoke('sqlite:validate', path);
      if (result.valid) {
        setError(null);
        setIsValid(true);
        return true;
      } else {
        setError(result.error || 'Invalid database file');
        setIsValid(false);
        
        // Nếu file không tồn tại, tự động tạo
        if (result.error === 'File does not exist') {
          const setupResult = await window.api.invoke('database:setup-auto');
          if (setupResult.success && setupResult.filePath) {
            // Retry validation
            const retryResult = await window.api.invoke('sqlite:validate', setupResult.filePath);
            if (retryResult.valid) {
              setError(null);
              setIsValid(true);
              return true;
            }
          }
        }
        
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to validate database file';
      console.error('[DatabaseProvider] ❌ Validation error:', errorMsg);
      setError(errorMsg);
      setIsValid(false);
      return false;
    }
  }, []);

  const selectDatabaseFile = useCallback(async () => {
    try {
      const result = await window.api.invoke('dialog:open-sqlite');
      if (result.canceled || !result.filePath) {
        return;
      }

      const path = result.filePath;
      localStorage.setItem(STORAGE_KEY, path);
      setDatabasePath(path);

      const valid = await validateDatabase(path);
      if (valid) {
        setError(null);
        setIsValid(true);
      } else {
        setIsValid(false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to select database file';
      console.error('[DatabaseProvider] ❌ Selection error:', errorMsg);
      setError(errorMsg);
      setIsValid(false);
    }
  }, [validateDatabase]);

  const createDatabaseFile = useCallback(async () => {
    try {
      const result = await window.api.invoke('dialog:save-sqlite');
      if (result.canceled || !result.filePath) {
        return;
      }

      const path = result.filePath;
      localStorage.setItem(STORAGE_KEY, path);
      setDatabasePath(path);

      const valid = await validateDatabase(path);
      if (valid) {
        setError(null);
        setIsValid(true);
      } else {
        setIsValid(false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create database file';
      console.error('[DatabaseProvider] ❌ Creation error:', errorMsg);
      setError(errorMsg);
      setIsValid(false);
    }
  }, [validateDatabase]);

  const setupAutoDatabase = useCallback(async () => {
    try {
      const result = await window.api.invoke('database:setup-auto');
      if (result.success && result.filePath) {
        const path = result.filePath;
        localStorage.setItem(STORAGE_KEY, path);
        setDatabasePath(path);
        const valid = await validateDatabase(path);
        if (valid) {
          setError(null);
          setIsValid(true);
        }
      } else {
        setError(result.error || 'Failed to setup database automatically');
        setIsValid(false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to setup database';
      console.error('[DatabaseProvider] ❌ Auto setup error:', errorMsg);
      setError(errorMsg);
      setIsValid(false);
    }
  }, [validateDatabase]);

  const clearError = useCallback(() => {
    setError(null);
    setIsValid(false);
  }, []);

  // Check file status periodically
  useEffect(() => {
    const initializeDatabase = async () => {
      setIsInitializing(true);
      
      // If no database path, try auto setup
      if (!databasePath) {
        await setupAutoDatabase();
        setIsInitializing(false);
        return;
      }

      // If path exists, validate it (checkFile will handle auto-creation if needed)
      setIsInitializing(false);
    };

    initializeDatabase();

    let intervalId: NodeJS.Timeout | null = null;

    const checkFile = async () => {
      if (!databasePath) {
        setError('No database file selected');
        setIsValid(false);
        return;
      }

      if (isChecking) {
        return;
      }
      setIsChecking(true);
      try {
        const valid = await validateDatabase(databasePath);
        
        // If file doesn't exist, try to auto-create it
        if (!valid && error === 'File does not exist') {
          await setupAutoDatabase();
        }
      } catch (err) {
        console.error('[DatabaseProvider] ❌ Check error:', err);
      } finally {
        setIsChecking(false);
      }
    };

    // Check immediately after initialization
    if (databasePath) {
      checkFile();
    }

    // Set up watcher - check every 5 seconds
    intervalId = setInterval(checkFile, 5000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [databasePath]);

  const value: DatabaseContextType = {
    databasePath,
    error,
    isValid,
    setDatabasePath: (path) => {
      if (path) {
        localStorage.setItem(STORAGE_KEY, path);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      setDatabasePath(path);
    },
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