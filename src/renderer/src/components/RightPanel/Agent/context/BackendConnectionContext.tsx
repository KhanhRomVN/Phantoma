import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface BackendConnectionContextType {
  isConnected: boolean;
  isChecking: boolean;
  checkConnection: () => Promise<void>;
  apiUrl: string;
  setApiUrl: (url: string) => void;
}

const BackendConnectionContext = createContext<BackendConnectionContextType | undefined>(undefined);

const CHECK_INTERVAL = 5000; // 5 seconds
const HEALTH_ENDPOINT = '/v1/health';

export const BackendConnectionProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [apiUrl, setApiUrlState] = useState('http://localhost:8888');

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${apiUrl}${HEALTH_ENDPOINT}`, {
        signal: controller.signal,
        method: 'GET',
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setIsConnected(data.status === 'ok');
      } else {
        setIsConnected(false);
      }
    } catch (e) {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  const setApiUrl = (url: string) => {
    setApiUrlState(url);
    // Lưu vào storage
    const storage = (window as any).storage;
    if (storage) {
      try {
        storage.set('backend-api-url', url);
      } catch (e) {
        // Ignore
      }
    }
  };

  // Load API URL from storage
  useEffect(() => {
    const loadApiUrl = async () => {
      const storage = (window as any).storage;
      if (storage) {
        try {
          const res = await storage.get('backend-api-url');
          if (res?.value) {
            setApiUrlState(res.value);
          }
        } catch (e) {
          // Ignore
        }
      }
    };
    loadApiUrl();
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [apiUrl]);

  return (
    <BackendConnectionContext.Provider
      value={{
        isConnected,
        isChecking,
        checkConnection,
        apiUrl,
        setApiUrl,
      }}
    >
      {children}
    </BackendConnectionContext.Provider>
  );
};

export const useBackendConnection = () => {
  const context = useContext(BackendConnectionContext);
  if (context === undefined) {
    throw new Error('useBackendConnection must be used within a BackendConnectionProvider');
  }
  return context;
};