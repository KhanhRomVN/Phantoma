// src/renderer/src/features/Tool/components/WorkspaceSection/Tool/components/Nmap.tsx
// UI cho công cụ Nmap — hacker style, compact embedded

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Search,
  ArrowLeft,
  Trash2,
  Eye,
  Activity,
  Clock,
  Server,
  Network,
  Shield,
  Copy,
} from 'lucide-react';
import nmapDoc from '../../docs/nmap.md?raw';
import { useServerConfig } from '../../../../../context/ServerConfigContext';
import {
  parseNmapXML,
  formatDuration,
  formatDateTime,
  getPortStateColor,
  getPortRisk,
  ParsedNmapScan,
} from '../../../../../utils/nmapParser';

interface NmapScanParams {
  target: string;
  scanType: 'syn' | 'tcp' | 'udp' | 'ping';
  ports: string;
  aggressive: boolean;
  osDetection: boolean;
  versionDetection: boolean;
  timing: '0' | '1' | '2' | '3' | '4' | '5';
  additionalFlags: string;
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
  timestamp: number;
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

const COMMON_FLAGS = [
  {
    label: '--script vuln',
    value: '--script vuln',
    desc: 'Chạy các script phát hiện lỗ hổng bảo mật',
  },
  { label: '--script default', value: '--script default', desc: 'Chạy script NSE mặc định' },
  { label: '-sC', value: '-sC', desc: 'Tương đương --script default' },
  { label: '-sU', value: '-sU', desc: 'Quét UDP' },
  { label: '-sS', value: '-sS', desc: 'Quét SYN stealth (cần root)' },
  { label: '-sT', value: '-sT', desc: 'Quét TCP connect (không cần root)' },
  { label: '-sA', value: '-sA', desc: 'Quét ACK (phát hiện tường lửa)' },
  { label: '-sW', value: '-sW', desc: 'Quét Window' },
  { label: '-sM', value: '-sM', desc: 'Quét Maimon' },
  { label: '-sN', value: '-sN', desc: 'Quét TCP null' },
  { label: '-sF', value: '-sF', desc: 'Quét FIN' },
  { label: '-sX', value: '-sX', desc: 'Quét Xmas' },
  { label: '--scanflags', value: '--scanflags', desc: 'Tùy chỉnh cờ TCP' },
  { label: '-sI <zombie>', value: '-sI', desc: 'Quét idle (zombie)' },
  { label: '-sO', value: '-sO', desc: 'Quét giao thức IP' },
  { label: '-b <FTP relay>', value: '-b', desc: 'Quét FTP bounce' },
  { label: '-Pn', value: '-Pn', desc: 'Bỏ qua phát hiện host (không ping)' },
  { label: '-PS', value: '-PS', desc: 'Ping TCP SYN' },
  { label: '-PA', value: '-PA', desc: 'Ping TCP ACK' },
  { label: '-PU', value: '-PU', desc: 'Ping UDP' },
  { label: '-PY', value: '-PY', desc: 'Ping SCTP' },
  { label: '-PE', value: '-PE', desc: 'Ping ICMP echo' },
  { label: '-PP', value: '-PP', desc: 'Ping ICMP timestamp' },
  { label: '-PM', value: '-PM', desc: 'Ping ICMP netmask' },
  { label: '-PO', value: '-PO', desc: 'Ping giao thức IP' },
  { label: '-n', value: '-n', desc: 'Không phân giải DNS' },
  { label: '-R', value: '-R', desc: 'Luôn phân giải DNS' },
  { label: '--dns-servers', value: '--dns-servers', desc: 'Chỉ định máy chủ DNS' },
  { label: '--system-dns', value: '--system-dns', desc: 'Dùng DNS hệ thống' },
  { label: '-6', value: '-6', desc: 'Bật quét IPv6' },
  { label: '-A', value: '-A', desc: 'Quét aggressive (OS + version + scripts + traceroute)' },
  { label: '-O', value: '-O', desc: 'Phát hiện hệ điều hành' },
  { label: '--osscan-guess', value: '--osscan-guess', desc: 'Đoán OS mạnh hơn' },
  { label: '-sV', value: '-sV', desc: 'Phát hiện phiên bản dịch vụ' },
  { label: '--version-intensity', value: '--version-intensity', desc: 'Cường độ dò version (0-9)' },
  { label: '--version-light', value: '--version-light', desc: 'Dò version nhẹ (intensity 2)' },
  { label: '--version-all', value: '--version-all', desc: 'Thử tất cả probe version' },
  { label: '--script', value: '--script', desc: 'Chạy script NSE cụ thể' },
  { label: '--script-args', value: '--script-args', desc: 'Tham số cho script' },
  { label: '--script-trace', value: '--script-trace', desc: 'Hiển thị thực thi script' },
  { label: '--script-updatedb', value: '--script-updatedb', desc: 'Cập nhật cơ sở dữ liệu script' },
  { label: '-T0', value: '-T0', desc: 'Chậm nhất (paranoid)' },
  { label: '-T1', value: '-T1', desc: 'Rất chậm (sneaky)' },
  { label: '-T2', value: '-T2', desc: 'Chậm (polite)' },
  { label: '-T3', value: '-T3', desc: 'Bình thường' },
  { label: '-T4', value: '-T4', desc: 'Nhanh (aggressive)' },
  { label: '-T5', value: '-T5', desc: 'Rất nhanh (insane)' },
  { label: '--min-hostgroup', value: '--min-hostgroup', desc: 'Nhóm host song song tối thiểu' },
  { label: '--max-hostgroup', value: '--max-hostgroup', desc: 'Nhóm host song song tối đa' },
  { label: '--min-parallelism', value: '--min-parallelism', desc: 'Probe song song tối thiểu' },
  { label: '--max-parallelism', value: '--max-parallelism', desc: 'Probe song song tối đa' },
  { label: '--min-rtt-timeout', value: '--min-rtt-timeout', desc: 'Timeout RTT tối thiểu' },
  { label: '--max-rtt-timeout', value: '--max-rtt-timeout', desc: 'Timeout RTT tối đa' },
  { label: '--initial-rtt-timeout', value: '--initial-rtt-timeout', desc: 'Timeout RTT ban đầu' },
  { label: '--max-retries', value: '--max-retries', desc: 'Số lần thử lại tối đa' },
  { label: '--host-timeout', value: '--host-timeout', desc: 'Timeout cho mỗi host' },
  { label: '--scan-delay', value: '--scan-delay', desc: 'Độ trễ giữa các probe' },
  { label: '--max-scan-delay', value: '--max-scan-delay', desc: 'Độ trễ tối đa' },
  { label: '-f', value: '-f', desc: 'Phân mảnh gói tin' },
  { label: '-ff', value: '-ff', desc: 'Phân mảnh thành 8 byte' },
  { label: '--mtu', value: '--mtu', desc: 'Đặt MTU cho phân mảnh' },
  { label: '-D', value: '-D', desc: 'Quét với địa chỉ mồi (decoy)' },
  { label: '-S', value: '-S', desc: 'Giả mạo IP nguồn' },
  { label: '-e', value: '-e', desc: 'Chỉ định giao diện mạng' },
  { label: '-g', value: '-g', desc: 'Chỉ định cổng nguồn' },
  { label: '--source-port', value: '--source-port', desc: 'Chỉ định cổng nguồn' },
  { label: '--data-length', value: '--data-length', desc: 'Thêm dữ liệu ngẫu nhiên' },
  { label: '--ip-options', value: '--ip-options', desc: 'Tùy chọn IP' },
  { label: '--ttl', value: '--ttl', desc: 'Đặt TTL cho IP' },
  { label: '--spoof-mac', value: '--spoof-mac', desc: 'Giả mạo địa chỉ MAC' },
  { label: '--badsum', value: '--badsum', desc: 'Gửi checksum sai' },
  { label: '-oN', value: '-oN', desc: 'Xuất output dạng normal' },
  { label: '-oX', value: '-oX', desc: 'Xuất output dạng XML' },
  { label: '-oG', value: '-oG', desc: 'Xuất output dạng grepable' },
  { label: '-oA', value: '-oA', desc: 'Xuất tất cả định dạng' },
  { label: '-v', value: '-v', desc: 'Chi tiết (verbose)' },
  { label: '-vv', value: '-vv', desc: 'Rất chi tiết' },
  { label: '-d', value: '-d', desc: 'Gỡ lỗi (debug)' },
  { label: '--reason', value: '--reason', desc: 'Hiển thị lý do trạng thái cổng' },
  { label: '--open', value: '--open', desc: 'Chỉ hiển thị cổng mở' },
  { label: '--packet-trace', value: '--packet-trace', desc: 'Theo dõi gói tin' },
  { label: '--iflist', value: '--iflist', desc: 'Liệt kê giao diện mạng' },
  { label: '--append-output', value: '--append-output', desc: 'Ghi thêm vào file output' },
  { label: '--resume', value: '--resume', desc: 'Tiếp tục quét bị gián đoạn' },
  { label: '--stylesheet', value: '--stylesheet', desc: 'Stylesheet cho XML' },
  { label: '--webxml', value: '--webxml', desc: 'Dùng web XML stylesheet' },
  { label: '--no-stylesheet', value: '--no-stylesheet', desc: 'Bỏ qua stylesheet XML' },
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
  const { getFullUrl } = useServerConfig();
  const [params, setParams] = useState<NmapScanParams>({
    target: '',
    scanType: 'syn',
    ports: '',
    aggressive: false,
    osDetection: true,
    versionDetection: true,
    timing: '3',
    additionalFlags: '',
  });
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);
  const [showTargetSuggestions, setShowTargetSuggestions] = useState(false);
  const [targetHistory, setTargetHistory] = useState<string[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedScanForDetail, setSelectedScanForDetail] = useState<ScanResult | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    scan: ScanResult | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    scan: null,
  });
  const [selectedCommonFlag, setSelectedCommonFlag] = useState<string>('');
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);

  // Load target history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('nmap_target_history');
    if (saved) {
      try {
        setTargetHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load target history', e);
      }
    }
    const savedHistory = localStorage.getItem('nmap_scan_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      } catch (e) {
        console.error('Failed to load scan history', e);
      }
    }
  }, []);

  // Save target history to localStorage
  const saveTargetHistory = (newTarget: string) => {
    if (!newTarget.trim()) return;
    setTargetHistory((prev) => {
      const filtered = prev.filter((t) => t !== newTarget);
      const updated = [newTarget, ...filtered].slice(0, 20);
      localStorage.setItem('nmap_target_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Save scan history to localStorage
  const saveScanHistory = (newHistory: ScanResult[]) => {
    localStorage.setItem('nmap_scan_history', JSON.stringify(newHistory));
  };

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

  // Build flags array from UI params
  const buildFlags = (): string[] => {
    const flags: string[] = [];
    const t = SCAN_TYPES.find((s) => s.value === params.scanType);
    if (t) flags.push(t.flag);
    if (params.osDetection && !params.aggressive) flags.push('-O');
    if (params.versionDetection && !params.aggressive) flags.push('-sV');
    if (params.aggressive) flags.push('-A');
    flags.push(`-T${params.timing}`);
    if (params.ports) {
      flags.push('-p');
      flags.push(params.ports);
    }
    // Add additional raw flags from input
    if (params.additionalFlags.trim()) {
      const rawFlags = params.additionalFlags.trim().split(/\s+/);
      flags.push(...rawFlags);
    }
    // Always request XML output for structured data
    // Check if -oX is already present (user might have added)
    const hasOX = flags.some((f) => f === '-oX');
    if (!hasOX) {
      flags.push('-oX', '-');
    }
    return flags;
  };

  const handleScan = async () => {
    if (!params.target.trim()) return;
    setScanning(true);
    setResults(null);
    setProgress(0);

    // Simulate progress while waiting for real response
    let p = 0;
    progressRef.current = setInterval(() => {
      p += Math.random() * 8;
      if (p >= 90) p = 90;
      setProgress(Math.round(p));
    }, 200);

    const startTime = Date.now();
    const flags = buildFlags();

    try {
      const url = getFullUrl('/api/v1/nmap/scan');
      console.log('[Nmap] Fetching URL:', url);
      console.log('[Nmap] Request body:', { target: params.target, flags });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: params.target,
          flags: flags,
        }),
      });

      console.log('[Nmap] Response status:', response.status, response.statusText);
      console.log('[Nmap] Response headers:', Object.fromEntries(response.headers.entries()));

      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Nmap] Response not OK:', response.status, errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      // Get raw text first for debugging
      const rawText = await response.text();
      console.log('[Nmap] Raw response text length:', rawText.length);
      console.log('[Nmap] Raw response preview (first 500 chars):', rawText.substring(0, 500));

      const parsedResponse = JSON.parse(rawText);
      // Check if response has wrapper {success, data}
      const responseData = parsedResponse.data || parsedResponse;
      const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';

      // Debug log
      console.log('[Nmap] Parsed response:', {
        hasSuccess: parsedResponse.success,
        hasData: !!parsedResponse.data,
        responseKeys: Object.keys(parsedResponse),
        dataKeys: parsedResponse.data ? Object.keys(parsedResponse.data) : [],
      });

      console.log('[Nmap] Response data:', {
        hasRawOutput: !!responseData.rawOutput,
        rawOutputType: typeof responseData.rawOutput,
        rawOutputLength: responseData.rawOutput?.length,
        portsCount: responseData.ports?.length,
      });

      if (responseData.rawOutput) {
        console.log(
          '[Nmap] rawOutput preview (first 300 chars):',
          responseData.rawOutput.substring(0, 300),
        );
      }

      // Transform server response to ScanResult format
      let rawOutputLines: string[] = [`Nmap scan completed for ${params.target}`];
      if (responseData.rawOutput) {
        if (typeof responseData.rawOutput === 'string') {
          rawOutputLines = responseData.rawOutput.split('\n');
          console.log('[Nmap] Split rawOutput into', rawOutputLines.length, 'lines');
          console.log('[Nmap] First 5 lines:', rawOutputLines.slice(0, 5));
        } else if (Array.isArray(responseData.rawOutput)) {
          rawOutputLines = responseData.rawOutput;
          console.log('[Nmap] rawOutput is array with', rawOutputLines.length, 'items');
        }
      } else {
        console.warn('[Nmap] No rawOutput in response data!');
      }

      const scanResult: ScanResult = {
        status: 'completed',
        target: params.target,
        scanType: SCAN_TYPES.find((s) => s.value === params.scanType)?.label || '',
        duration: duration,
        timestamp: Date.now(),
        ports: (responseData.ports || []).map((p: any) => ({
          port: p.port,
          protocol: p.proto || 'tcp',
          service: p.service || '',
          state: p.state === 'open' ? 'open' : p.state === 'filtered' ? 'filtered' : 'closed',
          version: p.product || undefined,
        })),
        rawOutput: rawOutputLines,
        host: {
          ip: params.target,
          hostname: params.target,
        },
      };

      console.log('[Nmap] Final scanResult:', {
        target: scanResult.target,
        portsCount: scanResult.ports.length,
        rawOutputLinesCount: scanResult.rawOutput.length,
        firstRawLine: scanResult.rawOutput[0],
      });

      setHistory((prev) => {
        const updated = [scanResult, ...prev.slice(0, 9)];
        console.log('[Nmap] Updated history, new length:', updated.length);
        saveScanHistory(updated);
        return updated;
      });
      saveTargetHistory(params.target);
      setScanning(false);
      setExpandedCardIndex(0);
      if (onTabChange) onTabChange('history');
      setTimeout(() => {
        if (historyContainerRef.current) {
          historyContainerRef.current.scrollTop = 0;
        }
      }, 100);
    } catch (error) {
      console.error('Nmap scan failed:', error);
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);

      // Show error result
      const errorResult: ScanResult = {
        status: 'error',
        target: params.target,
        scanType: SCAN_TYPES.find((s) => s.value === params.scanType)?.label || '',
        duration: ((Date.now() - startTime) / 1000).toFixed(2) + 's',
        timestamp: Date.now(),
        ports: [],
        rawOutput: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };

      setHistory((prev) => {
        const updated = [errorResult, ...prev.slice(0, 9)];
        saveScanHistory(updated);
        return updated;
      });
      setScanning(false);
    }
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
          borderRadius: 6,
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
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
          <div style={{ position: 'relative' }}>
            <input
              ref={targetInputRef}
              type="text"
              value={params.target}
              onChange={(e) => setParams({ ...params, target: e.target.value })}
              onFocus={() => setShowTargetSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTargetSuggestions(false), 200)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              placeholder="192.168.1.1  |  example.com  |  10.0.0.0/24"
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
            {showTargetSuggestions && targetHistory.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: '#0d1117',
                  border: `1px solid ${accentColor}30`,
                  borderRadius: 4,
                  zIndex: 10,
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                {targetHistory.map((target, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: '#94a3b8',
                      borderBottom: idx < targetHistory.length - 1 ? '1px solid #1a2236' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#1a2236')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => {
                      setParams({ ...params, target });
                      setShowTargetSuggestions(false);
                    }}
                  >
                    {target}
                  </div>
                ))}
              </div>
            )}
          </div>
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

          {/* OS/Version flags integrated into Additional Flags section */}
        </div>
      </div>

      {/* ── Additional Flags (Full-width Dropdown with Vietnamese descriptions) ── */}
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
                text: 'Chọn flag Nmap từ danh sách. Flag sẽ được thêm vào lệnh quét.',
                x: rect.left,
                y: rect.bottom + 5,
              });
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            FLAGS (CHỌN TỪ DANH SÁCH)
          </label>
          <div
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltip({
                text: 'Chọn flag Nmap từ danh sách. Flag sẽ được thêm vào lệnh quét.',
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
        <div style={{ width: '100%' }}>
          <select
            value={selectedCommonFlag}
            onChange={(e) => {
              const flag = e.target.value;
              if (flag) {
                setParams({ ...params, additionalFlags: params.additionalFlags + ' ' + flag });
                setSelectedCommonFlag('');
              }
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#0d1117',
              border: `1px solid ${accentColor}50`,
              borderRadius: 4,
              color: '#cbd5e1',
              fontSize: 11,
              outline: 'none',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <option value="">-- Chọn flag Nmap --</option>
            {COMMON_FLAGS.map((flag) => (
              <option key={flag.value} value={flag.value}>
                {flag.label} — {flag.desc}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            type="text"
            value={params.additionalFlags}
            onChange={(e) => setParams({ ...params, additionalFlags: e.target.value })}
            placeholder="Hoặc nhập raw flags tại đây (cách nhau bằng space): --script vuln --min-rate 1000 -f"
            style={{
              width: '100%',
              padding: '9px 12px',
              background: '#0d1117',
              border: `1px solid ${params.additionalFlags ? accentColor + '50' : '#1a2236'}`,
              borderRadius: 4,
              color: '#cbd5e1',
              fontSize: 11,
              outline: 'none',
              fontFamily: 'monospace',
            }}
          />
        </div>
        <div style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
          💡 Gợi ý: Chọn flag từ dropdown hoặc nhập trực tiếp. Flag -oX - được tự động thêm để lấy
          XML output.
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

  // Helper function to format date label
  const getDateLabel = (timestamp: number): string => {
    // Validate timestamp
    if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
      return 'Unknown date';
    }

    const now = new Date();
    const scanDate = new Date(timestamp);

    // Check if scanDate is valid
    if (isNaN(scanDate.getTime())) {
      return 'Unknown date';
    }

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const scanDay = new Date(scanDate.getFullYear(), scanDate.getMonth(), scanDate.getDate());

    const formatDate = (date: Date): string => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    if (scanDay.getTime() === today.getTime()) {
      return 'Today';
    } else if (scanDay.getTime() === yesterday.getTime()) {
      return `Yesterday - ${formatDate(scanDate)}`;
    } else {
      return formatDate(scanDate);
    }
  };

  // Filter history based on search query
  const filteredHistory = history.filter((scan) => {
    if (!historySearchQuery.trim()) return true;
    const query = historySearchQuery.toLowerCase();
    return (
      scan.target.toLowerCase().includes(query) ||
      scan.scanType.toLowerCase().includes(query) ||
      scan.ports.some(
        (p) => p.port.toString().includes(query) || p.service.toLowerCase().includes(query),
      )
    );
  });

  // Delete scan from history
  const deleteScan = (scanToDelete: ScanResult) => {
    const updatedHistory = history.filter((scan) => scan.timestamp !== scanToDelete.timestamp);
    setHistory(updatedHistory);
    saveScanHistory(updatedHistory);
    // Close context menu
    setContextMenu({ visible: false, x: 0, y: 0, scan: null });
    // If deleted scan is currently in detail view, close detail view
    if (selectedScanForDetail?.timestamp === scanToDelete.timestamp) {
      setShowDetailView(false);
      setSelectedScanForDetail(null);
    }
  };

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0, scan: null });
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  // Group history by date label, handling legacy items without timestamp
  const groupedHistory = filteredHistory.reduce(
    (groups, scan) => {
      // If scan doesn't have timestamp, assign current time
      const timestamp = scan.timestamp || Date.now();
      const label = getDateLabel(timestamp);
      if (!groups[label]) {
        groups[label] = [];
      }
      // Add timestamp to scan if missing for future use
      if (!scan.timestamp) {
        scan.timestamp = timestamp;
      }
      groups[label].push(scan);
      return groups;
    },
    {} as Record<string, ScanResult[]>,
  );

  // Render full scan detail view
  const renderScanDetail = () => {
    if (!selectedScanForDetail) return null;
    const scan = selectedScanForDetail;
    const openPorts = scan.ports.filter((p) => p.state === 'open');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Back button */}
        <button
          onClick={() => {
            setShowDetailView(false);
            setSelectedScanForDetail(null);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: '#0d1117',
            border: `1px solid ${accentColor}30`,
            borderRadius: 4,
            color: accentColor,
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            width: 'fit-content',
          }}
        >
          <ArrowLeft size={14} />
          BACK TO HISTORY
        </button>

        {/* Scan header */}
        <div
          style={{
            padding: '16px',
            background: '#0d1117',
            border: `1px solid ${accentColor}30`,
            borderRadius: 6,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: accentColor }}>{scan.target}</h3>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
                {scan.scanType} • {scan.duration}
              </p>
            </div>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                background: '#1a2236',
                color: '#34d399',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {new Date(scan.timestamp).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Host Information */}
        {scan.host && (
          <div
            style={{
              padding: '16px',
              background: '#0d1117',
              border: `1px solid ${accentColor}30`,
              borderRadius: 6,
            }}
          >
            <h4 style={{ margin: '0 0 12px', fontSize: 13, color: accentColor }}>
              HOST INFORMATION
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: 12,
              }}
            >
              {scan.host.ip && (
                <div>
                  <span style={{ color: '#64748b' }}>IP:</span>{' '}
                  <span style={{ color: '#94a3b8' }}>{scan.host.ip}</span>
                </div>
              )}
              {scan.host.hostname && (
                <div>
                  <span style={{ color: '#64748b' }}>Hostname:</span>{' '}
                  <span style={{ color: '#94a3b8' }}>{scan.host.hostname}</span>
                </div>
              )}
              {scan.host.os && (
                <div>
                  <span style={{ color: '#64748b' }}>OS:</span>{' '}
                  <span style={{ color: '#94a3b8' }}>{scan.host.os}</span>
                </div>
              )}
              {scan.host.uptime && (
                <div>
                  <span style={{ color: '#64748b' }}>Uptime:</span>{' '}
                  <span style={{ color: '#94a3b8' }}>{scan.host.uptime}</span>
                </div>
              )}
              {scan.host.mac && (
                <div>
                  <span style={{ color: '#64748b' }}>MAC:</span>{' '}
                  <span style={{ color: '#94a3b8' }}>{scan.host.mac}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ports Table - Full */}
        <div
          style={{
            padding: '16px',
            background: '#0d1117',
            border: `1px solid ${accentColor}30`,
            borderRadius: 6,
          }}
        >
          <h4 style={{ margin: '0 0 12px', fontSize: 13, color: accentColor }}>
            PORTS SCANNED ({scan.ports.length} total, {openPorts.length} open)
          </h4>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  {['PORT', 'PROTO', 'STATE', 'SERVICE', 'VERSION'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '8px',
                        color: '#475569',
                        borderBottom: '1px solid #1a2236',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scan.ports.map((p, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px', color: accentColor, fontWeight: 700 }}>
                      {p.port}
                    </td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{p.protocol}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ color: stateColor(p.state), fontWeight: 700 }}>
                        {p.state.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '8px', color: '#94a3b8' }}>{p.service}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{p.version || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* NSE Scripts */}
        {scan.scripts && scan.scripts.length > 0 && (
          <div
            style={{
              padding: '16px',
              background: '#0d1117',
              border: `1px solid ${accentColor}30`,
              borderRadius: 6,
            }}
          >
            <h4 style={{ margin: '0 0 12px', fontSize: 13, color: accentColor }}>
              NSE SCRIPTS ({scan.scripts.length})
            </h4>
            <div
              style={{
                maxHeight: 300,
                overflowY: 'auto',
                fontSize: 11,
                color: '#64748b',
                fontFamily: 'monospace',
              }}
            >
              {scan.scripts.map((s, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 12,
                    padding: '8px',
                    background: '#080b10',
                    borderRadius: 4,
                  }}
                >
                  <div style={{ color: accentColor, marginBottom: 4 }}>{s.name}</div>
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{s.output}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw Output */}
        <div
          style={{
            padding: '16px',
            background: '#0d1117',
            border: `1px solid ${accentColor}30`,
            borderRadius: 6,
          }}
        >
          <h4 style={{ margin: '0 0 12px', fontSize: 13, color: accentColor }}>RAW OUTPUT</h4>
          <div
            style={{
              fontSize: 10,
              color: '#64748b',
              fontFamily: 'monospace',
              background: '#080b10',
              padding: 12,
              borderRadius: 4,
              maxHeight: 400,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {scan.rawOutput.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // History tab content with date labels
  const renderHistory = () => {
    if (showDetailView && selectedScanForDetail) {
      return renderScanDetail();
    }

    return (
      <div
        ref={historyContainerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxHeight: 'calc(100vh - 300px)',
          overflowY: 'auto',
        }}
      >
        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={historySearchQuery}
            onChange={(e) => setHistorySearchQuery(e.target.value)}
            placeholder="Search by target, scan type, port, or service..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              background: '#0d1117',
              border: `1px solid ${historySearchQuery ? accentColor + '50' : '#1a2236'}`,
              borderRadius: 4,
              color: '#e2e8f0',
              fontSize: 11,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 12 }}>
            {history.length === 0
              ? 'No scan history yet. Run a scan to see results here.'
              : 'No matching scans found.'}
          </div>
        ) : (
          Object.entries(groupedHistory).map(([dateLabel, scans]) => (
            <div key={dateLabel}>
              {/* Date label header */}
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: accentColor,
                  letterSpacing: '0.1em',
                  padding: '8px 0 4px 0',
                  borderBottom: `1px solid ${accentColor}30`,
                  marginBottom: 8,
                }}
              >
                {dateLabel}
              </div>
              {scans.map((scan, idx) => {
                const globalIdx = history.findIndex((h) => h.timestamp === scan.timestamp);
                const isExpanded = expandedCardIndex === globalIdx;
                const openPorts = scan.ports.filter((p) => p.state === 'open');
                return (
                  <div
                    key={globalIdx}
                    style={{
                      background: '#0d1117',
                      border: `1px solid ${expandedCardIndex === globalIdx ? accentColor : '#1a2236'}`,
                      borderRadius: 6,
                      transition: 'all 0.15s',
                      marginBottom: 8,
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        scan: scan,
                      });
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
                      onClick={() => setExpandedCardIndex(isExpanded ? null : globalIdx)}
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
                        <span
                          style={{
                            fontSize: 11,
                            color: '#64748b',
                            background: '#1a2236',
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}
                        >
                          {scan.scanType}
                        </span>
                      </div>

                      {/* Right side: stats grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, auto)',
                          gap: 20,
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>
                            Duration
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{scan.duration}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>
                            Open Ports
                          </span>
                          <span style={{ fontSize: 11, color: '#34d399' }}>{openPorts.length}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>
                            Total Ports
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            {scan.ports.length}
                          </span>
                        </div>
                        {scan.host?.os && (
                          <div>
                            <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>
                              OS
                            </span>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                              {scan.host.os.substring(0, 20)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded content - detailed results */}
                    {isExpanded && (
                      <div
                        style={{
                          borderTop: `1px solid ${accentColor}30`,
                          padding: '12px 16px',
                          background: '#080b10',
                        }}
                      >
                        {/* Ports table */}
                        <div style={{ marginBottom: 12 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: accentColor,
                              marginBottom: 8,
                              letterSpacing: '0.1em',
                            }}
                          >
                            OPEN PORTS
                          </div>
                          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                            <table
                              style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}
                            >
                              <thead>
                                <tr>
                                  {['PORT', 'PROTO', 'STATE', 'SERVICE', 'VERSION'].map((h) => (
                                    <th
                                      key={h}
                                      style={{
                                        textAlign: 'left',
                                        padding: '6px 8px',
                                        color: '#475569',
                                        borderBottom: '1px solid #1a2236',
                                      }}
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {scan.ports.map((p, i) => (
                                  <tr key={i}>
                                    <td
                                      style={{
                                        padding: '6px 8px',
                                        color: accentColor,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {p.port}
                                    </td>
                                    <td style={{ padding: '6px 8px', color: '#64748b' }}>
                                      {p.protocol}
                                    </td>
                                    <td style={{ padding: '6px 8px' }}>
                                      <span style={{ color: stateColor(p.state), fontWeight: 700 }}>
                                        {p.state.toUpperCase()}
                                      </span>
                                    </td>
                                    <td style={{ padding: '6px 8px', color: '#94a3b8' }}>
                                      {p.service}
                                    </td>
                                    <td style={{ padding: '6px 8px', color: '#64748b' }}>
                                      {p.version || '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Host info if available */}
                        {scan.host && (
                          <div style={{ marginBottom: 12 }}>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: accentColor,
                                marginBottom: 8,
                                letterSpacing: '0.1em',
                              }}
                            >
                              HOST INFORMATION
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: 8,
                              }}
                            >
                              {scan.host.ip && (
                                <div>
                                  <span style={{ color: '#64748b' }}>IP:</span>{' '}
                                  <span style={{ color: '#94a3b8' }}>{scan.host.ip}</span>
                                </div>
                              )}
                              {scan.host.hostname && (
                                <div>
                                  <span style={{ color: '#64748b' }}>Hostname:</span>{' '}
                                  <span style={{ color: '#94a3b8' }}>{scan.host.hostname}</span>
                                </div>
                              )}
                              {scan.host.os && (
                                <div>
                                  <span style={{ color: '#64748b' }}>OS:</span>{' '}
                                  <span style={{ color: '#94a3b8' }}>{scan.host.os}</span>
                                </div>
                              )}
                              {scan.host.uptime && (
                                <div>
                                  <span style={{ color: '#64748b' }}>Uptime:</span>{' '}
                                  <span style={{ color: '#94a3b8' }}>{scan.host.uptime}</span>
                                </div>
                              )}
                              {scan.host.mac && (
                                <div>
                                  <span style={{ color: '#64748b' }}>MAC:</span>{' '}
                                  <span style={{ color: '#94a3b8' }}>{scan.host.mac}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Scripts preview */}
                        {scan.scripts && scan.scripts.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: accentColor,
                                marginBottom: 8,
                                letterSpacing: '0.1em',
                              }}
                            >
                              NSE SCRIPTS ({scan.scripts.length})
                            </div>
                            <div
                              style={{
                                maxHeight: 150,
                                overflowY: 'auto',
                                fontSize: 10,
                                color: '#64748b',
                                fontFamily: 'monospace',
                              }}
                            >
                              {scan.scripts.map((s, i) => (
                                <div key={i} style={{ marginBottom: 4 }}>
                                  <span style={{ color: accentColor }}>{s.name}:</span>{' '}
                                  {s.output.substring(0, 100)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Raw output preview */}
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: accentColor,
                              marginBottom: 8,
                              letterSpacing: '0.1em',
                            }}
                          >
                            RAW OUTPUT (first 10 lines)
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: '#64748b',
                              fontFamily: 'monospace',
                              background: '#0d1117',
                              padding: 8,
                              borderRadius: 4,
                              maxHeight: 150,
                              overflowY: 'auto',
                            }}
                          >
                            {scan.rawOutput.slice(0, 10).map((line, i) => (
                              <div key={i}>{line}</div>
                            ))}
                            {scan.rawOutput.length > 10 && (
                              <div>... and {scan.rawOutput.length - 10} more lines</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    );
  };

  // Export functions
  const exportAsJSON = () => {
    if (!selectedScanForDetail) return;
    const data = {
      target: selectedScanForDetail.target,
      scanType: selectedScanForDetail.scanType,
      timestamp: selectedScanForDetail.timestamp,
      duration: selectedScanForDetail.duration,
      ports: selectedScanForDetail.ports,
      host: selectedScanForDetail.host,
      rawOutput: selectedScanForDetail.rawOutput.join('\n'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nmap_${selectedScanForDetail.target}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsXML = () => {
    if (!selectedScanForDetail) return;
    const rawXml = selectedScanForDetail.rawOutput.join('\n');
    const blob = new Blob([rawXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nmap_${selectedScanForDetail.target}_${Date.now()}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsTXT = () => {
    if (!selectedScanForDetail) return;
    const scan = selectedScanForDetail;
    const lines = [
      `NMAP SCAN REPORT`,
      `================`,
      `Target: ${scan.target}`,
      `Scan Type: ${scan.scanType}`,
      `Date: ${new Date(scan.timestamp).toLocaleString()}`,
      `Duration: ${scan.duration}`,
      ``,
      `OPEN PORTS:`,
      `-----------`,
      ...scan.ports
        .filter((p) => p.state === 'open')
        .map((p) => `${p.port}/${p.protocol} - ${p.service}${p.version ? ` (${p.version})` : ''}`),
      ``,
      `RAW OUTPUT:`,
      `-----------`,
      ...scan.rawOutput,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nmap_${scan.target}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render full detail view with parsed Nmap data
  const renderFullDetail = () => {
    if (!selectedScanForDetail) return null;
    const scan = selectedScanForDetail;

    // Try to parse XML from rawOutput
    const rawXml = scan.rawOutput.join('\n');
    const parsedData = parseNmapXML(rawXml);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header with Back button and Export buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            onClick={() => {
              setShowDetailView(false);
              setSelectedScanForDetail(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: '#0d1117',
              border: `1px solid ${accentColor}30`,
              borderRadius: 4,
              color: accentColor,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <ArrowLeft size={14} />
            BACK TO HISTORY
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={exportAsJSON}
              style={{
                padding: '6px 12px',
                background: '#0d1117',
                border: `1px solid ${accentColor}30`,
                borderRadius: 4,
                color: accentColor,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              title="Export as JSON"
            >
              📄 JSON
            </button>
            <button
              onClick={exportAsXML}
              style={{
                padding: '6px 12px',
                background: '#0d1117',
                border: `1px solid ${accentColor}30`,
                borderRadius: 4,
                color: accentColor,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              title="Export as XML (raw)"
            >
              📋 XML
            </button>
            <button
              onClick={exportAsTXT}
              style={{
                padding: '6px 12px',
                background: '#0d1117',
                border: `1px solid ${accentColor}30`,
                borderRadius: 4,
                color: accentColor,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              title="Export as TXT report"
            >
              📝 TXT
            </button>
          </div>
        </div>

        {/* Scan Header with parsed info */}
        <div
          style={{
            padding: '16px',
            background: '#0d1117',
            border: `1px solid ${accentColor}30`,
            borderRadius: 6,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: accentColor }}>{scan.target}</h3>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
                {scan.scanType} • {scan.duration}
              </p>
            </div>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                background: '#1a2236',
                color: '#34d399',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {new Date(scan.timestamp).toLocaleString()}
            </span>
          </div>

          {/* Scan Statistics from parsed data */}
          {parsedData && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid ${accentColor}20`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={14} color={accentColor} />
                <div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Duration</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {formatDuration(parsedData.duration)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={14} color={accentColor} />
                <div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Ports</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {parsedData.stats.openPorts} open / {parsedData.stats.filteredPorts} filtered
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Network size={14} color={accentColor} />
                <div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Command</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
                    {parsedData.args.substring(0, 60)}...
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Host Information - Enhanced */}
        <div
          style={{
            padding: '16px',
            background: '#0d1117',
            border: `1px solid ${accentColor}30`,
            borderRadius: 6,
          }}
        >
          <h4
            style={{
              margin: '0 0 12px',
              fontSize: 13,
              color: accentColor,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Server size={14} /> HOST INFORMATION
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 12,
            }}
          >
            {parsedData ? (
              <>
                <div>
                  <span style={{ color: '#64748b' }}>IP:</span>{' '}
                  <span style={{ color: '#94a3b8' }}>{parsedData.host.ip}</span>
                </div>
                {parsedData.host.hostname && (
                  <div>
                    <span style={{ color: '#64748b' }}>Hostname:</span>{' '}
                    <span style={{ color: '#94a3b8' }}>{parsedData.host.hostname}</span>
                  </div>
                )}
                {parsedData.host.os && (
                  <div>
                    <span style={{ color: '#64748b' }}>OS:</span>{' '}
                    <span style={{ color: '#94a3b8' }}>{parsedData.host.os}</span>
                  </div>
                )}
                {parsedData.host.uptime && (
                  <div>
                    <span style={{ color: '#64748b' }}>Uptime:</span>{' '}
                    <span style={{ color: '#94a3b8' }}>
                      {formatDuration(parsedData.host.uptime)}
                    </span>
                  </div>
                )}
                {parsedData.host.mac && (
                  <div>
                    <span style={{ color: '#64748b' }}>MAC:</span>{' '}
                    <span style={{ color: '#94a3b8' }}>{parsedData.host.mac}</span>
                  </div>
                )}
                <div>
                  <span style={{ color: '#64748b' }}>Status:</span>{' '}
                  <span style={{ color: parsedData.host.status === 'up' ? '#34d399' : '#ef4444' }}>
                    {parsedData.host.status.toUpperCase()}
                  </span>
                </div>
              </>
            ) : (
              <>
                {scan.host?.ip && (
                  <div>
                    <span style={{ color: '#64748b' }}>IP:</span>{' '}
                    <span style={{ color: '#94a3b8' }}>{scan.host.ip}</span>
                  </div>
                )}
                {scan.host?.hostname && (
                  <div>
                    <span style={{ color: '#64748b' }}>Hostname:</span>{' '}
                    <span style={{ color: '#94a3b8' }}>{scan.host.hostname}</span>
                  </div>
                )}
                {scan.host?.os && (
                  <div>
                    <span style={{ color: '#64748b' }}>OS:</span>{' '}
                    <span style={{ color: '#94a3b8' }}>{scan.host.os}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Ports Table - Enhanced with Risk */}
        <div
          style={{
            padding: '16px',
            background: '#0d1117',
            border: `1px solid ${accentColor}30`,
            borderRadius: 6,
          }}
        >
          <h4
            style={{
              margin: '0 0 12px',
              fontSize: 13,
              color: accentColor,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Shield size={14} /> PORTS SCANNED ({scan.ports.length} total,{' '}
            {scan.ports.filter((p) => p.state === 'open').length} open)
          </h4>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  {['PORT', 'PROTO', 'STATE', 'SERVICE', 'VERSION', 'RISK'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '8px',
                        color: '#475569',
                        borderBottom: '1px solid #1a2236',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scan.ports.map((p, i) => {
                  const risk = getPortRisk(p.port, p.service);
                  const riskColor =
                    risk === 'critical'
                      ? '#ef4444'
                      : risk === 'high'
                        ? '#f97316'
                        : risk === 'medium'
                          ? '#fbbf24'
                          : '#22c55e';
                  return (
                    <tr key={i}>
                      <td style={{ padding: '8px', color: accentColor, fontWeight: 700 }}>
                        {p.port}
                      </td>
                      <td style={{ padding: '8px', color: '#64748b' }}>{p.protocol}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ color: getPortStateColor(p.state), fontWeight: 700 }}>
                          {p.state.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '8px', color: '#94a3b8' }}>{p.service}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>{p.version || '—'}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ color: riskColor, fontWeight: 600, fontSize: 10 }}>
                          {risk.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Raw Output - Formatted XML */}
        <div
          style={{
            padding: '16px',
            background: '#0d1117',
            border: `1px solid ${accentColor}30`,
            borderRadius: 6,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <h4 style={{ margin: 0, fontSize: 13, color: accentColor }}>RAW OUTPUT (XML)</h4>
            <button
              onClick={() => {
                // Copy formatted XML to clipboard
                const formatted = scan.rawOutput.join('\n');
                navigator.clipboard.writeText(formatted);
              }}
              style={{
                padding: '6px',
                background: '#1a2236',
                border: `1px solid ${accentColor}30`,
                borderRadius: 4,
                color: accentColor,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Copy to clipboard"
            >
              <Copy size={14} />
            </button>
          </div>
          <div
            style={{
              fontSize: 10,
              color: '#94a3b8',
              fontFamily: 'monospace',
              background: '#080b10',
              padding: 12,
              borderRadius: 4,
              maxHeight: 400,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {scan.rawOutput.map((line, i) => {
              // Simple XML syntax highlighting
              let formattedLine = line;
              let color = '#64748b';

              if (line.startsWith('<?xml') || line.startsWith('<!DOCTYPE')) {
                color = '#fbbf24'; // Yellow for XML declaration
              } else if (line.includes('<nmaprun') || line.includes('</nmaprun>')) {
                color = '#34d399'; // Green for root element
              } else if (line.includes('<host') || line.includes('</host>')) {
                color = '#60a5fa'; // Blue for host
              } else if (line.includes('<port') || line.includes('</port>')) {
                color = '#c084fc'; // Purple for port
              } else if (line.includes('<service')) {
                color = '#f472b6'; // Pink for service
              } else if (line.includes('state="open"')) {
                color = '#34d399'; // Green for open
              } else if (line.includes('state="filtered"')) {
                color = '#fbbf24'; // Yellow for filtered
              } else if (line.includes('state="closed"')) {
                color = '#ef4444'; // Red for closed
              } else if (line.startsWith('<!--')) {
                color = '#475569'; // Gray for comments
              }

              return (
                <div key={i} style={{ color, whiteSpace: 'pre-wrap' }}>
                  {formattedLine}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // If in detail view, show full detail
  if (showDetailView && selectedScanForDetail) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          fontFamily: '"JetBrains Mono", monospace',
          position: 'relative',
          height: '100%',
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        {renderFullDetail()}
      </div>
    );
  }

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

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.scan && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: '#0d1117',
            border: `1px solid ${accentColor}50`,
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 1000,
            minWidth: 160,
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setSelectedScanForDetail(contextMenu.scan);
              setShowDetailView(true);
              setContextMenu({ visible: false, x: 0, y: 0, scan: null });
            }}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              color: accentColor,
              fontSize: 12,
              fontWeight: 700,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${accentColor}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Eye size={14} />
            View Details
          </button>
          <button
            onClick={() => {
              if (contextMenu.scan) {
                deleteScan(contextMenu.scan);
              }
            }}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderTop: `1px solid ${accentColor}20`,
              color: '#ef4444',
              fontSize: 12,
              fontWeight: 700,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef444410';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default NmapTool;
