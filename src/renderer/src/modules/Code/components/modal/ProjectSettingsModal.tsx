import { useEffect, useState } from 'react';
import { FolderOpen, Link2, Loader2, X } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { Button } from '@renderer/components/ui/Button';
import { cn } from '@renderer/shared/utils/cn';
import { ProjectLogoImage } from '../ProjectLogo';

type LogoCandidate = { path: string; name: string; width: number; height: number };

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectPath: string;
  logoPath?: string | null;
  onSave: (logoPath: string | null) => void;
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg'];

export function ProjectSettingsModal({
  isOpen,
  onClose,
  projectName,
  projectPath,
  logoPath = null,
  onSave,
}: ProjectSettingsModalProps) {
  const [draft, setDraft] = useState<string | null>(logoPath);
  const [candidates, setCandidates] = useState<LogoCandidate[]>([]);
  const [scanning, setScanning] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlBusy, setUrlBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    setDraft(logoPath);
    setUrlInput('');
    setError('');
    setCandidates([]);
    if (!projectPath) return;
    setScanning(true);
    window.api
      .invoke('fs:scan-square-images', projectPath)
      .then((res: unknown) => {
        if (alive) setCandidates(Array.isArray(res) ? (res as LogoCandidate[]) : []);
      })
      .catch(() => {
        if (alive) setCandidates([]);
      })
      .finally(() => {
        if (alive) setScanning(false);
      });
    return () => {
      alive = false;
    };
  }, [isOpen, projectPath, logoPath]);

  const pickFile = async () => {
    setError('');
    const res = await window.api.invoke('dialog:select-paths', {
      kind: 'file',
      filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }],
    });
    const picked = res?.paths?.[0];
    if (res?.success && picked) setDraft(picked);
  };

  const useUrl = async () => {
    const url = urlInput.trim();
    if (!url || urlBusy) return;
    setUrlBusy(true);
    setError('');
    try {
      const res = await window.api.invoke('fs:download-project-logo', url);
      if (res?.success && res.path) {
        setDraft(res.path);
        setUrlInput('');
      } else {
        setError(res?.error || 'Could not load image from URL');
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load image from URL');
    } finally {
      setUrlBusy(false);
    }
  };

  const items: LogoCandidate[] =
    draft && !candidates.some((c) => c.path === draft)
      ? [{ path: draft, name: draft.split(/[\\/]/).pop() ?? draft, width: 0, height: 0 }, ...candidates]
      : candidates;

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[480px]">
      <ModalBody className="py-5 px-5">
        <div className="flex flex-col gap-5 text-left">
          <div>
            <h3 className="text-base font-semibold text-text-primary leading-snug">
              Project settings
            </h3>
            <p className="mt-0.5 text-xs text-text-secondary truncate" title={projectPath}>
              {projectName}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary/60">
              Logo
            </div>

            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl border border-border bg-white/[0.05] grid place-items-center overflow-hidden shrink-0">
                {draft ? (
                  <ProjectLogoImage
                    path={draft}
                    side={128}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-text-secondary/50">None</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={pickFile}
                  className="h-8 px-3 rounded-md bg-sidebar-item-hover text-xs text-text-secondary hover:bg-sidebar-item-active hover:text-text-primary flex items-center gap-1.5 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Choose from computer
                </button>
                {draft && (
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    className="h-8 px-3 rounded-md text-xs text-text-secondary hover:bg-white/[0.05] hover:text-text-primary flex items-center gap-1.5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/50" />
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void useUrl();
                  }}
                  disabled={urlBusy}
                  spellCheck={false}
                  placeholder="https://example.com/logo.png"
                  className="h-8 w-full rounded-md border border-divider bg-input-background/40 pl-8 pr-3 font-mono text-xs text-text-primary outline-none transition-colors placeholder:text-text-secondary/40 focus:border-text-secondary/60 disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                onClick={() => void useUrl()}
                disabled={!urlInput.trim() || urlBusy}
                className="h-8 px-3 rounded-md bg-sidebar-item-hover text-xs text-text-secondary hover:bg-sidebar-item-active hover:text-text-primary flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {urlBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Use URL
              </button>
            </div>

            {error && <p className="text-xs text-error leading-relaxed">{error}</p>}

            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-text-secondary/50 mb-1.5 flex items-center gap-1.5">
                Found in project
                {scanning && <Loader2 className="w-3 h-3 animate-spin" />}
              </div>
              {items.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                  {items.map((c) => (
                    <button
                      key={c.path}
                      type="button"
                      title={c.width ? `${c.name} (${c.width}×${c.height})` : c.name}
                      onClick={() => setDraft(draft === c.path ? null : c.path)}
                      className={cn(
                        'w-10 h-10 shrink-0 rounded-lg border overflow-hidden grid place-items-center bg-white/[0.05] transition-colors',
                        draft === c.path
                          ? 'border-dashed border-primary'
                          : 'border-border hover:border-text-secondary/60',
                      )}
                    >
                      <ProjectLogoImage
                        path={c.path}
                        side={64}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                !scanning && (
                  <p className="text-xs text-text-secondary/60">No square images found.</p>
                )
              )}
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          className="bg-button-soft-background text-text-secondary hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70 disabled:hover:bg-button-soft-background"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button variant="soft" onClick={handleSave}>
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
}