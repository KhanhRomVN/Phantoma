import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ServerConfigContextType {
  serverUrl: string;
  setServerUrl: (url: string) => void;
  getFullUrl: (endpoint: string) => string;
}

const ServerConfigContext = createContext<ServerConfigContextType | undefined>(undefined);

export const useServerConfig = () => {
  const context = useContext(ServerConfigContext);
  if (!context) {
    throw new Error('useServerConfig must be used within ServerConfigProvider');
  }
  return context;
};

interface ServerConfigProviderProps {
  children: ReactNode;
}

export const ServerConfigProvider: React.FC<ServerConfigProviderProps> = ({ children }) => {
  const [serverUrl, setServerUrl] = useState('localhost:8080');

  useEffect(() => {
    const saved = localStorage.getItem('server_url');
    if (saved) {
      setServerUrl(saved);
    }

    const handleStorageChange = () => {
      const newUrl = localStorage.getItem('server_url');
      if (newUrl) {
        setServerUrl(newUrl);
      }
    };

    const handleCustomEvent = (e: CustomEvent<string>) => {
      setServerUrl(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('serverUrlChanged', handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('serverUrlChanged', handleCustomEvent as EventListener);
    };
  }, []);

  const getFullUrl = (endpoint: string): string => {
    let baseUrl = serverUrl;
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `http://${baseUrl}`;
    }
    // Remove trailing slash if present
    baseUrl = baseUrl.replace(/\/$/, '');
    return `${baseUrl}${endpoint}`;
  };

  return (
    <ServerConfigContext.Provider value={{ serverUrl, setServerUrl, getFullUrl }}>
      {children}
    </ServerConfigContext.Provider>
  );
};