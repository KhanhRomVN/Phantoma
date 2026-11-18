import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  FileCode2,
  FileJson2,
  ShieldAlert,
  Bug,
  ListFilter,
  Upload,
  FolderPlus,
  RefreshCw,
  Copy,
  Pencil,
  Check,
  X,
  Hash,
  ChevronLeft,
  Database,
  Activity,
  ShieldCheck,
  Calendar,
  GitBranch,
  AlertTriangle,
  MoreHorizontal,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Design tokens — strict palette supplied by brief
// ---------------------------------------------------------------------------
const C = {
  primary: 'rgb(139,109,255)',
  success: 'rgb(52,211,153)',
  error: 'rgb(244,63,94)',
  warn: 'rgb(251,191,36)',
  info: 'rgb(34,211,238)',
  bg: 'rgb(7,7,13)',
  card: 'rgb(15,15,26)',
  cardHover: 'rgb(23,23,40)',
  border: 'rgb(38,38,58)',
  textPrimary: 'rgb(244,244,251)',
  textSecondary: 'rgb(154,154,184)',
  dropdownHover: 'rgb(26,26,45)',
};

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const TREE = [
  {
    name: 'shared',
    children: [
      {
        name: 'offensive',
        children: [
          {
            name: 'payloads',
            children: [
              { name: 'xss', count: 142 },
              { name: 'sqli', count: 98 },
              { name: 'ssrf', count: 41 },
            ],
          },
          {
            name: 'templates',
            children: [
              { name: 'nuclei', count: 310 },
              { name: 'fuzzing', count: 76 },
            ],
          },
          { name: 'chains', count: 23 },
          { name: 'wordlists', count: 88 },
        ],
      },
      {
        name: 'findings',
        children: [
          { name: 'cve-pocs', count: 204 },
          { name: 'checklists', count: 37 },
        ],
      },
    ],
  },
  { name: 'custom-scripts', count: 59 },
];

const TYPE_META = {
  Exploit: { icon: Bug, color: C.error },
  Payload: { icon: ShieldAlert, color: C.primary },
  Template: { icon: FileJson2, color: C.info },
  Checklist: { icon: FileText, color: C.warn },
  Script: { icon: FileCode2, color: C.success },
};

const ITEMS = [
  {
    id: 1,
    name: 'sqli-auth-bypass.txt',
    title: 'SQLi Auth Bypass Payload',
    type: 'Payload',
    lang: 'TXT',
    tags: ['SQLi', 'Login Bypass', 'WAF-Bypass'],
    version: 'v1.4',
    author: 'r.vance',
    updated: '2026-11-09',
    path: 'shared/offensive/payloads/sqli',
    cve: null,
    code: `' OR '1'='1' --\nadmin'--\n') OR ('1'='1`,
    usage:
      'Insert in place of credentials on legacy form-based auth. Pair with timing probe before blind extraction.',
    history: [
      { version: 'v1.4', date: '2026-11-09', note: 'Added nested-paren bypass variant' },
      {
        version: 'v1.3',
        date: '2026-10-02',
        note: 'Hardened against prepared-statement WAF rules',
      },
      { version: 'v1.0', date: '2026-07-14', note: 'Initial submission' },
    ],
  },
  {
    id: 2,
    name: 'cve-2023-1234-exploit.py',
    title: 'CVE-2023-1234 RCE Exploit',
    type: 'Exploit',
    lang: 'Python',
    tags: ['RCE', 'CVE', 'Unauthenticated'],
    version: 'v2.0',
    author: 'k.nurzhan',
    updated: '2026-11-12',
    path: 'shared/findings/cve-pocs',
    cve: 'CVE-2023-1234',
    code: `import requests\n\ndef exploit(target):\n    r = requests.post(f"{target}/api/v1/render",\n        json={"tpl": "{{7*7}}"})\n    return r.text`,
    usage:
      'Target must expose /api/v1/render without auth. Confirm version banner >= 4.1.0 before firing.',
    history: [
      { version: 'v2.0', date: '2026-11-12', note: 'Rewritten against patched endpoint shape' },
      { version: 'v1.2', date: '2026-09-21', note: 'Added version-banner guard' },
      { version: 'v1.0', date: '2026-08-03', note: 'Initial PoC from disclosure' },
    ],
  },
  {
    id: 3,
    name: 'nuclei-fuzz-template.yaml',
    title: 'Generic Fuzzing Template',
    type: 'Template',
    lang: 'YAML',
    tags: ['Fuzzing', 'Nuclei'],
    version: 'v0.9',
    author: 'a.ibrahim',
    updated: '2026-11-05',
    path: 'shared/offensive/templates/nuclei',
    cve: null,
    code: `id: generic-fuzz\ninfo:\n  severity: info\nrequests:\n  - method: GET\n    path:\n      - "{{BaseURL}}/{{param}}"`,
    usage: 'Load with -t and -var param=<wordlist> for lightweight parameter discovery sweeps.',
    history: [
      { version: 'v0.9', date: '2026-11-05', note: 'Added info-severity default' },
      { version: 'v0.5', date: '2026-10-01', note: 'Initial template' },
    ],
  },
  {
    id: 4,
    name: 'xss-polyglot.js',
    title: 'XSS Polyglot Payload',
    type: 'Payload',
    lang: 'JavaScript',
    tags: ['XSS', 'Polyglot', 'WAF-Bypass'],
    version: 'v3.1',
    author: 'r.vance',
    updated: '2026-11-11',
    path: 'shared/offensive/payloads/xss',
    cve: null,
    code: `jaVasCript:/*-/*\`/*\\\`/*'/*"/**/(/* */onerror=alert)()//`,
    usage:
      'Effective against naive tag-stripping filters. Test in attribute and href contexts separately.',
    history: [
      { version: 'v3.1', date: '2026-11-11', note: 'Added href-context variant' },
      { version: 'v3.0', date: '2026-09-18', note: 'Rewritten polyglot chain' },
    ],
  },
  {
    id: 5,
    name: 'ssrf-metadata-probe.sh',
    title: 'SSRF Cloud Metadata Probe',
    type: 'Script',
    lang: 'Shell',
    tags: ['SSRF', 'Cloud', 'Recon'],
    version: 'v1.0',
    author: 'k.nurzhan',
    updated: '2026-10-28',
    path: 'shared/offensive/payloads/ssrf',
    cve: null,
    code: `curl -s -H "Metadata-Flavor: Google" \\\n  http://169.254.169.254/computeMetadata/v1/`,
    usage:
      'Run through the suspected SSRF sink. Rotate header set if the first provider guess misses.',
    history: [{ version: 'v1.0', date: '2026-10-28', note: 'Initial submission' }],
  },
  {
    id: 6,
    name: 'cve-2024-5577-poc.py',
    title: 'CVE-2024-5577 Deserialization PoC',
    type: 'Exploit',
    lang: 'Python',
    tags: ['Deserialization', 'CVE'],
    version: 'v1.1',
    author: 'a.ibrahim',
    updated: '2026-11-02',
    path: 'shared/findings/cve-pocs',
    cve: 'CVE-2024-5577',
    code: `import pickle, base64\n\npayload = pickle.dumps(Gadget())\nprint(base64.b64encode(payload))`,
    usage: 'Gadget chain assumes target ships the vulnerable serializer class on classpath.',
    history: [
      {
        version: 'v1.1',
        date: '2026-11-02',
        note: 'Swapped gadget for broader classpath coverage',
      },
      { version: 'v1.0', date: '2026-10-11', note: 'Initial PoC' },
    ],
  },
  {
    id: 7,
    name: 'pentest-report-checklist.md',
    title: 'Pre-Engagement Checklist',
    type: 'Checklist',
    lang: 'Markdown',
    tags: ['Process', 'Scoping'],
    version: 'v4.2',
    author: 'r.vance',
    updated: '2026-10-15',
    path: 'shared/findings/checklists',
    cve: null,
    code: `- [ ] Scope confirmed in writing\n- [ ] Rules of engagement signed\n- [ ] Emergency contact set`,
    usage:
      'Walk through before any external engagement kicks off. Attach signed copy to the case file.',
    history: [{ version: 'v4.2', date: '2026-10-15', note: 'Added emergency contact line' }],
  },
  {
    id: 8,
    name: 'subdomain-wordlist-v5.txt',
    title: 'Subdomain Enumeration Wordlist',
    type: 'Payload',
    lang: 'TXT',
    tags: ['Recon', 'Wordlist'],
    version: 'v5.0',
    author: 'a.ibrahim',
    updated: '2026-09-30',
    path: 'shared/offensive/wordlists',
    cve: null,
    code: `api\nstaging\ndev\nvpn\nmail\ninternal`,
    usage: 'Feed into resolver of choice; merge with target-specific terms before large scopes.',
    history: [{ version: 'v5.0', date: '2026-09-30', note: 'Merged in cloud-native term set' }],
  },
];

const FILTERS = ['All', 'Exploits', 'Wordlists', 'Templates', 'PoCs'];
const TABS = ['Overview', 'Raw Code', 'History', 'Usage'];

function highlight(code) {
  return code.split(/(\s+)/).map((tok, i) => {
    let color = C.textPrimary;
    if (/^(import|def|from|function|const|let|id:|info:|requests:|method:|severity:)$/.test(tok))
      color = C.primary;
    else if (/^(['"].*['"]|`.*`)$/.test(tok)) color = C.success;
    else if (/^[-]{0,1}\d+(\.\d+)?$/.test(tok)) color = C.warn;
    else if (/^#/.test(tok)) color = C.textSecondary;
    return (
      <span key={i} style={{ color }}>
        {tok}
      </span>
    );
  });
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------
function Tag({ children, color = C.textSecondary }) {
  return (
    <span
      className="text-[10.5px] px-1.5 py-[1px] rounded font-mono leading-none inline-flex items-center"
      style={{ color, background: 'rgba(255,255,255,0.05)' }}
    >
      {children}
    </span>
  );
}

function TreeNode({ node, depth, activePath, onSelect }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = !!node.children;
  const fullPath = node._path;
  const isActive = activePath === fullPath;

  return (
    <div>
      <button
        onClick={() => (hasChildren ? setOpen((o) => !o) : onSelect(fullPath))}
        className="w-full flex items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors"
        style={{
          paddingLeft: 8 + depth * 12,
          background: isActive ? 'rgba(139,109,255,0.1)' : 'transparent',
          color: isActive ? C.primary : C.textSecondary,
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = 'transparent';
        }}
      >
        {hasChildren ? (
          <ChevronDown
            size={11}
            style={{
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 150ms',
            }}
          />
        ) : (
          <span style={{ width: 11 }} />
        )}
        {hasChildren ? (
          open ? (
            <FolderOpen size={12} />
          ) : (
            <Folder size={12} />
          )
        ) : (
          <Hash size={11} style={{ opacity: 0.6 }} />
        )}
        <span
          className="text-[12px] truncate flex-1"
          style={{ color: isActive ? C.primary : C.textPrimary }}
        >
          {node.name}
        </span>
        {typeof node.count === 'number' && (
          <span className="text-[10px] font-mono" style={{ color: C.textSecondary }}>
            {node.count}
          </span>
        )}
      </button>
      {hasChildren && open && (
        <div>
          {node.children.map((c) => (
            <TreeNode
              key={c._path}
              node={c}
              depth={depth + 1}
              activePath={activePath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function withPaths(nodes, parent = '') {
  return nodes.map((n) => {
    const _path = parent ? `${parent}/${n.name}` : n.name;
    return { ...n, _path, children: n.children ? withPaths(n.children, _path) : undefined };
  });
}
const TREE_WITH_PATHS = withPaths(TREE);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ArchiveModule() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [activePath, setActivePath] = useState(null);
  const [selectedId, setSelectedId] = useState(ITEMS[1].id);
  const [copiedId, setCopiedId] = useState(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [tab, setTab] = useState('Overview');

  const filtered = useMemo(() => {
    return ITEMS.filter((item) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));

      const matchesPath = !activePath || item.path.includes(activePath);

      let matchesFilter = true;
      if (activeFilter === 'Exploits') matchesFilter = item.type === 'Exploit';
      if (activeFilter === 'Templates') matchesFilter = item.type === 'Template';
      if (activeFilter === 'Wordlists') matchesFilter = item.tags.includes('Wordlist');
      if (activeFilter === 'PoCs') matchesFilter = !!item.cve;

      return matchesQuery && matchesPath && matchesFilter;
    });
  }, [query, activeFilter, activePath]);

  const selected = ITEMS.find((i) => i.id === selectedId) || filtered[0];

  const handleCopy = (item) => {
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1400);
  };

  const recentUpdates = ITEMS.filter((i) => i.updated >= '2026-11-01').length;

  return (
    <div
      className="w-full h-full min-h-[760px] flex flex-col font-sans relative"
      style={{ color: C.textPrimary, fontFamily: 'Inter, system-ui, sans-serif', background: C.bg }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 40% at 50% -10%, rgba(139,109,255,0.06), transparent 60%)`,
        }}
      />

      <div className="relative z-10 flex flex-col h-full min-h-0">
        {/* ---------- Top bar: breadcrumb + search + slim stats + actions, one compact row ---------- */}
        <div className="flex items-center gap-4 px-4 h-11 shrink-0" style={{ background: C.card }}>
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: C.textSecondary }}>
            <span style={{ color: C.textPrimary, fontWeight: 600 }}>Archive</span>
            <ChevronRight size={12} />
            <span>{activePath || 'shared'}</span>
          </div>

          <div
            className="flex items-center gap-1.5 rounded-md px-2.5 h-7 w-72"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <Search size={12} style={{ color: C.textSecondary }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, tag, type..."
              className="flex-1 bg-transparent outline-none text-[12px]"
              style={{ color: C.textPrimary }}
            />
            <span
              className="text-[9.5px] px-1 rounded"
              style={{ color: C.textSecondary, background: 'rgba(255,255,255,0.05)' }}
            >
              ⌘K
            </span>
          </div>

          {/* slim inline stats */}
          <div className="flex items-center gap-4 text-[12px]" style={{ color: C.textSecondary }}>
            <span className="flex items-center gap-1.5">
              <Database size={13} style={{ color: C.primary }} />
              <b style={{ color: C.textPrimary, fontWeight: 600 }}>12,450</b> total
            </span>
            <span className="flex items-center gap-1.5">
              <Activity size={13} style={{ color: C.success }} />
              <b style={{ color: C.textPrimary, fontWeight: 600 }}>{recentUpdates}</b> updated
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} style={{ color: C.warn }} />
              <b style={{ color: C.textPrimary, fontWeight: 600 }}>204</b> CVE PoCs
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              className="flex items-center gap-1.5 text-[12px] px-2.5 h-7 rounded-md transition-colors"
              style={{ color: C.textSecondary }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <RefreshCw size={13} /> Sync
            </button>
            <button
              className="flex items-center gap-1.5 text-[12px] px-2.5 h-7 rounded-md transition-colors"
              style={{ color: C.textSecondary }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <FolderPlus size={13} /> New Folder
            </button>
            <button
              className="flex items-center gap-1.5 text-[12px] px-3 h-7 rounded-md font-medium"
              style={{ color: 'rgb(7,7,13)', background: C.primary }}
            >
              <Upload size={13} /> Upload
            </button>
          </div>
        </div>

        {/* ---------- Filter row ---------- */}
        <div
          className="flex items-center gap-1.5 px-4 h-9 shrink-0"
          style={{ background: 'rgba(255,255,255,0.015)' }}
        >
          {activePath && (
            <button
              onClick={() => setActivePath(null)}
              className="flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-md"
              style={{ color: C.primary }}
            >
              <ChevronLeft size={12} /> clear
            </button>
          )}
          {FILTERS.map((f) => {
            const active = activeFilter === f;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className="text-[11.5px] px-2.5 py-1 rounded-md transition-colors"
                style={{
                  color: active ? C.primary : C.textSecondary,
                  background: active ? 'rgba(139,109,255,0.1)' : 'transparent',
                }}
              >
                {f}
              </button>
            );
          })}
          <span className="ml-auto text-[11.5px]" style={{ color: C.textSecondary }}>
            {filtered.length} item{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* ---------- Body ---------- */}
        <div className="flex-1 flex min-h-0">
          {/* Left sidebar */}
          <div className="w-56 shrink-0 flex flex-col py-2" style={{ background: C.card }}>
            <div className="px-3 pb-1.5">
              <span
                className="text-[10px] uppercase tracking-wide"
                style={{ color: C.textSecondary }}
              >
                Namespaces
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-1.5">
              {TREE_WITH_PATHS.map((node) => (
                <TreeNode
                  key={node._path}
                  node={node}
                  depth={0}
                  activePath={activePath}
                  onSelect={setActivePath}
                />
              ))}
            </div>
          </div>

          {/* Main workspace — dense table */}
          <div className="flex-1 flex flex-col min-w-0" style={{ background: C.bg }}>
            {/* table header */}
            <div
              className="grid items-center px-4 h-8 text-[10.5px] shrink-0 uppercase tracking-wide"
              style={{
                gridTemplateColumns: '1.6fr 0.9fr 1.4fr 0.6fr 0.9fr 0.9fr 60px',
                color: C.textSecondary,
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <span>Name</span>
              <span>Type</span>
              <span>Tags</span>
              <span>Lang</span>
              <span>Author</span>
              <span>Updated</span>
              <span></span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center h-full text-center"
                  style={{ color: C.textSecondary }}
                >
                  <ListFilter size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <p className="text-[12.5px]">No entries match this search.</p>
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const Meta = TYPE_META[item.type];
                  const Icon = Meta.icon;
                  const active = selectedId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedId(item.id);
                        setInspectorOpen(true);
                        setTab('Overview');
                      }}
                      className="w-full grid items-center px-4 py-2 text-left transition-colors"
                      style={{
                        gridTemplateColumns: '1.6fr 0.9fr 1.4fr 0.6fr 0.9fr 0.9fr 60px',
                        background: active
                          ? 'rgba(139,109,255,0.08)'
                          : idx % 2 === 1
                            ? 'rgba(255,255,255,0.015)'
                            : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.background = C.dropdownHover;
                      }}
                      onMouseLeave={(e) => {
                        if (!active)
                          e.currentTarget.style.background =
                            idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent';
                      }}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Icon size={14} style={{ color: Meta.color, flexShrink: 0 }} />
                        <span className="min-w-0">
                          <span
                            className="block text-[13px] truncate"
                            style={{ color: C.textPrimary }}
                          >
                            {item.title}
                          </span>
                          <span
                            className="block text-[11px] font-mono truncate"
                            style={{ color: C.textSecondary }}
                          >
                            {item.name}
                          </span>
                        </span>
                      </span>
                      <span className="text-[11.5px]" style={{ color: Meta.color }}>
                        {item.type}
                      </span>
                      <span className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 2).map((t) => (
                          <Tag
                            key={t}
                            color={t.includes('WAF') || t === 'CVE' ? C.error : C.primary}
                          >
                            #{t}
                          </Tag>
                        ))}
                        {item.tags.length > 2 && <Tag>+{item.tags.length - 2}</Tag>}
                      </span>
                      <span className="text-[11.5px] font-mono" style={{ color: C.textSecondary }}>
                        {item.lang}
                      </span>
                      <span className="text-[11.5px] truncate" style={{ color: C.textSecondary }}>
                        {item.author}
                      </span>
                      <span className="text-[11.5px] font-mono" style={{ color: C.textSecondary }}>
                        {item.updated.slice(5)}
                      </span>
                      <span className="flex items-center gap-1 justify-end">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(item);
                          }}
                          className="p-1 rounded"
                          style={{ color: copiedId === item.id ? C.success : C.textSecondary }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')
                          }
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          {copiedId === item.id ? <Check size={13} /> : <Copy size={13} />}
                        </span>
                        <span
                          className="p-1 rounded"
                          style={{ color: C.textSecondary }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')
                          }
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <MoreHorizontal size={13} />
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right inspector panel */}
          {inspectorOpen && selected && (
            <div
              className="w-[360px] shrink-0 flex flex-col"
              style={{ background: 'rgb(15,15,26)' }}
            >
              {(() => {
                const Meta = TYPE_META[selected.type];
                const Icon = Meta.icon;
                const codeLines = selected.code.split('\n');
                return (
                  <>
                    <div className="flex items-center justify-between px-4 pt-3 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon size={15} style={{ color: Meta.color, flexShrink: 0 }} />
                        <div className="min-w-0">
                          <h3 className="text-[13px] truncate" style={{ color: C.textPrimary }}>
                            {selected.title}
                          </h3>
                          <p
                            className="text-[10.5px] font-mono truncate"
                            style={{ color: C.textSecondary }}
                          >
                            {selected.name} · {selected.version}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setInspectorOpen(false)}
                        style={{ color: C.textSecondary }}
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* tabs — underline style */}
                    <div
                      className="flex items-center gap-4 px-4"
                      style={{ background: 'rgba(255,255,255,0.015)' }}
                    >
                      {TABS.map((t) => (
                        <button
                          key={t}
                          onClick={() => setTab(t)}
                          className="text-[11.5px] py-2 relative"
                          style={{ color: tab === t ? C.primary : C.textSecondary }}
                        >
                          {t}
                          {tab === t && (
                            <span
                              className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full"
                              style={{ background: C.primary }}
                            />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-3">
                      {tab === 'Overview' && (
                        <>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {selected.tags.map((t) => (
                              <Tag
                                key={t}
                                color={t.includes('WAF') || t === 'CVE' ? C.error : C.primary}
                              >
                                #{t}
                              </Tag>
                            ))}
                          </div>

                          <div className="space-y-1.5 mb-3 text-[12px]">
                            <div
                              className="flex items-center gap-2"
                              style={{ color: C.textSecondary }}
                            >
                              <span
                                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-semibold"
                                style={{ background: C.primary, color: 'rgb(7,7,13)' }}
                              >
                                {selected.author.charAt(0).toUpperCase()}
                              </span>
                              <span style={{ color: C.textPrimary }}>{selected.author}</span>
                            </div>
                            <div
                              className="flex items-center gap-2"
                              style={{ color: C.textSecondary }}
                            >
                              <Calendar size={12} /> updated{' '}
                              <span style={{ color: C.textPrimary }}>{selected.updated}</span>
                            </div>
                            <div
                              className="flex items-center gap-2 font-mono"
                              style={{ color: C.textSecondary }}
                            >
                              <GitBranch size={12} /> {selected.path}
                            </div>
                          </div>

                          {selected.cve && (
                            <div
                              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 mb-3"
                              style={{ background: 'rgba(244,63,94,0.08)' }}
                            >
                              <AlertTriangle size={12} style={{ color: C.error }} />
                              <span className="text-[11.5px] font-mono" style={{ color: C.error }}>
                                {selected.cve}
                              </span>
                            </div>
                          )}

                          <div
                            className="rounded-md overflow-hidden mb-3"
                            style={{ background: 'rgb(7,7,13)' }}
                          >
                            <div className="flex items-center justify-between px-2.5 py-1.5">
                              <span
                                className="text-[10px] font-mono"
                                style={{ color: C.textSecondary }}
                              >
                                {selected.name}
                              </span>
                              <span
                                onClick={() => handleCopy(selected)}
                                className="text-[10px] flex items-center gap-1 cursor-pointer"
                                style={{
                                  color: copiedId === selected.id ? C.success : C.textSecondary,
                                }}
                              >
                                {copiedId === selected.id ? (
                                  <Check size={10} />
                                ) : (
                                  <Copy size={10} />
                                )}
                                {copiedId === selected.id ? 'copied' : 'copy'}
                              </span>
                            </div>
                            <div className="flex font-mono text-[10.5px] leading-relaxed overflow-x-auto pb-2.5">
                              <div
                                className="select-none text-right pr-2 pl-2.5"
                                style={{ color: C.textSecondary, opacity: 0.45 }}
                              >
                                {codeLines.map((_, i) => (
                                  <div key={i}>{i + 1}</div>
                                ))}
                              </div>
                              <div className="pr-3" style={{ whiteSpace: 'pre' }}>
                                {codeLines.map((line, i) => (
                                  <div key={i}>{highlight(line)}</div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {tab === 'Raw Code' && (
                        <div
                          className="rounded-md overflow-hidden mb-3"
                          style={{ background: 'rgb(7,7,13)' }}
                        >
                          <div className="flex font-mono text-[10.5px] leading-relaxed overflow-x-auto py-2.5">
                            <div
                              className="select-none text-right pr-2 pl-2.5"
                              style={{ color: C.textSecondary, opacity: 0.45 }}
                            >
                              {codeLines.map((_, i) => (
                                <div key={i}>{i + 1}</div>
                              ))}
                            </div>
                            <div className="pr-3" style={{ whiteSpace: 'pre' }}>
                              {codeLines.map((line, i) => (
                                <div key={i}>{highlight(line)}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {tab === 'History' && (
                        <div className="space-y-2.5 mb-3">
                          {selected.history.map((h, i) => (
                            <div key={i} className="flex gap-2.5">
                              <div className="flex flex-col items-center pt-0.5">
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ background: i === 0 ? C.primary : C.border }}
                                />
                                {i < selected.history.length - 1 && (
                                  <span
                                    className="w-px flex-1 mt-0.5"
                                    style={{ background: C.border }}
                                  />
                                )}
                              </div>
                              <div className="pb-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="text-[12px] font-mono"
                                    style={{ color: C.textPrimary }}
                                  >
                                    {h.version}
                                  </span>
                                  <span
                                    className="text-[10.5px] font-mono"
                                    style={{ color: C.textSecondary }}
                                  >
                                    {h.date}
                                  </span>
                                </div>
                                <p
                                  className="text-[11.5px] mt-0.5"
                                  style={{ color: C.textSecondary }}
                                >
                                  {h.note}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {tab === 'Usage' && (
                        <p className="text-[12px] leading-relaxed" style={{ color: C.textPrimary }}>
                          {selected.usage}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 px-4 py-3">
                      <button
                        onClick={() => handleCopy(selected)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-[12px] py-1.5 rounded-md font-medium"
                        style={{
                          background:
                            copiedId === selected.id ? 'rgba(52,211,153,0.12)' : C.primary,
                          color: copiedId === selected.id ? C.success : 'rgb(7,7,13)',
                        }}
                      >
                        {copiedId === selected.id ? (
                          <>
                            <Check size={13} /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Copy
                          </>
                        )}
                      </button>
                      <button
                        className="flex items-center justify-center gap-1.5 text-[12px] py-1.5 px-3 rounded-md"
                        style={{ color: C.textSecondary }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
