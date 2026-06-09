// src/renderer/src/features/Tool/components/WorkspaceSection/Tool/components/Nmap.tsx
// UI cho công cụ Nmap — hacker style, compact embedded

import React, { useState, useRef, useEffect } from 'react';

interface NmapScanParams {
  target: string;
  scanType: 'syn' | 'tcp' | 'udp' | 'ping';
  ports: string;
  aggressive: boolean;
  osDetection: boolean;
  versionDetection: boolean;
  timing: '0' | '1' | '2' | '3' | '4' | '5';
}

interface PortResult {
  port: number;
  protocol: string;
  service: string;
  state: 'open' | 'filtered' | 'closed';
  version?: string;
}

interface ScanResult {
  status: 'completed' | 'error';
  target: string;
  scanType: string;
  duration: string;
  host?: {
    ip: string;
    hostname?: string;
    os?: string;
    uptime?: string;
    mac?: string;
  };
  ports: PortResult[];
  scripts?: Array<{ name: string; output: string }>;
  rawOutput: string[];
}

const SCAN_TYPES = [
  { value: 'syn', label: 'SYN Scan', flag: '-sS', note: 'Stealth, requires root' },
  { value: 'tcp', label: 'TCP Connect', flag: '-sT', note: 'Full handshake, no root' },
  { value: 'udp', label: 'UDP Scan', flag: '-sU', note: 'UDP services, slower' },
  { value: 'ping', label: 'Ping Sweep', flag: '-sn', note: 'Host discovery only' },
];

const TIMING_LABELS = [
  'T0 Paranoid',
  'T1 Sneaky',
  'T2 Polite',
  'T3 Normal',
  'T4 Aggressive',
  'T5 Insane',
];

interface NmapToolProps {
  accentColor?: string;
}

const NmapTool: React.FC<NmapToolProps> = ({ accentColor = '#00e5ff' }) => {
  const [params, setParams] = useState<NmapScanParams>({
    target: '',
    scanType: 'syn',
    ports: '',
    aggressive: false,
    osDetection: true,
    versionDetection: true,
    timing: '3',
  });
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScanResult | null>(null);
  const [activeTab, setActiveTab] = useState<'ports' | 'host' | 'raw'>('ports');
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const glow = accentColor + '25';
  const glowStrong = accentColor + '40';

  // Build command preview
  const buildCommand = (): string => {
    const parts = ['nmap'];
    const t = SCAN_TYPES.find((s) => s.value === params.scanType);
    if (t) parts.push(t.flag);
    if (params.osDetection && !params.aggressive) parts.push('-O');
    if (params.versionDetection && !params.aggressive) parts.push('-sV');
    if (params.aggressive) parts.push('-A');
    parts.push(`-T${params.timing}`);
    if (params.ports) parts.push(`-p ${params.ports}`);
    parts.push(params.target || '<target>');
    return parts.join(' ');
  };

  const handleScan = async () => {
    if (!params.target.trim()) return;
    setScanning(true);
    setResults(null);
    setProgress(0);

    // Simulate progress
    let p = 0;
    progressRef.current = setInterval(() => {
      p += Math.random() * 8;
      if (p >= 95) p = 95;
      setProgress(Math.round(p));
    }, 200);

    // Simulate API call
    setTimeout(() => {
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);

      const mockResult: ScanResult = {
        status: 'completed',
        target: params.target,
        scanType: SCAN_TYPES.find((s) => s.value === params.scanType)?.label || '',
        duration: '4.23s',
        host: {
          ip: '93.184.216.34',
          hostname: params.target,
          os: params.osDetection || params.aggressive ? 'Linux 5.15 - 5.19' : undefined,
          uptime: '47 days',
          mac: '00:50:56:C0:00:08',
        },
        ports: [
          { port: 22, protocol: 'tcp', service: 'ssh', state: 'open', version: 'OpenSSH 8.9p1' },
          { port: 80, protocol: 'tcp', service: 'http', state: 'open', version: 'nginx 1.22.1' },
          { port: 443, protocol: 'tcp', service: 'https', state: 'open', version: 'nginx 1.22.1' },
          { port: 8080, protocol: 'tcp', service: 'http-proxy', state: 'filtered' },
          { port: 3306, protocol: 'tcp', service: 'mysql', state: 'closed' },
        ],
        scripts: params.aggressive
          ? [
              { name: 'http-title', output: 'Example Domain' },
              { name: 'ssl-cert', output: 'Subject: CN=*.example.com' },
              { name: 'ssh-hostkey', output: '256 SHA256:rsa key ...' },
            ]
          : undefined,
        rawOutput: [
          `Starting Nmap 7.94 ( https://nmap.org )`,
          `Nmap scan report for ${params.target} (93.184.216.34)`,
          `Host is up (0.042s latency).`,
          `Not shown: 995 filtered tcp ports (no-response)`,
          `PORT     STATE    SERVICE    VERSION`,
          `22/tcp   open     ssh        OpenSSH 8.9p1`,
          `80/tcp   open     http       nginx 1.22.1`,
          `443/tcp  open     https      nginx 1.22.1`,
          `8080/tcp filtered http-proxy`,
          `3306/tcp closed   mysql`,
          params.osDetection || params.aggressive ? `OS: Linux 5.15 - 5.19` : '',
          `Nmap done: 1 IP address (1 host up) scanned in 4.23 seconds`,
        ].filter(Boolean),
      };

      setResults(mockResult);
      setScanning(false);
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  const stateColor = (state: PortResult['state']) => {
    if (state === 'open') return '#34d399';
    if (state === 'filtered') return '#fbbf24';
    return '#374151';
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      {/* ── Command Preview ── */}
      <div
        style={{
          padding: '8px 12px',
          borderRadius: 4,
          background: '#0d1117',
          border: '1px solid #1a2236',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ color: '#334155', fontSize: 10 }}>$</span>
        <span
          style={{
            fontSize: 10,
            color: '#475569',
            fontFamily: 'inherit',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {buildCommand()}
        </span>
      </div>

      {/* ── Main Controls ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Target */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label
            style={{
              display: 'block',
              fontSize: 9,
              fontWeight: 700,
              color: '#374151',
              letterSpacing: '0.12em',
              marginBottom: 5,
            }}
          >
            TARGET
          </label>
          <input
            type="text"
            value={params.target}
            onChange={(e) => setParams({ ...params, target: e.target.value })}
            placeholder="192.168.1.1  |  example.com  |  10.0.0.0/24"
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 12px',
              background: '#0d1117',
              border: `1px solid ${params.target ? accentColor + '50' : '#1a2236'}`,
              borderRadius: 4,
              color: '#e2e8f0',
              fontSize: 11,
              outline: 'none',
              fontFamily: 'inherit',
              boxShadow: params.target ? `0 0 10px ${glow}` : 'none',
              transition: 'all 0.2s',
            }}
          />
        </div>

        {/* Scan Type */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 9,
              fontWeight: 700,
              color: '#374151',
              letterSpacing: '0.12em',
              marginBottom: 5,
            }}
          >
            SCAN TYPE
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SCAN_TYPES.map((st) => (
              <button
                key={st.value}
                onClick={() => setParams({ ...params, scanType: st.value as any })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  background: params.scanType === st.value ? glow : 'transparent',
                  border: `1px solid ${params.scanType === st.value ? accentColor + '50' : '#1a2236'}`,
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: params.scanType === st.value ? accentColor : '#1e293b',
                    boxShadow: params.scanType === st.value ? `0 0 6px ${accentColor}` : 'none',
                  }}
                />
                <div>
                  <span
                    style={{
                      fontSize: 10,
                      color: params.scanType === st.value ? accentColor : '#475569',
                      fontWeight: 700,
                    }}
                  >
                    {st.flag}
                  </span>
                  <span style={{ fontSize: 10, color: '#334155', marginLeft: 6 }}>{st.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right column: Ports + Timing + Flags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Ports */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 9,
                fontWeight: 700,
                color: '#374151',
                letterSpacing: '0.12em',
                marginBottom: 5,
              }}
            >
              PORTS <span style={{ color: '#1e293b', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              value={params.ports}
              onChange={(e) => setParams({ ...params, ports: e.target.value })}
              placeholder="22,80,443  |  1-1000  |  top-100"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '7px 10px',
                background: '#0d1117',
                border: '1px solid #1a2236',
                borderRadius: 4,
                color: '#94a3b8',
                fontSize: 10,
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Timing */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 9,
                fontWeight: 700,
                color: '#374151',
                letterSpacing: '0.12em',
                marginBottom: 5,
              }}
            >
              TIMING —{' '}
              <span style={{ color: accentColor, fontSize: 9 }}>
                {TIMING_LABELS[parseInt(params.timing)]}
              </span>
            </label>
            <div style={{ display: 'flex', gap: 3 }}>
              {(['0', '1', '2', '3', '4', '5'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setParams({ ...params, timing: t })}
                  style={{
                    flex: 1,
                    padding: '5px 0',
                    borderRadius: 3,
                    border: `1px solid ${params.timing === t ? accentColor + '60' : '#1a2236'}`,
                    background: params.timing === t ? glow : '#0d1117',
                    color: params.timing === t ? accentColor : '#334155',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  T{t}
                </button>
              ))}
            </div>
          </div>

          {/* Flags */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 9,
                fontWeight: 700,
                color: '#374151',
                letterSpacing: '0.12em',
                marginBottom: 5,
              }}
            >
              FLAGS
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                {
                  key: 'osDetection',
                  flag: '-O',
                  label: 'OS Detection',
                  disabled: params.aggressive,
                },
                {
                  key: 'versionDetection',
                  flag: '-sV',
                  label: 'Version Detection',
                  disabled: params.aggressive,
                },
                {
                  key: 'aggressive',
                  flag: '-A',
                  label: 'Aggressive (O+sV+sC+traceroute)',
                  disabled: false,
                },
              ].map((opt) => (
                <label
                  key={opt.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    opacity: opt.disabled ? 0.3 : 1,
                  }}
                >
                  <div
                    onClick={() => {
                      if (!opt.disabled)
                        setParams({ ...params, [opt.key]: !(params as any)[opt.key] });
                    }}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 2,
                      flexShrink: 0,
                      border: `1px solid ${(params as any)[opt.key] && !opt.disabled ? accentColor : '#1a2236'}`,
                      background: (params as any)[opt.key] && !opt.disabled ? glow : '#0d1117',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {(params as any)[opt.key] && !opt.disabled && (
                      <span style={{ fontSize: 8, color: accentColor, lineHeight: 1 }}>✓</span>
                    )}
                  </div>
                  <span style={{ fontSize: 9, color: '#334155' }}>
                    <span style={{ color: accentColor + '80', marginRight: 4 }}>{opt.flag}</span>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scan Button ── */}
      <button
        onClick={handleScan}
        disabled={scanning || !params.target.trim()}
        style={{
          width: '100%',
          padding: '10px',
          background:
            scanning || !params.target.trim()
              ? '#0d1117'
              : `linear-gradient(135deg, ${accentColor}20, ${accentColor}10)`,
          border: `1px solid ${scanning || !params.target.trim() ? '#1a2236' : accentColor + '80'}`,
          borderRadius: 4,
          color: scanning || !params.target.trim() ? '#334155' : accentColor,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.15em',
          cursor: scanning || !params.target.trim() ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          boxShadow: scanning || !params.target.trim() ? 'none' : `0 0 20px ${glow}`,
          transition: 'all 0.2s',
        }}
      >
        {scanning ? '// SCANNING...' : '// EXECUTE NMAP SCAN'}
      </button>

      {/* ── Progress Bar ── */}
      {scanning && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em' }}>
              SCANNING {params.target}
            </span>
            <span style={{ fontSize: 9, color: accentColor }}>{progress}%</span>
          </div>
          <div
            style={{
              height: 2,
              background: '#1a2236',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${accentColor}80, ${accentColor})`,
                boxShadow: `0 0 8px ${accentColor}`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {results && !scanning && (
        <div
          style={{
            border: `1px solid ${accentColor}30`,
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          {/* Result header */}
          <div
            style={{
              padding: '8px 14px',
              background: glow,
              borderBottom: `1px solid ${accentColor}20`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#34d399',
                boxShadow: '0 0 6px #34d399',
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: accentColor,
                letterSpacing: '0.1em',
                flex: 1,
              }}
            >
              SCAN COMPLETE — {results.target}
            </span>
            <span style={{ fontSize: 9, color: '#374151' }}>{results.duration}</span>
            <span style={{ fontSize: 9, color: '#34d399' }}>
              {results.ports.filter((p) => p.state === 'open').length} OPEN
            </span>
          </div>

          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              borderBottom: `1px solid #111827`,
              background: '#0d1117',
            }}
          >
            {(['ports', 'host', 'raw'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === tab ? accentColor : 'transparent'}`,
                  color: activeTab === tab ? accentColor : '#334155',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  transition: 'all 0.15s',
                }}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div
            style={{
              background: '#080b10',
              padding: '10px 14px',
              maxHeight: 260,
              overflowY: 'auto',
            }}
          >
            {/* PORTS tab */}
            {activeTab === 'ports' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr>
                    {['PORT', 'PROTO', 'STATE', 'SERVICE', 'VERSION'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '3px 8px',
                          color: '#1e293b',
                          fontWeight: 700,
                          fontSize: 8,
                          letterSpacing: '0.1em',
                          borderBottom: '1px solid #111827',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.ports.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #0d1117' }}>
                      <td style={{ padding: '4px 8px', color: accentColor, fontWeight: 700 }}>
                        {p.port}
                      </td>
                      <td style={{ padding: '4px 8px', color: '#334155' }}>{p.protocol}</td>
                      <td style={{ padding: '4px 8px' }}>
                        <span
                          style={{
                            color: stateColor(p.state),
                            fontWeight: 700,
                            fontSize: 9,
                            padding: '1px 5px',
                            borderRadius: 2,
                            background: stateColor(p.state) + '15',
                          }}
                        >
                          {p.state.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '4px 8px', color: '#64748b' }}>{p.service}</td>
                      <td style={{ padding: '4px 8px', color: '#475569', fontSize: 9 }}>
                        {p.version || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* HOST tab */}
            {activeTab === 'host' && results.host && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(results.host)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 12 }}>
                      <span
                        style={{
                          fontSize: 9,
                          color: '#334155',
                          width: 80,
                          flexShrink: 0,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {k}
                      </span>
                      <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'inherit' }}>
                        {v}
                      </span>
                    </div>
                  ))}
                {results.scripts && (
                  <>
                    <div style={{ height: 1, background: '#111827', margin: '4px 0' }} />
                    <span style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em' }}>
                      NSE SCRIPTS
                    </span>
                    {results.scripts.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <span
                          style={{
                            fontSize: 9,
                            color: accentColor + '80',
                            width: 80,
                            flexShrink: 0,
                          }}
                        >
                          {s.name}
                        </span>
                        <span style={{ fontSize: 9, color: '#475569' }}>{s.output}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* RAW tab */}
            {activeTab === 'raw' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {results.rawOutput.map((line, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10 }}>
                    <span
                      style={{
                        fontSize: 9,
                        color: '#1e293b',
                        width: 20,
                        flexShrink: 0,
                        textAlign: 'right',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: 'inherit',
                        color: line.startsWith('PORT')
                          ? accentColor
                          : line.includes('open')
                            ? '#34d399'
                            : line.includes('closed')
                              ? '#374151'
                              : line.includes('filtered')
                                ? '#fbbf24'
                                : line.startsWith('Starting') || line.startsWith('Nmap done')
                                  ? '#64748b'
                                  : '#475569',
                      }}
                    >
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const stateColor = (state: PortResult['state']) => {
  if (state === 'open') return '#34d399';
  if (state === 'filtered') return '#fbbf24';
  return '#374151';
};

export default NmapTool;
