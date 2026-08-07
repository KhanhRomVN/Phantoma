import { useState, useCallback, useEffect } from 'react';
import { Folder, ChevronRight, Check } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';
import { cn } from '@renderer/shared/utils/cn';

// ─── Data ───────────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { label: string; color: string; desc: string }> = {
  web: { label: 'Web App', color: '#5eb3ff', desc: 'Ứng dụng chạy trên trình duyệt' },
  api: { label: 'API Service', color: '#3ecf8e', desc: 'Dịch vụ backend / REST / GraphQL' },
  cli: { label: 'CLI Tool', color: '#ff9d5c', desc: 'Công cụ dòng lệnh' },
  lib: { label: 'Library', color: '#c792ea', desc: 'Thư viện dùng lại nhiều nơi' },
  mobile: { label: 'Mobile App', color: '#ff6b9d', desc: 'Ứng dụng iOS / Android' },
  empty: { label: 'Trống', color: '#7d8394', desc: 'Thư mục trống, tự cấu hình' },
};

interface TemplateItem {
  key: string;
  name: string;
  desc: string;
}

const TEMPLATES: Record<string, TemplateItem[]> = {
  web: [
    { key: 'vite-react', name: 'Vite + React', desc: 'React 18, TypeScript, HMR nhanh' },
    { key: 'next', name: 'Next.js', desc: 'App Router, SSR sẵn dùng' },
    { key: 'sveltekit', name: 'SvelteKit', desc: 'Nhẹ, tốc độ tải trang cao' },
    { key: 'vue', name: 'Vue 3', desc: 'Composition API, Vite' },
  ],
  api: [
    { key: 'express-ts', name: 'Express + TypeScript', desc: 'REST API tối giản, kiểu tĩnh' },
    { key: 'fastapi', name: 'FastAPI', desc: 'Python, tự sinh docs OpenAPI' },
    { key: 'fiber', name: 'Go Fiber', desc: 'Hiệu năng cao, cú pháp giống Express' },
  ],
  cli: [
    { key: 'commander', name: 'Node CLI (Commander)', desc: 'Công cụ dòng lệnh bằng Node.js' },
    { key: 'click', name: 'Python Click', desc: 'CLI Python có subcommand' },
    { key: 'cobra', name: 'Go Cobra', desc: 'CLI Go, dùng cho nhiều tool lớn' },
  ],
  lib: [
    { key: 'ts-lib', name: 'TypeScript Library', desc: 'Build ESM + CJS, sẵn test' },
    { key: 'py-pkg', name: 'Python Package', desc: 'Cấu trúc chuẩn để publish PyPI' },
  ],
  mobile: [
    { key: 'rn', name: 'React Native', desc: 'Dùng chung code iOS & Android' },
    { key: 'flutter', name: 'Flutter', desc: 'Dart, UI native tốc độ cao' },
  ],
  empty: [{ key: 'blank', name: 'Thư mục trống', desc: 'Không cài đặt gì thêm' }],
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const slugify = (str: string): string =>
  str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'du-an-moi';

// ─── Component ──────────────────────────────────────────────────────────────
interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectLocation, setProjectLocation] = useState('~/dev');

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setSelectedType(null);
      setSelectedTemplate(null);
      setProjectName('');
      setProjectLocation('~/dev');
    }
  }, [isOpen]);

  const slug = slugify(projectName);
  const previewPath = `${projectLocation.replace(/\/$/, '')}/${slug}`;
  const canCreate = selectedType && selectedTemplate && projectName.trim().length > 0;

  const handleBrowse = useCallback(async () => {
    try {
      const result = await window.api.invoke('selectFolder');
      if (result?.success && result.folderPath) {
        setProjectLocation(result.folderPath);
      }
    } catch {
      // user cancelled
    }
  }, []);

  const handleCreate = useCallback(() => {
    if (!canCreate) return;
    // TODO: implement actual project creation logic
    window.api?.invoke('openFolder', { path: previewPath });
    onClose();
  }, [canCreate, previewPath, onClose]);

  const templates = selectedType ? TEMPLATES[selectedType] || [] : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <ModalHeader title="Tạo dự án mới" onClose={onClose} />

      <ModalBody className="space-y-5">
        {/* Section 1: Type */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-4 h-4 rounded text-[10px] font-mono flex items-center justify-center bg-sidebar-item-hover text-text-secondary">
              1
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary/50">
              Loại dự án
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedType(key);
                  setSelectedTemplate(null);
                }}
                className={cn(
                  'flex flex-col gap-1.5 p-2.5 rounded-lg border text-left transition-colors',
                  selectedType === key
                    ? 'border-[var(--type-color)] bg-[var(--type-color)]/10'
                    : 'border-border bg-sidebar-item-hover/50 hover:bg-sidebar-item-hover',
                )}
                style={{ '--type-color': meta.color } as React.CSSProperties}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <span className="text-xs font-semibold text-text-primary">{meta.label}</span>
                <span className="text-[10px] text-text-secondary/50 leading-tight">
                  {meta.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Template */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-4 h-4 rounded text-[10px] font-mono flex items-center justify-center bg-sidebar-item-hover text-text-secondary">
              2
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary/50">
              Template
            </span>
          </div>
          {!selectedType ? (
            <p className="text-xs text-text-secondary/40 py-3 text-center">
              Chọn loại dự án ở trên trước
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {templates.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSelectedTemplate(t.key)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
                    selectedTemplate === t.key
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-sidebar-item-hover/50 hover:bg-sidebar-item-hover',
                  )}
                >
                  <span
                    className={cn(
                      'w-7 h-7 rounded-md flex items-center justify-center font-mono text-[11px] font-bold shrink-0',
                      selectedTemplate === t.key
                        ? 'bg-accent text-[#1a1206]'
                        : 'bg-sidebar-item-hover text-text-secondary',
                    )}
                  >
                    {t.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary">{t.name}</div>
                    <div className="text-[11px] text-text-secondary/50 mt-0.5">{t.desc}</div>
                  </div>
                  {selectedTemplate === t.key && (
                    <Check className="w-4 h-4 text-accent shrink-0" strokeWidth={2.4} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Name & Location */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-4 h-4 rounded text-[10px] font-mono flex items-center justify-center bg-sidebar-item-hover text-text-secondary">
              3
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary/50">
              Tên &amp; vị trí
            </span>
          </div>
          <div className="space-y-2.5">
            {/* Project name */}
            <div>
              <label className="text-[11px] text-text-secondary font-medium mb-1 block">
                Tên dự án
              </label>
              <div className="flex items-center bg-input-background border border-border rounded-md px-2.5 focus-within:border-accent transition-colors">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="vi-du-du-an-moi"
                  className="flex-1 bg-transparent border-none outline-none py-2 text-sm text-text-primary font-mono placeholder:text-text-secondary/30"
                />
              </div>
            </div>
            {/* Location */}
            <div>
              <label className="text-[11px] text-text-secondary font-medium mb-1 block">
                Thư mục chứa
              </label>
              <div className="flex items-center bg-input-background border border-border rounded-md pl-2.5 focus-within:border-accent transition-colors">
                <Folder className="w-3.5 h-3.5 text-text-secondary/40 shrink-0" strokeWidth={1.5} />
                <input
                  type="text"
                  value={projectLocation}
                  onChange={(e) => setProjectLocation(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none py-2 px-2 text-sm text-text-primary font-mono placeholder:text-text-secondary/30"
                />
                <button
                  onClick={handleBrowse}
                  className="shrink-0 text-xs font-medium text-accent px-2.5 py-1.5 rounded-md hover:bg-accent/10 transition-colors"
                >
                  Duyệt…
                </button>
              </div>
            </div>
            {/* Path preview */}
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-sidebar-item-hover/50 border border-dashed border-border">
              <ChevronRight className="w-3 h-3 text-accent shrink-0" strokeWidth={2} />
              <span className="text-xs text-text-secondary font-mono truncate">
                Sẽ tạo tại: <span className="text-text-primary font-semibold">{previewPath}</span>
              </span>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-sidebar-item-hover transition-colors"
        >
          Hủy
        </button>
        <button
          onClick={handleCreate}
          disabled={!canCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-[#1a1206] text-sm font-medium disabled:opacity-35 disabled:pointer-events-none hover:bg-accent/80 transition-colors"
        >
          Tạo dự án
          <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default NewProjectModal;
