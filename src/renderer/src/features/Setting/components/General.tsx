import React, { useState, useEffect } from 'react';

const General: React.FC = () => {
  const [serverUrl, setServerUrl] = useState('localhost:8080');

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
      </div>
    </div>
  );
};

export default General;
