import { useState, useMemo } from 'react';
import {
  Loader2,
  Folder,
  FolderOpen,
  Home,
  Check,
  FileText,
  Layout,
  Package,
  Server,
  Terminal as TerminalIcon,
  Lock,
  Shield,
  Bot,
} from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { $ } from '@renderer/utils/color';

import { useCodeStore } from '../../hooks/useCodeStore';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

interface TemplateDef {
  id: string;
  name: string;
  description: string;
  category: 'Web' | 'Backend' | 'Security' | 'AI' | 'All';
  icon: React.ReactNode;
  stack: string[];
  treePreview: { depth: number; label: string; isFolder?: boolean }[];
  accentColor: string;
  setupTime: string;
  lay: 'app' | 'api' | 'term';
}

const TEMPLATES: TemplateDef[] = [
  {
    id: 'blank',
    name: 'Empty',
    description: 'Blank workspace',
    category: 'All',
    icon: <FolderOpen className="w-5 h-5" />,
    stack: ['Any'],
    treePreview: [{ depth: 0, label: 'README.md' }],
    accentColor: '#fbbf24',
    setupTime: '~2s',
    lay: 'term',
  },
  {
    id: 'web',
    name: 'Web App',
    description: 'React + Tailwind',
    category: 'Web',
    icon: <Layout className="w-5 h-5" />,
    stack: ['React', 'Vite', 'Tailwind'],
    treePreview: [
      { depth: 0, label: 'src', isFolder: true },
      { depth: 1, label: 'components', isFolder: true },
      { depth: 1, label: 'App.tsx' },
      { depth: 1, label: 'main.tsx' },
      { depth: 0, label: 'index.html' },
      { depth: 0, label: 'package.json' },
    ],
    accentColor: '#22d3ee',
    setupTime: '~25s',
    lay: 'app',
  },
  {
    id: 'ext',
    name: 'Extension',
    description: 'Browser / VSCode',
    category: 'Web',
    icon: <Package className="w-5 h-5" />,
    stack: ['TypeScript', 'Manifest v3'],
    treePreview: [
      { depth: 0, label: 'src', isFolder: true },
      { depth: 1, label: 'background.ts' },
      { depth: 1, label: 'popup', isFolder: true },
      { depth: 0, label: 'manifest.json' },
      { depth: 0, label: 'package.json' },
    ],
    accentColor: '#34d399',
    setupTime: '~18s',
    lay: 'app',
  },
  {
    id: 'api',
    name: 'API Server',
    description: 'REST + auth',
    category: 'Backend',
    icon: <Server className="w-5 h-5" />,
    stack: ['Node', 'Fastify', 'Prisma'],
    treePreview: [
      { depth: 0, label: 'src', isFolder: true },
      { depth: 1, label: 'routes', isFolder: true },
      { depth: 1, label: 'plugins', isFolder: true },
      { depth: 1, label: 'server.ts' },
      { depth: 0, label: 'prisma', isFolder: true },
      { depth: 0, label: 'package.json' },
    ],
    accentColor: '#a78bfa',
    setupTime: '~30s',
    lay: 'api',
  },
  {
    id: 'cli',
    name: 'CLI Tool',
    description: 'Commands + args',
    category: 'Backend',
    icon: <TerminalIcon className="w-5 h-5" />,
    stack: ['Go', 'Cobra'],
    treePreview: [
      { depth: 0, label: 'cmd', isFolder: true },
      { depth: 1, label: 'root.go' },
      { depth: 1, label: 'run.go' },
      { depth: 0, label: 'internal', isFolder: true },
      { depth: 0, label: 'main.go' },
      { depth: 0, label: 'go.mod' },
    ],
    accentColor: '#34d399',
    setupTime: '~8s',
    lay: 'term',
  },
  {
    id: 'proxy',
    name: 'Proxy Tool',
    description: 'HTTPS capture',
    category: 'Security',
    icon: <Lock className="w-5 h-5" />,
    stack: ['Go', 'MITM', 'SQLite'],
    treePreview: [
      { depth: 0, label: 'proxy', isFolder: true },
      { depth: 1, label: 'capture.go' },
      { depth: 1, label: 'certs.go' },
      { depth: 0, label: 'store', isFolder: true },
      { depth: 0, label: 'config.yaml' },
      { depth: 0, label: 'go.mod' },
    ],
    accentColor: '#f97316',
    setupTime: '~12s',
    lay: 'api',
  },
  {
    id: 'sec',
    name: 'Scanner',
    description: 'Recon pipeline',
    category: 'Security',
    icon: <Shield className="w-5 h-5" />,
    stack: ['Python', 'asyncio'],
    treePreview: [
      { depth: 0, label: 'scanner', isFolder: true },
      { depth: 1, label: 'modules', isFolder: true },
      { depth: 1, label: 'engine.py' },
      { depth: 0, label: 'reports', isFolder: true },
      { depth: 0, label: 'pyproject.toml' },
    ],
    accentColor: '#f97316',
    setupTime: '~15s',
    lay: 'api',
  },
  {
    id: 'agent',
    name: 'AI Agent',
    description: 'Tools + memory',
    category: 'AI',
    icon: <Bot className="w-5 h-5" />,
    stack: ['TypeScript', 'MCP', 'SDK'],
    treePreview: [
      { depth: 0, label: 'agent', isFolder: true },
      { depth: 1, label: 'tools', isFolder: true },
      { depth: 1, label: 'memory.ts' },
      { depth: 1, label: 'loop.ts' },
      { depth: 0, label: 'prompts', isFolder: true },
      { depth: 0, label: 'package.json' },
    ],
    accentColor: '#a78bfa',
    setupTime: '~22s',
    lay: 'app',
  },
];

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const addProject = useCodeStore((s) => s.addProject);

  const [loading, setLoading] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjLoc, setNewProjLoc] = useState('/home/khanhromvn/projects');
  const [selectedTemplateId, setSelectedTemplateId] = useState('web');
  const [templateCategory, setTemplateCategory] = useState<
    'All' | 'Web' | 'Backend' | 'Security' | 'AI'
  >('All');
  const [options, setOptions] = useState({ git: true, readme: true, ignore: true, deps: false });
  const [license, setLicense] = useState('MIT');

  const filteredTemplates = useMemo(() => {
    if (templateCategory === 'All') return TEMPLATES;
    return TEMPLATES.filter((t) => t.category === templateCategory || t.id === 'blank');
  }, [templateCategory]);

  const selectedTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[1],
    [selectedTemplateId],
  );

  const canSubmit = newProjName.trim().length > 0 && !!newProjLoc;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const fullPath = `${newProjLoc}/${newProjName}`;
      await window.api.invoke('fs:mkdir', fullPath);
      addProject({
        name: newProjName,
        path: fullPath,
        color: '#22d3ee',
        template: selectedTemplateId,
      });
      onClose();
    } catch (err) {
      console.error('[CreateProjectModal] Create failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[1000px] h-[690px] p-0 overflow-hidden rounded-xl border border-border shadow-2xl flex flex-col bg-background"
    >
      <ModalHeader
        title="New Project"
        description="Scaffold a fresh project from a template"
        onClose={onClose}
        className="[&_h3]:text-left [&_p]:text-left px-6 py-4 border-b border-border bg-background"
      />
      <ModalBody className="p-0 flex-1 overflow-hidden bg-background">
        <div className="grid grid-cols-[1fr_340px] h-full gap-4 p-4 overflow-hidden">
          {/* Left: Form */}
          <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-text-secondary/50 mb-1.5">
                  Project name
                </label>
                <div className="flex items-center gap-3 bg-sidebar-item-hover rounded-lg px-3 py-2">
                  <Folder className="w-4 h-4 text-text-secondary shrink-0" strokeWidth={1.5} />
                  <input
                    type="text"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    placeholder="my-awesome-app"
                    className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-secondary/60 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-text-secondary/50 mb-1.5">
                  Location
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-3 bg-sidebar-item-hover rounded-lg px-3 py-2">
                    <Home className="w-4 h-4 text-text-secondary shrink-0" strokeWidth={1.5} />
                    <input
                      type="text"
                      value={newProjLoc}
                      onChange={(e) => setNewProjLoc(e.target.value)}
                      className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-secondary/60 text-sm font-mono"
                    />
                  </div>
                  <button className="h-[38px] w-[38px] rounded-lg bg-sidebar-item-hover text-text-secondary hover:bg-sidebar-item-active hover:text-text-primary grid place-items-center transition-colors border-none shrink-0">
                    <FolderOpen className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary/50">
                Template
              </span>
              <div className="flex gap-1.5">
                {(['All', 'Web', 'Backend', 'Security', 'AI'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setTemplateCategory(cat)}
                    className={cn(
                      'h-[26px] px-2.5 rounded-[5px] border text-[11.5px] font-medium transition-colors',
                      templateCategory === cat
                        ? 'bg-warn/12 border-warn/35 text-text-primary'
                        : 'bg-transparent border-border text-text-secondary hover:text-text-primary hover:bg-white/[0.03]',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 auto-rows-[62px]">
              {filteredTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={cn(
                    'flex flex-col justify-between p-2.5 rounded-md border text-left relative overflow-hidden transition-all group',
                    selectedTemplateId === tpl.id
                      ? ''
                      : 'border-border bg-card-background hover:border-white/10',
                  )}
                  style={{
                    borderColor:
                      selectedTemplateId === tpl.id
                        ? `color-mix(in srgb, ${tpl.accentColor} 55%, transparent)`
                        : undefined,
                    backgroundColor:
                      selectedTemplateId === tpl.id
                        ? `color-mix(in srgb, ${tpl.accentColor} 8%, rgb(var(--card-background)))`
                        : undefined,
                  }}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs text-text-primary">
                    <span style={{ color: tpl.accentColor }}>{tpl.icon}</span>
                    {tpl.name}
                  </div>
                  <small className="text-[10.5px] text-text-secondary/60 line-clamp-1">
                    {tpl.description}
                  </small>
                  {selectedTemplateId === tpl.id && (
                    <Check
                      className="absolute right-2 top-2 w-3.5 h-3.5"
                      style={{ color: tpl.accentColor }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { key: 'git', label: 'Initialize Git repository' },
                { key: 'readme', label: 'Add README.md' },
                { key: 'ignore', label: 'Add .gitignore' },
                { key: 'deps', label: 'Install dependencies' },
              ].map((opt) => (
                <div
                  key={opt.key}
                  onClick={() =>
                    setOptions((prev) => ({
                      ...prev,
                      [opt.key]: !prev[opt.key as keyof typeof prev],
                    }))
                  }
                  className={cn(
                    'flex items-center gap-2.5 h-8 px-2.5 rounded-md border cursor-pointer transition-colors text-xs',
                    options[opt.key as keyof typeof options]
                      ? 'bg-card-background border-border text-text-primary'
                      : 'bg-card-background border-border text-text-secondary hover:text-text-primary',
                  )}
                >
                  <div
                    className={cn(
                      'w-3.5 h-3.5 rounded border grid place-items-center transition-colors',
                      options[opt.key as keyof typeof options]
                        ? 'bg-warn border-warn text-button-solid-text'
                        : 'border-border text-transparent',
                    )}
                  >
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  {opt.label}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 bg-sidebar-item-hover rounded-lg px-3 py-2 mt-1">
              <FileText className="w-4 h-4 text-text-secondary shrink-0" strokeWidth={1.5} />
              <select
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-secondary/60 text-sm font-mono appearance-none cursor-pointer [&_option]:bg-sidebar-background [&_option]:text-text-primary"
              >
                {['MIT', 'Apache-2.0', 'GPL-3.0', 'Proprietary'].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 flex flex-col border border-border rounded-lg bg-card-background overflow-hidden">
              <div className="flex items-center gap-2.5 p-3 border-b border-border">
                <div
                  className="w-8 h-8 rounded-md grid place-items-center shrink-0 border"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${selectedTemplate.accentColor} 12%, transparent)`,
                    borderColor: `color-mix(in srgb, ${selectedTemplate.accentColor} 26%, transparent)`,
                    color: selectedTemplate.accentColor,
                  }}
                >
                  {selectedTemplate.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <b className="block text-sm font-semibold text-text-primary truncate">
                    {selectedTemplate.name}
                  </b>
                  <small className="block text-[10.5px] font-mono text-text-secondary truncate">
                    {selectedTemplate.description}
                  </small>
                </div>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded border text-text-secondary whitespace-nowrap"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${selectedTemplate.accentColor} 11%, transparent)`,
                    borderColor: `color-mix(in srgb, ${selectedTemplate.accentColor} 22%, transparent)`,
                    color: selectedTemplate.accentColor,
                  }}
                >
                  {selectedTemplate.setupTime} setup
                </span>
              </div>

              <div className="h-3 shrink-0" />

              {/* Mini Editor Simulation */}
              <div className="mx-3.5 h-[116px] shrink-0 rounded-md border border-border bg-sidebar-background flex flex-col overflow-hidden">
                <div className="h-[18px] border-b border-border flex gap-1 items-center px-2">
                  <i className="w-1 h-1 rounded-full bg-border" />
                  <i className="w-1 h-1 rounded-full bg-border" />
                  <i className="w-1 h-1 rounded-full bg-border" />
                </div>
                <div className="flex-1 grid grid-cols-[34px_1fr] min-h-0">
                  <div className="border-r border-border p-1.5 flex flex-col gap-1">
                    <i
                      className="w-full h-1 rounded-sm"
                      style={{ background: selectedTemplate.accentColor }}
                    />
                    <i className="w-full h-1 rounded-sm bg-border" />
                    <i className="w-full h-1 rounded-sm bg-border" />
                    <i className="w-full h-1 rounded-sm bg-border" />
                  </div>
                  <div className="p-2 flex flex-col gap-1 min-w-0">
                    {selectedTemplate.lay === 'app' ? (
                      <>
                        <i
                          className="w-1/2 h-1 rounded-sm"
                          style={{
                            background: `color-mix(in srgb, ${selectedTemplate.accentColor} 70%, transparent)`,
                          }}
                        />
                        <div className="grid grid-cols-3 gap-1">
                          <i
                            className="h-5 rounded-sm"
                            style={{
                              background: `color-mix(in srgb, ${selectedTemplate.accentColor} 15%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${selectedTemplate.accentColor} 25%, transparent)`,
                            }}
                          />
                          <i
                            className="h-5 rounded-sm"
                            style={{
                              background: `color-mix(in srgb, ${selectedTemplate.accentColor} 15%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${selectedTemplate.accentColor} 25%, transparent)`,
                            }}
                          />
                          <i
                            className="h-5 rounded-sm"
                            style={{
                              background: `color-mix(in srgb, ${selectedTemplate.accentColor} 15%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${selectedTemplate.accentColor} 25%, transparent)`,
                            }}
                          />
                        </div>
                        <div className="flex-1 rounded-sm bg-white/[0.02] border border-border" />
                      </>
                    ) : selectedTemplate.lay === 'api' ? (
                      [70, 55, 80, 45].map((w, i) => (
                        <div key={i} className="flex gap-1.5 items-center">
                          <em
                            className="w-4 h-1.5 rounded-sm"
                            style={{
                              background: `color-mix(in srgb, ${selectedTemplate.accentColor} 32%, transparent)`,
                            }}
                          />
                          <i
                            className="h-1 rounded-sm"
                            style={{ width: `${w}%`, background: $('--border') }}
                          />
                        </div>
                      ))
                    ) : (
                      [40, 70, 55, 30, 62].map((w, i) => (
                        <i
                          key={i}
                          className="h-1 rounded-sm"
                          style={{
                            width: `${w}%`,
                            background:
                              i % 2 === 0
                                ? `color-mix(in srgb, ${selectedTemplate.accentColor} 70%, transparent)`
                                : $('--border'),
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="h-2.5 shrink-0" />

              {/* Tree Preview */}
              <div className="mx-3.5 p-2 rounded-md bg-sidebar-background border border-border font-mono text-[11px] leading-relaxed text-text-secondary flex-1 min-h-0 overflow-hidden">
                {selectedTemplate.treePreview.map((node, idx) => (
                  <div
                    key={idx}
                    style={{ paddingLeft: `${node.depth * 14}px` }}
                    className="flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span className={cn(node.isFolder ? 'text-warn' : '')}>
                      {node.isFolder ? (
                        <FolderOpen className="w-3 h-3" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                    </span>
                    {node.label}
                  </div>
                ))}
              </div>

              <div className="h-2.5 shrink-0" />

              {/* Stack Tags */}
              <div className="mx-3.5 pb-3 flex flex-wrap gap-1.5">
                {selectedTemplate.stack.map((s) => (
                  <span
                    key={s}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded border text-text-secondary"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${selectedTemplate.accentColor} 11%, transparent)`,
                      borderColor: `color-mix(in srgb, ${selectedTemplate.accentColor} 22%, transparent)`,
                      color: selectedTemplate.accentColor,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter className="justify-end px-5 py-4 bg-sidebar-background/50 border-t border-border">
        <div className="flex-1 mr-auto text-[11.5px] text-text-secondary/60 flex items-center gap-3 min-w-0">
          <span>
            Will create in{' '}
            <b className="text-text-primary font-mono">
              {newProjLoc}/{newProjName || '...'}
            </b>
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="h-[30px] px-3.5 text-xs font-medium rounded-md bg-transparent border border-border text-text-secondary hover:bg-white/[0.05] hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className={cn(
              'h-[30px] px-3.5 text-xs font-semibold rounded-md flex items-center gap-2 transition-all border-none',
              canSubmit && !loading
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-text-secondary/10 text-text-secondary/50 cursor-not-allowed',
            )}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Create Project
          </button>
        </div>
      </ModalFooter>
    </Modal>
  );
}

export default CreateProjectModal;
