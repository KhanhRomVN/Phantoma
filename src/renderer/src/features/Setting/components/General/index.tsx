import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useDatabase } from '../../../../providers/DatabaseProvider';

const General: React.FC = () => {
  const [serverUrl, setServerUrl] = useState('localhost:8080');
  const { databasePath, error, isValid, clearError } = useDatabase();

  useEffect(() => {
    const saved = localStorage.getItem('server_url');
    if (saved) {
      setServerUrl(saved);
    }
  }, []);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setServerUrl(newUrl);
    localStorage.setItem('server_url', newUrl);
    window.dispatchEvent(new CustomEvent('serverUrlChanged', { detail: newUrl }));
  };

  const formatPath = (path: string | null) => {
    if (!path) return 'No file selected';
    if (path.length > 60) {
      return '...' + path.slice(-57);
    }
    return path;
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-base text-primary m-0 mb-4">General Settings</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-text-primary tracking-wide mb-1.5">
            API Server URL
          </label>
          <input
            type="text"
            value={serverUrl}
            onChange={handleUrlChange}
            placeholder="localhost:8080"
            className="w-full max-w-md px-4 py-3 bg-input-background border border-border rounded-md text-text-primary text-[13px] font-mono outline-none transition-all focus:ring-1 focus:ring-primary focus:border-primary"
          />
          <p className="text-[10px] text-text-secondary mt-2 mb-0">
            Example: localhost:8080 | 192.168.1.100:8080 | api.example.com
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <label className="block text-sm font-medium text-text-primary tracking-wide mb-1.5">
            SQLite Database File
          </label>
          <p className="text-[10px] text-text-secondary mb-3">
            Database is automatically stored at{' '}
            <code className="text-xs bg-input-background px-1 py-0.5 rounded">
              ~/.phantoma/phantoma.sql
            </code>
          </p>

          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 px-3 py-2 bg-input-background border border-border rounded-md">
                <span className="text-text-secondary text-xs font-mono truncate flex-1">
                  {formatPath(databasePath)}
                </span>
                {isValid && databasePath && (
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                {error && <XCircle className="w-4 h-4 text-error shrink-0" />}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-md bg-error/20 border border-error/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-error">Database Error</p>
                  <p className="text-xs text-error/90 mt-0.5">{error}</p>
                  <p className="text-[10px] text-error/70 mt-2">
                    The database could not be accessed. Click the button below to reset and recreate
                    it.
                  </p>
                  <p className="text-[10px] text-error/70 mt-2">
                    The database will be automatically recreated when you restart the application.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default General;