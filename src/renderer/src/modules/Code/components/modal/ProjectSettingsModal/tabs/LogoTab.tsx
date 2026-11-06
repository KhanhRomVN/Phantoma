import { useEffect, useState } from 'react';
import { Check, FolderOpen, Link2, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { ProjectLogoImage } from '../../../ProjectLogo';
import {
  Panel,
  ProjectMark,
  Section,
  type ProjectSettingsPatch,
  type ProjectSettingsTarget,
} from '../shared';

type LogoCandidate = { path: string; name: string; width: number; height: number };

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg'];

interface LogoTabProps {
  project: ProjectSettingsTarget;
  onChange: (patch: ProjectSettingsPatch) => void;
}

export function LogoTab({ project, onChange }: LogoTabProps) {
  const [candidates, setCandidates] = useState<LogoCandidate[]>([]);
  const [scanning, setScanning] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlBusy, setUrlBusy] = useState(false);
  const [error, setError] = useState('');

  const projectPath = project.path;

  useEffect(() => {
    let alive = true;
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
  }, [projectPath]);

  const pickFile = async () => {
    setError('');
    const res = await window.api.invoke('dialog:select-paths', {
      kind: 'file',
      filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }],
    });
    const picked = res?.paths?.[0];
    if (res?.success && picked) onChange({ logoPath: picked });
  };

  const applyUrl = async () => {
    const url = urlInput.trim();
    if (!url || urlBusy) return;
    setUrlBusy(true);
    setError('');
    try {
      const res = await window.api.invoke('fs:download-project-logo', url);
      if (res?.success && res.path) {
        onChange({ logoPath: res.path });
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

  const current = project.logoPath ?? null;

  return (
    <div className='flex flex-col gap-8'>
      <Section
        title='Project logo'
        description='Shown in the project list and across the workspace. Square images work best.'
      >
        <Panel className='flex items-center gap-5 p-5'>
          <ProjectMark
            name={project.name}
            color={project.color}
            logoPath={current}
            size={96}
          />
          <div className='flex min-w-0 flex-1 flex-col gap-3'>
            <div className='min-w-0'>
              <div className='truncate text-[13px] font-medium text-text-primary'>
                {current ? (current.split('/').pop() ?? current) : 'Default icon'}
              </div>
              <div className='mt-0.5 truncate text-xs text-text-secondary' title={current ?? ''}>
                {current ?? 'No custom logo selected'}
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <button
                type='button'
                onClick={() => void pickFile()}
                className='flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-button-soft-background px-3.5 text-xs font-medium text-primary transition-colors hover:bg-button-soft-background/80'
              >
                <FolderOpen className='h-3.5 w-3.5' />
                Choose from computer
              </button>
              <button
                type='button'
                disabled={!current}
                onClick={() => onChange({ logoPath: null })}
                className='flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-xs text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary disabled:pointer-events-none disabled:opacity-40'
              >
                <Trash2 className='h-3.5 w-3.5' />
                Remove
              </button>
            </div>
          </div>
        </Panel>
      </Section>

      <Section title='Import from URL' description='Download an image and use it as the project logo.'>
        <div className='flex items-center gap-2'>
          <div className='relative min-w-0 flex-1'>
            <Link2 className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary/50' />
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void applyUrl();
              }}
              disabled={urlBusy}
              spellCheck={false}
              placeholder='https://example.com/logo.png'
              className='h-9 w-full rounded-lg border border-divider bg-input-background/40 pl-9 pr-3 font-mono text-xs text-text-primary outline-none transition-colors placeholder:text-text-secondary/40 focus:border-text-secondary/60 disabled:opacity-50'
            />
          </div>
          <button
            type='button'
            onClick={() => void applyUrl()}
            disabled={!urlInput.trim() || urlBusy}
            className='flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-button-soft-background px-4 text-xs font-medium text-primary transition-colors hover:bg-button-soft-background/80 disabled:pointer-events-none disabled:opacity-40'
          >
            {urlBusy && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
            Use URL
          </button>
        </div>
        {error && <p className='text-xs leading-relaxed text-error'>{error}</p>}
      </Section>

      <Section
        title='Found in project'
        description='Square images detected inside the project folder.'
      >
        {candidates.length > 0 ? (
          <div className='grid grid-cols-6 gap-2.5'>
            {candidates.map((c) => {
              const active = current === c.path;
              return (
                <button
                  key={c.path}
                  type='button'
                  title={`${c.name} (${c.width}×${c.height})`}
                  onClick={() => onChange({ logoPath: c.path })}
                  className={cn(
                    'relative aspect-square cursor-pointer overflow-hidden rounded-xl border bg-white/[0.04] p-2 transition-all',
                    active
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-divider hover:border-text-secondary/60 hover:bg-card-hover',
                  )}
                >
                  <ProjectLogoImage
                    path={c.path}
                    side={128}
                    className='h-full w-full object-contain'
                  />
                  {active && (
                    <span className='absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-white'>
                      <Check className='h-2.5 w-2.5' strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <Panel className='flex h-20 items-center justify-center gap-2 text-xs text-text-secondary'>
            {scanning ? (
              <>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                Scanning project...
              </>
            ) : (
              'No square images found in this project.'
            )}
          </Panel>
        )}
      </Section>
    </div>
  );
}