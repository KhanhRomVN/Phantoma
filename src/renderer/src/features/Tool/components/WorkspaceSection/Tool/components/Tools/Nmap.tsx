// src/renderer/src/features/Tool/components/WorkspaceSection/Tool/components/Nmap.tsx
// UI cho công cụ Nmap — hacker style, compact embedded

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import nmapDoc from '../../docs/nmap.md?raw';
import { CodeBlock } from '../../../../../../../core/components/CodeBlock';

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
  activeTab?: 'information' | 'execution' | 'history' | 'logs';
  onTabChange?: (tab: 'information' | 'execution' | 'history' | 'logs') => void;
}

const NmapTool: React.FC<NmapToolProps> = ({
  accentColor = '#00e5ff',
  activeTab = 'information',
  onTabChange,
}) => {
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
  const [resultActiveTab, setResultActiveTab] = useState<'ports' | 'host' | 'raw'>('ports');
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);
  const historyContainerRef = useRef<HTMLDivElement>(null);
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

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().slice(11, 19);
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]);
  };

  const handleScan = async () => {
    if (!params.target.trim()) return;
    addLog(`Starting scan on ${params.target} with ${params.scanType} scan`);
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

      setHistory((prev) => [mockResult, ...prev.slice(0, 9)]);
      addLog(
        `Scan completed: ${mockResult.ports.filter((p) => p.state === 'open').length} open ports found`,
      );
      setScanning(false);
      setExpandedCardIndex(0);
      if (onTabChange) onTabChange('history');
      setTimeout(() => {
        if (historyContainerRef.current) {
          historyContainerRef.current.scrollTop = 0;
        }
      }, 100);
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

  // Information tab content with markdown
  const renderInformation = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          padding: '12px 16px',
          background: '#0d1117',
          border: `1px solid ${accentColor}30`,
          borderRadius: 6,
        }}
      >
        <ReactMarkdown
          components={{
            h1: ({ children }: { children?: React.ReactNode }) => (
              <h1
                style={{
                  fontSize: 16,
                  color: accentColor,
                  marginBottom: 12,
                  letterSpacing: '0.1em',
                }}
              >
                {children}
              </h1>
            ),
            h2: ({ children }: { children?: React.ReactNode }) => (
              <h2 style={{ fontSize: 14, color: accentColor, marginTop: 16, marginBottom: 8 }}>
                {children}
              </h2>
            ),
            h3: ({ children }: { children?: React.ReactNode }) => (
              <h3 style={{ fontSize: 13, color: accentColor, marginBottom: 8 }}>{children}</h3>
            ),
            p: ({ children }: { children?: React.ReactNode }) => (
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12 }}>
                {children}
              </p>
            ),
            ul: ({ children }: { children?: React.ReactNode }) => (
              <ul style={{ fontSize: 11, color: '#94a3b8', margin: '8px 0', paddingLeft: 20 }}>
                {children}
              </ul>
            ),
            li: ({ children }: { children?: React.ReactNode }) => (
              <li style={{ marginBottom: 4 }}>{children}</li>
            ),
            code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
              const isBlock = className?.includes('language');
              return isBlock ? (
                <pre
                  style={{
                    fontSize: 11,
                    color: '#cbd5e1',
                    background: '#080b10',
                    padding: 12,
                    borderRadius: 4,
                    overflowX: 'auto',
                    margin: '12px 0',
                  }}
                >
                  <code>{children}</code>
                </pre>
              ) : (
                <code
                  style={{
                    fontSize: 11,
                    color: accentColor,
                    background: '#080b10',
                    padding: '2px 4px',
                    borderRadius: 3,
                  }}
                >
                  {children}
                </code>
              );
            },
            table: ({ children }: { children?: React.ReactNode }) => (
              <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  {children}
                </table>
              </div>
            ),
            th: ({ children }: { children?: React.ReactNode }) => (
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  color: accentColor,
                  borderBottom: `1px solid ${accentColor}30`,
                  backgroundColor: `${accentColor}10`,
                }}
              >
                {children}
              </th>
            ),
            td: ({ children }: { children?: React.ReactNode }) => (
              <td
                style={{ padding: '6px 8px', color: '#94a3b8', borderBottom: '1px solid #1a2236' }}
              >
                {children}
              </td>
            ),
          }}
        >
          {nmapDoc}
        </ReactMarkdown>
      </div>
    </div>
  );

  // Execution tab content (original scan UI)
  const renderExecution = () => (
    <>
      {/* ── Command Preview with label and copy ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <label
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '0.12em',
            }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltip({
                text: 'Lệnh Nmap sẽ được thực thi. Bạn có thể copy để chạy thủ công nếu cần.',
                x: rect.left,
                y: rect.bottom + 5,
              });
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            COMMAND
          </label>
          <div
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltip({
                text: 'Lệnh Nmap sẽ được thực thi. Bạn có thể copy để chạy thủ công nếu cần.',
                x: rect.left,
                y: rect.bottom + 5,
              });
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
          </div>
        </div>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 4,
            background: '#0d1117',
            border: '1px solid #1a2236',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            position: 'relative',
          }}
        >
          <span style={{ color: '#64748b', fontSize: 12 }}>$</span>
          <span
            style={{
              fontSize: 12,
              color: '#94a3b8',
              fontFamily: 'inherit',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {buildCommand()}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(buildCommand());
              addLog('Command copied to clipboard');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              color: '#64748b',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = accentColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Main Controls ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Target */}
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#64748b',
                letterSpacing: '0.12em',
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({
                  text: 'Địa chỉ IP, tên miền hoặc dải mạng cần quét. Ví dụ: 192.168.1.1, example.com, 10.0.0.0/24',
                  x: rect.left,
                  y: rect.bottom + 5,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              TARGET
            </label>
            <div
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({
                  text: 'Địa chỉ IP, tên miền hoặc dải mạng cần quét. Ví dụ: 192.168.1.1, example.com, 10.0.0.0/24',
                  x: rect.left,
                  y: rect.bottom + 5,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </div>
          </div>
          <input
            type="text"
            value={params.target}
            onChange={(e) => setParams({ ...params, target: e.target.value })}
            placeholder="192.168.1.1  |  example.com  |  10.0.0.0/24"
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 14px',
              background: '#0d1117',
              border: `1px solid ${params.target ? accentColor + '50' : '#1a2236'}`,
              borderRadius: 4,
              color: '#e2e8f0',
              fontSize: 12,
              outline: 'none',
              fontFamily: 'inherit',
              boxShadow: params.target ? `0 0 10px ${glow}` : 'none',
              transition: 'all 0.2s',
            }}
          />
        </div>

        {/* Scan Type */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#64748b',
                letterSpacing: '0.12em',
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({
                  text: 'Phương thức quét cổng: SYN (stealth, cần root), TCP Connect (full handshake), UDP (chậm), Ping Sweep (chỉ phát hiện host)',
                  x: rect.left,
                  y: rect.bottom + 5,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              SCAN TYPE
            </label>
            <div
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({
                  text: 'Phương thức quét cổng: SYN (stealth, cần root), TCP Connect (full handshake), UDP (chậm), Ping Sweep (chỉ phát hiện host)',
                  x: rect.left,
                  y: rect.bottom + 5,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SCAN_TYPES.map((st) => (
              <button
                key={st.value}
                onClick={() => setParams({ ...params, scanType: st.value as any })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 4,
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
                      fontSize: 11,
                      color: params.scanType === st.value ? accentColor : '#94a3b8',
                      fontWeight: 700,
                    }}
                  >
                    {st.flag}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>{st.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right column: Ports + Timing + Flags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Ports */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#64748b',
                  letterSpacing: '0.12em',
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    text: 'Cổng cần quét. Định dạng: cổng đơn (22,80), dải (1-1000), hoặc danh sách (22,80,443). Để trống để quét các cổng phổ biến.',
                    x: rect.left,
                    y: rect.bottom + 5,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                PORTS <span style={{ color: '#475569', fontWeight: 400 }}>(optional)</span>
              </label>
              <div
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    text: 'Cổng cần quét. Định dạng: cổng đơn (22,80), dải (1-1000), hoặc danh sách (22,80,443). Để trống để quét các cổng phổ biến.',
                    x: rect.left,
                    y: rect.bottom + 5,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
            </div>
            <input
              type="text"
              value={params.ports}
              onChange={(e) => setParams({ ...params, ports: e.target.value })}
              placeholder="22,80,443  |  1-1000  |  top-100"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '9px 12px',
                background: '#0d1117',
                border: '1px solid #1a2236',
                borderRadius: 4,
                color: '#cbd5e1',
                fontSize: 11,
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Timing */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#64748b',
                  letterSpacing: '0.12em',
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    text: 'Tốc độ quét: T0 (chậm nhất, tránh IDS), T3 (bình thường), T5 (nhanh nhất, dễ bị phát hiện). Càng nhanh càng aggressive.',
                    x: rect.left,
                    y: rect.bottom + 5,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                TIMING —{' '}
                <span style={{ color: accentColor, fontSize: 11 }}>
                  {TIMING_LABELS[parseInt(params.timing)]}
                </span>
              </label>
              <div
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    text: 'Tốc độ quét: T0 (chậm nhất, tránh IDS), T3 (bình thường), T5 (nhanh nhất, dễ bị phát hiện). Càng nhanh càng aggressive.',
                    x: rect.left,
                    y: rect.bottom + 5,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['0', '1', '2', '3', '4', '5'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setParams({ ...params, timing: t })}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: 4,
                    border: `1px solid ${params.timing === t ? accentColor + '60' : '#1a2236'}`,
                    background: params.timing === t ? glow : '#0d1117',
                    color: params.timing === t ? accentColor : '#64748b',
                    fontSize: 11,
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

          {/* Flags with Check icon */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#64748b',
                  letterSpacing: '0.12em',
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    text: 'Cờ bổ sung: -O (phát hiện OS), -sV (phát hiện version), -A (aggressive - bật tất cả). Aggressive sẽ tự động bật OS và version detection.',
                    x: rect.left,
                    y: rect.bottom + 5,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                FLAGS
              </label>
              <div
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    text: 'Cờ bổ sung: -O (phát hiện OS), -sV (phát hiện version), -A (aggressive - bật tất cả). Aggressive sẽ tự động bật OS và version detection.',
                    x: rect.left,
                    y: rect.bottom + 5,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                      width: 16,
                      height: 16,
                      borderRadius: 3,
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
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={accentColor}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    <span style={{ color: accentColor + '99', marginRight: 6 }}>{opt.flag}</span>
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
          padding: '12px',
          background:
            scanning || !params.target.trim()
              ? '#0d1117'
              : `linear-gradient(135deg, ${accentColor}20, ${accentColor}10)`,
          border: `1px solid ${scanning || !params.target.trim() ? '#1a2236' : accentColor + '80'}`,
          borderRadius: 4,
          color: scanning || !params.target.trim() ? '#64748b' : accentColor,
          fontSize: 12,
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
    </>
  );

  // History tab content with improved cards
  const renderHistory = () => (
    <div
      ref={historyContainerRef}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}
    >
      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 12 }}>
          No scan history yet. Run a scan to see results here.
        </div>
      ) : (
        history.map((scan, idx) => {
          const isExpanded = expandedCardIndex === idx;
          const openPorts = scan.ports.filter(p => p.state === 'open');
          return (
            <div
              key={idx}
              style={{
                background: '#0d1117',
                border: `1px solid ${expandedCardIndex === idx ? accentColor : '#1a2236'}`,
                borderRadius: 6,
                transition: 'all 0.15s',
              }}
            >
              {/* Card header - click to expand */}
              <div
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
                onClick={() => setExpandedCardIndex(isExpanded ? null : idx)}
              >
                {/* Left side: target and scan type */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 2 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#34d399',
                      boxShadow: '0 0 6px #34d399',
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>
                    {scan.target}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b', background: '#1a2236', padding: '2px 8px', borderRadius: 4 }}>
                    {scan.scanType}
                  </span>
                </div>

                {/* Right side: stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: 20, alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Duration</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{scan.duration}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Open Ports</span>
                    <span style={{ fontSize: 11, color: '#34d399' }}>{openPorts.length}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Total Ports</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{scan.ports.length}</span>
                  </div>
                  {scan.host?.os && (
                    <div>
                      <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>OS</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{scan.host.os.substring(0, 20)}</span>
                    </div>
                  )}
                </div>

                {/* Expand icon */}
                <div style={{ fontSize: 16, color: accentColor }}>
                  {isExpanded ? '▲' : '▼'}
                </div>
              </div>

              {/* Expanded content - detailed results */}
              {isExpanded && (
                <div style={{ borderTop: `1px solid ${accentColor}30`, padding: '12px 16px', background: '#080b10' }}>
                  {/* Ports table */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, marginBottom: 8, letterSpacing: '0.1em' }}>
                      OPEN PORTS
                    </div>
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                        <thead>
                          <tr>
                            {['PORT', 'PROTO', 'STATE', 'SERVICE', 'VERSION'].map(h => (
                              <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#475569', borderBottom: '1px solid #1a2236' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {scan.ports.map((p, i) => (
                            <tr key={i}>
                              <td style={{ padding: '6px 8px', color: accentColor, fontWeight: 700 }}>{p.port}</td>
                              <td style={{ padding: '6px 8px', color: '#64748b' }}>{p.protocol}</td>
                              <td style={{ padding: '6px 8px' }}>
                                <span style={{ color: stateColor(p.state), fontWeight: 700 }}>{p.state.toUpperCase()}</span>
                              </td>
                              <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{p.service}</td>
                              <td style={{ padding: '6px 8px', color: '#64748b' }}>{p.version || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Host info if available */}
                  {scan.host && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, marginBottom: 8, letterSpacing: '0.1em' }}>
                        HOST INFORMATION
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                        {scan.host.ip && <div><span style={{ color: '#64748b' }}>IP:</span> <span style={{ color: '#94a3b8' }}>{scan.host.ip}</span></div>}
                        {scan.host.hostname && <div><span style={{ color: '#64748b' }}>Hostname:</span> <span style={{ color: '#94a3b8' }}>{scan.host.hostname}</span></div>}
                        {scan.host.os && <div><span style={{ color: '#64748b' }}>OS:</span> <span style={{ color: '#94a3b8' }}>{scan.host.os}</span></div>}
                        {scan.host.uptime && <div><span style={{ color: '#64748b' }}>Uptime:</span> <span style={{ color: '#94a3b8' }}>{scan.host.uptime}</span></div>}
                        {scan.host.mac && <div><span style={{ color: '#64748b' }}>MAC:</span> <span style={{ color: '#94a3b8' }}>{scan.host.mac}</span></div>}
                      </div>
                    </div>
                  )}

                  {/* Scripts preview */}
                  {scan.scripts && scan.scripts.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, marginBottom: 8, letterSpacing: '0.1em' }}>
                        NSE SCRIPTS ({scan.scripts.length})
                      </div>
                      <div style={{ maxHeight: 150, overflowY: 'auto', fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>
                        {scan.scripts.map((s, i) => (
                          <div key={i} style={{ marginBottom: 4 }}><span style={{ color: accentColor }}>{s.name}:</span> {s.output.substring(0, 100)}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw output preview */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, marginBottom: 8, letterSpacing: '0.1em' }}>
                      RAW OUTPUT (first 10 lines)
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', background: '#0d1117', padding: 8, borderRadius: 4, maxHeight: 150, overflowY: 'auto' }}>
                      {scan.rawOutput.slice(0, 10).map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                      {scan.rawOutput.length > 10 && <div>... and {scan.rawOutput.length - 10} more lines</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  // Logs tab content with CodeBlock
  const renderLogs = () => {
    const logText =
      logs.length === 0 ? 'No logs yet. Run a scan to see output here.' : logs.join('\n');
    return (
      <div style={{ height: 400, display: 'flex', flexDirection: 'column' }}>
        <CodeBlock
          code={logText}
          language="text"
          showLineNumbers={true}
          wordWrap="on"
          editorOptions={{ readOnly: true, fontSize: 11 }}
        />
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        fontFamily: '"JetBrains Mono", monospace',
        position: 'relative',
      }}
    >
      {activeTab === 'information' && renderInformation()}
      {activeTab === 'execution' && renderExecution()}
      {activeTab === 'history' && renderHistory()}
      {activeTab === 'logs' && renderLogs()}

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            top: tooltip.y,
            left: tooltip.x,
            background: '#1a2236',
            color: '#cbd5e1',
            fontSize: 11,
            padding: '6px 12px',
            borderRadius: 4,
            border: `1px solid ${accentColor}50`,
            boxShadow: `0 4px 12px rgba(0,0,0,0.4)`,
            zIndex: 1000,
            maxWidth: 280,
            pointerEvents: 'none',
            whiteSpace: 'normal',
            fontFamily: 'inherit',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default NmapTool;
