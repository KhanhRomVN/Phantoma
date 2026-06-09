// src/renderer/src/features/Tool/components/WorkspaceSection/Tool/index.tsx
// Quản lý toàn bộ công cụ bảo mật trong Phantoma

import React, { useState } from 'react';
import {
  Network,
  Globe,
  Bug,
  Zap,
  Shield,
  Search,
  Eye,
  Wrench,
  Scan,
  Radio,
  ShieldAlert,
} from 'lucide-react';
import NmapTool from './components/Nmap';
import NiktoTool from './components/Nikto';
import SearchsploitTool from './components/Searchsploit';
import MetasploitTool from './components/Metasploit';
import DorkTool from './components/Dork';
import GauTool from './components/Gau';
import AmassTool from './components/Amass';
import AssetfinderTool from './components/Assetfinder';
import SubfinderTool from './components/Subfinder';
import NucleiTool from './components/Nuclei';
import RustscanTool from './components/Rustscan';
import AlienvaultTool from './components/Alienvault';
import CertshTool from './components/Certsh';

export interface SecurityTool {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: ToolCategory;
  tags: string[];
  testCommand?: string;
  component: React.ComponentType<any>;
  apiEndpoint: string;
  method: 'GET' | 'POST';
  icon: string;
  status: 'stable' | 'beta' | 'experimental';
  speed: 'fast' | 'medium' | 'slow';
  websiteUrl?: string;
}

export type ToolCategory = 'Network' | 'Web' | 'Exploit' | 'OSINT' | 'Vuln';

const CATEGORY_META: Record<
  ToolCategory,
  { color: string; glow: string; bg: string; label: string }
> = {
  Network: {
    color: '#00e5ff',
    glow: 'rgba(0,229,255,0.15)',
    bg: 'rgba(0,229,255,0.06)',
    label: 'NET',
  },
  Web: {
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.15)',
    bg: 'rgba(167,139,250,0.06)',
    label: 'WEB',
  },
  Exploit: {
    color: '#ff4d6d',
    glow: 'rgba(255,77,109,0.15)',
    bg: 'rgba(255,77,109,0.06)',
    label: 'EXP',
  },
  OSINT: {
    color: '#34d399',
    glow: 'rgba(52,211,153,0.15)',
    bg: 'rgba(52,211,153,0.06)',
    label: 'INT',
  },
  Vuln: {
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.15)',
    bg: 'rgba(251,191,36,0.06)',
    label: 'VUL',
  },
};

export const TOOLS_LIST: SecurityTool[] = [
  {
    id: 'nmap',
    name: 'Nmap',
    shortName: 'NMAP',
    description:
      'Network mapper hàng đầu — quét cổng, phát hiện dịch vụ, OS fingerprinting, và script scanning với NSE engine.',
    category: 'Network',
    tags: ['port-scan', 'os-detect', 'nse'],
    testCommand: 'nmap --version',
    component: NmapTool,
    apiEndpoint: '/api/v1/nmap/scan',
    method: 'POST',
    icon: '⬡',
    status: 'stable',
    speed: 'medium',
  },
  {
    id: 'rustscan',
    name: 'Rustscan',
    shortName: 'RSCAN',
    description:
      'Port scanner siêu tốc viết bằng Rust — quét 65k ports trong 3 giây, tích hợp Nmap pipeline.',
    category: 'Network',
    tags: ['port-scan', 'fast', 'rust'],
    testCommand: 'rustscan --version',
    component: RustscanTool,
    apiEndpoint: '/api/v1/rustscan/scan',
    method: 'POST',
    icon: '▸',
    status: 'stable',
    speed: 'fast',
  },
  {
    id: 'nikto',
    name: 'Nikto',
    shortName: 'NIKTO',
    description:
      'Web server vulnerability scanner — kiểm tra 6700+ mẫu nguy hiểm, misconfiguration, outdated software.',
    category: 'Web',
    tags: ['web-scan', 'cgi', 'ssl', 'vuln'],
    testCommand: 'nikto -Version',
    component: NiktoTool,
    apiEndpoint: '/api/v1/nikto/scan',
    method: 'POST',
    icon: '◈',
    status: 'stable',
    speed: 'slow',
  },
  {
    id: 'nuclei',
    name: 'Nuclei',
    shortName: 'NUCL',
    description:
      'Template-based vulnerability scanner với 5000+ templates — CVE, misconfig, exposed panels, secrets.',
    category: 'Vuln',
    tags: ['cve', 'templates', 'http', 'dns'],
    testCommand: 'nuclei --version',
    component: NucleiTool,
    apiEndpoint: '/api/v1/nuclei/scan',
    method: 'POST',
    icon: '◎',
    status: 'stable',
    speed: 'fast',
  },
  {
    id: 'searchsploit',
    name: 'Searchsploit',
    shortName: 'SPLOIT',
    description:
      'CLI interface cho Exploit-DB — tìm kiếm exploit theo CVE, software, version, platform.',
    category: 'Exploit',
    tags: ['exploit', 'cve', 'exploit-db'],
    testCommand: 'searchsploit --version',
    component: SearchsploitTool,
    apiEndpoint: '/api/v1/exploit/search',
    method: 'POST',
    icon: '⚡',
    status: 'stable',
    speed: 'fast',
  },
  {
    id: 'metasploit',
    name: 'Metasploit',
    shortName: 'MSF',
    description:
      'Framework khai thác lỗ hổng hàng đầu — 2000+ exploits, payload generator, post-exploitation.',
    category: 'Exploit',
    tags: ['framework', 'payload', 'post-exploit'],
    testCommand: 'msfconsole -v',
    component: MetasploitTool,
    apiEndpoint: '/api/v1/exploit/search',
    method: 'POST',
    icon: '☢',
    status: 'stable',
    speed: 'slow',
  },
  {
    id: 'amass',
    name: 'Amass',
    shortName: 'AMASS',
    description:
      'OWASP subdomain enumeration mạnh nhất — 100+ nguồn dữ liệu, active/passive recon, network mapping.',
    category: 'OSINT',
    tags: ['subdomain', 'dns', 'passive', 'active'],
    testCommand: 'amass --version',
    component: AmassTool,
    apiEndpoint: '/api/v1/amass/scan',
    method: 'POST',
    icon: '◉',
    status: 'stable',
    speed: 'slow',
  },
  {
    id: 'subfinder',
    name: 'Subfinder',
    shortName: 'SUBF',
    description:
      'Passive subdomain discovery từ ProjectDiscovery — tích hợp Shodan, Censys, VirusTotal, rapid7.',
    category: 'OSINT',
    tags: ['subdomain', 'passive', 'dns'],
    testCommand: 'subfinder --version',
    component: SubfinderTool,
    apiEndpoint: '/api/v1/subfinder/scan',
    method: 'POST',
    icon: '◌',
    websiteUrl: 'https://github.com/projectdiscovery/subfinder',
    status: 'stable',
    speed: 'medium',
  },
  {
    id: 'assetfinder',
    name: 'Assetfinder',
    shortName: 'ASSET',
    description:
      'Domain và subdomain finder từ AlienVault, Wayback, CertSpotter — nhẹ, nhanh, pipeline-friendly.',
    category: 'OSINT',
    tags: ['asset', 'domain', 'recon'],
    testCommand: 'assetfinder --help',
    component: AssetfinderTool,
    apiEndpoint: '/api/v1/assetfinder/scan',
    method: 'POST',
    icon: '⊕',
    websiteUrl: 'https://github.com/tomnomnom/assetfinder',
    status: 'stable',
    speed: 'fast',
  },
  {
    id: 'gau',
    name: 'GAU',
    shortName: 'GAU',
    description:
      'GetAllUrls — thu thập URL từ Wayback Machine, AlienVault, CommonCrawl, URLScan cho bug bounty.',
    category: 'OSINT',
    tags: ['url', 'wayback', 'crawl', 'recon'],
    testCommand: 'gau --version',
    component: GauTool,
    apiEndpoint: '/api/v1/gau/fetch',
    method: 'POST',
    icon: '⊗',
    websiteUrl: 'https://github.com/lc/gau',
    status: 'stable',
    speed: 'medium',
  },
  {
    id: 'go-dork',
    name: 'Go Dork',
    shortName: 'DORK',
    description:
      'Google Dorking engine viết bằng Go — hỗ trợ nhiều search engine, proxy, tìm exposed endpoints.',
    category: 'OSINT',
    tags: ['dork', 'google', 'search', 'osint'],
    testCommand: 'go-dork --help',
    component: DorkTool,
    apiEndpoint: '/api/v1/dork/search',
    method: 'POST',
    icon: '⊘',
    status: 'beta',
    speed: 'medium',
  },
  {
    id: 'alienvault',
    name: 'AlienVault',
    shortName: 'OTX',
    description:
      'Threat intelligence platform — tra cứu IP/domain/hash, indicators of compromise, malware C2 detection.',
    category: 'OSINT',
    tags: ['threat-intel', 'ioc', 'malware', 'c2'],
    testCommand: 'curl https://otx.alienvault.com/api/v1/indicators/domain/example.com/general',
    component: AlienvaultTool,
    apiEndpoint: '/api/v1/alienvault/scan',
    method: 'POST',
    icon: '◑',
    websiteUrl: 'https://otx.alienvault.com',
    status: 'stable',
    speed: 'fast',
  },
  {
    id: 'certsh',
    name: 'Cert.sh',
    shortName: 'CERT',
    description:
      'Certificate Transparency Logs — tìm subdomain từ SSL certs, theo dõi wildcard, passive recon.',
    category: 'OSINT',
    tags: ['ssl', 'certificate', 'subdomain', 'passive'],
    testCommand: 'curl https://crt.sh/?q=example.com',
    component: CertshTool,
    apiEndpoint: '/api/v1/certsh/scan',
    method: 'POST',
    icon: '◐',
    websiteUrl: 'https://crt.sh',
    status: 'stable',
    speed: 'fast',
  },
];

const SPEED_META = {
  fast: { label: 'FAST', color: '#34d399' },
  medium: { label: 'MED', color: '#fbbf24' },
  slow: { label: 'SLOW', color: '#fb7185' },
};

const STATUS_META = {
  stable: { label: 'STABLE', color: '#34d399' },
  beta: { label: 'BETA', color: '#fbbf24' },
  experimental: { label: 'EXPRMTL', color: '#fb7185' },
};

interface ToolIconProps {
  tool: SecurityTool;
  color: string;
}

const getLucideIconForTool = (toolId: string, category: ToolCategory) => {
  const iconMap: Record<string, React.ElementType> = {
    nmap: Scan,
    rustscan: Radio,
    nikto: Globe,
    nuclei: Shield,
    searchsploit: Search,
    metasploit: Bug,
    amass: Network,
    subfinder: Eye,
    assetfinder: Eye,
    gau: Globe,
    'go-dork': Search,
    alienvault: ShieldAlert,
    certsh: Eye,
  };

  const categoryFallback: Record<ToolCategory, React.ElementType> = {
    Network: Network,
    Web: Globe,
    Exploit: Zap,
    OSINT: Search,
    Vuln: Shield,
  };

  const IconComponent = iconMap[toolId] || categoryFallback[category] || Wrench;
  return IconComponent;
};

const ToolIcon: React.FC<ToolIconProps> = ({ tool, color }) => {
  const [hasError, setHasError] = useState(false);
  const IconComponent = getLucideIconForTool(tool.id, tool.category);

  if (tool.websiteUrl && !hasError) {
    try {
      const url = new URL(tool.websiteUrl);
      const domain = url.hostname;
      const faviconUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
      return (
        <img
          src={faviconUrl}
          alt={tool.name}
          style={{ width: 20, height: 20, objectFit: 'contain' }}
          onError={() => setHasError(true)}
        />
      );
    } catch {
      return <IconComponent size={18} style={{ color }} strokeWidth={1.5} />;
    }
  }
  return <IconComponent size={18} style={{ color }} strokeWidth={1.5} />;
};

interface ToolManagerProps {
  activeToolId?: string;
  onToolChange?: (toolId: string) => void;
}

const ToolManager: React.FC<ToolManagerProps> = ({ activeToolId = 'nmap', onToolChange }) => {
  const [selectedTool, setSelectedTool] = useState<string>(activeToolId);
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    onToolChange?.(toolId);
  };

  const currentTool = TOOLS_LIST.find((t) => t.id === selectedTool);
  const ToolComponent = currentTool?.component;
  const catMeta = currentTool ? CATEGORY_META[currentTool.category] : null;

  const categories: Array<ToolCategory | 'All'> = [
    'All',
    'Network',
    'Web',
    'Exploit',
    'OSINT',
    'Vuln',
  ];

  const filteredTools = TOOLS_LIST.filter((t) => {
    const matchCat = activeCategory === 'All' || t.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.tags.some((g) => g.includes(q));
    return matchCat && matchSearch;
  });

  // Scanline CSS baked inline để không cần external styles
  const scanlineStyle: React.CSSProperties = {
    background:
      'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.015) 2px, rgba(0,229,255,0.015) 4px)',
    pointerEvents: 'none',
  };

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#07090e',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        position: 'relative',
      }}
    >
      {/* Scanline overlay */}
      <div style={{ ...scanlineStyle, position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* ─── LEFT PANEL ─── */}
      <div
        style={{
          width: 390,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1e2535',
          background: '#0f1319',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #111827' }}>
          {/* Tools Header with Badge */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <span
              style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.15em' }}
            >
              TOOLS
            </span>
            <span
              style={{
                fontSize: 9,
                background: '#0d1117',
                padding: '2px 6px',
                borderRadius: 3,
                color: '#475569',
                border: '1px solid #1a2236',
              }}
            >
              {TOOLS_LIST.length}
            </span>
          </div>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 9,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 10,
                color: '#374151',
              }}
            >
              ⌕
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search tools..."
              style={{
                width: '100%',
                padding: '6px 8px 6px 24px',
                background: '#0d1117',
                border: '1px solid #1a2236',
                borderRadius: 4,
                color: '#94a3b8',
                fontSize: 10,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            padding: '8px 10px',
            borderBottom: '1px solid #111827',
          }}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const meta = cat !== 'All' ? CATEGORY_META[cat] : null;
            const count =
              cat === 'All'
                ? TOOLS_LIST.length
                : TOOLS_LIST.filter((t) => t.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 3,
                  border: `1px solid ${isActive ? meta?.color || '#00e5ff' : '#1a2236'}`,
                  background: isActive ? meta?.bg || 'rgba(0,229,255,0.06)' : 'transparent',
                  color: isActive ? meta?.color || '#00e5ff' : '#374151',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  boxShadow: isActive ? `0 0 8px ${meta?.glow || 'rgba(0,229,255,0.15)'}` : 'none',
                }}
              >
                {cat === 'All' ? 'ALL' : CATEGORY_META[cat].label}{' '}
                <span style={{ opacity: 0.6 }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Tool Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {filteredTools.map((tool) => {
            const isSelected = selectedTool === tool.id;
            const meta = CATEGORY_META[tool.category];
            return (
              <button
                key={tool.id}
                onClick={() => handleToolSelect(tool.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  background: isSelected ? meta.bg : 'transparent',
                  border: `1px solid ${isSelected ? meta.color : 'transparent'}`,
                  borderLeft: `2px solid ${isSelected ? meta.color : 'transparent'}`,
                  borderRadius: 4,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  boxShadow: isSelected ? `0 0 12px ${meta.glow}` : 'none',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.background = meta.bg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }
                }}
              >
                {/* Icon with favicon support */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    background: isSelected ? meta.bg : '#0d1117',
                    border: `1px solid ${isSelected ? meta.color + '60' : '#1a2236'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    color: meta.color,
                    flexShrink: 0,
                    boxShadow: isSelected ? `0 0 8px ${meta.glow}` : 'none',
                    overflow: 'hidden',
                  }}
                >
                  <ToolIcon tool={tool} color={meta.color} />
                </div>

                {/* Name + tags */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isSelected ? meta.color : '#c5cfe0',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {tool.name}
                    </span>
                    {tool.status !== 'stable' && (
                      <span
                        style={{
                          fontSize: 8,
                          padding: '1px 4px',
                          background: STATUS_META[tool.status].color + '20',
                          color: STATUS_META[tool.status].color,
                          borderRadius: 2,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                        }}
                      >
                        {STATUS_META[tool.status].label}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {tool.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 9,
                          color: '#6b7a96',
                          letterSpacing: '0.05em',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* No speed dot - removed */}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1 }}
      >
        {currentTool && catMeta ? (
          <>
            {/* Tool Header */}
            <div
              style={{
                padding: '12px 20px',
                borderBottom: `1px solid ${catMeta.color}30`,
                background: catMeta.bg,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                flexShrink: 0,
              }}
            >
              {/* Big icon */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: '#080b10',
                  border: `1px solid ${catMeta.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: catMeta.color,
                  flexShrink: 0,
                  boxShadow: `0 0 20px ${catMeta.glow}`,
                }}
              >
                {currentTool.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 800,
                      color: catMeta.color,
                      letterSpacing: '0.1em',
                      fontFamily: 'inherit',
                      textShadow: `0 0 20px ${catMeta.glow}`,
                    }}
                  >
                    {currentTool.name.toUpperCase()}
                  </h2>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 3,
                      background: catMeta.bg,
                      border: `1px solid ${catMeta.color}50`,
                      color: catMeta.color,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                    }}
                  >
                    {currentTool.category.toUpperCase()}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 3,
                      background: SPEED_META[currentTool.speed].color + '15',
                      border: `1px solid ${SPEED_META[currentTool.speed].color}40`,
                      color: SPEED_META[currentTool.speed].color,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                    }}
                  >
                    {SPEED_META[currentTool.speed].label}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 3,
                      background: STATUS_META[currentTool.status].color + '15',
                      border: `1px solid ${STATUS_META[currentTool.status].color}40`,
                      color: STATUS_META[currentTool.status].color,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                    }}
                  >
                    {STATUS_META[currentTool.status].label}
                  </span>
                </div>

                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: 11,
                    color: '#64748b',
                    lineHeight: 1.5,
                    fontFamily: 'inherit',
                  }}
                >
                  {currentTool.description}
                </p>

                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                  {currentTool.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: '2px 7px',
                        borderRadius: 3,
                        background: '#0d1117',
                        border: '1px solid #1a2236',
                        color: '#475569',
                        fontSize: 9,
                        letterSpacing: '0.06em',
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                  {currentTool.testCommand && (
                    <span
                      style={{
                        marginLeft: 4,
                        padding: '2px 8px',
                        borderRadius: 3,
                        background: '#0d1117',
                        border: '1px solid #1a2236',
                        color: '#334155',
                        fontSize: 9,
                        fontFamily: 'inherit',
                      }}
                    >
                      $ {currentTool.testCommand}
                    </span>
                  )}
                </div>
              </div>

              {/* Endpoint badge */}
              <div
                style={{
                  flexShrink: 0,
                  padding: '4px 10px',
                  borderRadius: 4,
                  background: '#0d1117',
                  border: '1px solid #1a2236',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  alignSelf: 'flex-start',
                }}
              >
                <span style={{ fontSize: 8, color: '#1e293b', letterSpacing: '0.1em' }}>
                  ENDPOINT
                </span>
                <span style={{ fontSize: 9, color: '#334155', fontFamily: 'inherit' }}>
                  {currentTool.method}
                </span>
                <span
                  style={{
                    fontSize: 8,
                    color: '#475569',
                    fontFamily: 'inherit',
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentTool.apiEndpoint}
                </span>
              </div>
            </div>

            {/* Tool Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                background: '#0f1319',
              }}
            >
              {ToolComponent ? (
                <ToolComponent accentColor={catMeta.color} />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                  }}
                >
                  <p style={{ fontSize: 12, color: '#1e293b' }}>NO COMPONENT LOADED</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 12, color: '#1e293b', letterSpacing: '0.15em' }}>
              // SELECT A TOOL
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolManager;
