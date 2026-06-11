import React, { useState, useEffect } from 'react';

interface SettingProps {
  accentColor?: string;
}

const Setting: React.FC<SettingProps> = ({ accentColor = '#00e5ff' }) => {
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
    // Dispatch event để các component khác cập nhật
    window.dispatchEvent(new CustomEvent('serverUrlChanged', { detail: newUrl }));
  };

  const glow = accentColor + '25';

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <div
        style={{
          marginBottom: '24px',
          borderBottom: `1px solid ${accentColor}30`,
          paddingBottom: '8px',
        }}
      >
        <h2
          style={{
            fontSize: '16px',
            color: accentColor,
            margin: 0,
            letterSpacing: '0.1em',
          }}
        >
          SERVER CONFIGURATION
        </h2>
      </div>

      <div>
        <label
          style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 700,
            color: '#64748b',
            letterSpacing: '0.12em',
            marginBottom: '6px',
          }}
        >
          API SERVER URL
        </label>
        <input
          type="text"
          value={serverUrl}
          onChange={handleUrlChange}
          placeholder="localhost:8080"
          style={{
            width: '100%',
            padding: '12px 16px',
            background: '#0d1117',
            border: `1px solid ${accentColor}50`,
            borderRadius: '6px',
            color: '#e2e8f0',
            fontSize: '13px',
            fontFamily: 'monospace',
            outline: 'none',
            transition: 'all 0.2s',
            boxShadow: `0 0 10px ${glow}`,
          }}
        />
        <p
          style={{
            fontSize: '10px',
            color: '#475569',
            marginTop: '8px',
            marginBottom: 0,
          }}
        >
          Example: localhost:8080 | 192.168.1.100:8080 | api.example.com
        </p>
      </div>

      <div
        style={{
          marginTop: '24px',
          padding: '12px',
          background: '#0d1117',
          border: `1px solid ${accentColor}20`,
          borderRadius: '4px',
        }}
      >
        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
          ⚡ All security tools will use this server URL for API calls.
          <br />
          Make sure the server is running before executing scans.
        </p>
      </div>
    </div>
  );
};

export default Setting;