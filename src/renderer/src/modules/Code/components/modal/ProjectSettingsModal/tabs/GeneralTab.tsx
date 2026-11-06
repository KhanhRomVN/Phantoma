import { useEffect, useState } from 'react';
import { Check, EyeOff } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import {
  Panel,
  Section,
  Toggle,
  type ProjectSettingsPatch,
  type ProjectSettingsTarget,
} from '../shared';

const MAX_NAME_LENGTH = 50;

interface GeneralTabProps {
  project: ProjectSettingsTarget;
  onChange: (patch: ProjectSettingsPatch) => void;
}

export function GeneralTab({ project, onChange }: GeneralTabProps) {
  const [name, setName] = useState(project.name);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(project.name);
  }, [project.name]);

  const trimmed = name.trim();
  const dirty = trimmed.length > 0 && trimmed !== project.name;

  const commit = () => {
    if (!trimmed) {
      setName(project.name);
      return;
    }
    if (!dirty) return;
    onChange({ name: trimmed });
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  return (
    <div className='flex flex-col gap-8'>
      <Section
        title='Project name'
        description='The name shown in the project list. It does not rename the folder on disk.'
      >
        <Panel className='flex flex-col gap-2.5 p-4'>
          <div className='flex items-center gap-2'>
            <input
              value={name}
              maxLength={MAX_NAME_LENGTH}
              spellCheck={false}
              onChange={(e) => setName(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commit();
                }
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setName(project.name);
                }
              }}
              className='h-9 min-w-0 flex-1 rounded-lg border border-divider bg-input-background/40 px-3 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-secondary/40 focus:border-text-secondary/60'
            />
            {saved ? (
              <span className='inline-flex h-9 items-center gap-1.5 px-2 text-xs text-primary'>
                <Check className='h-3.5 w-3.5' />
                Saved
              </span>
            ) : (
              <button
                type='button'
                disabled={!dirty}
                onClick={commit}
                className='h-9 cursor-pointer rounded-lg bg-button-soft-background px-4 text-xs font-medium text-primary transition-colors hover:bg-button-soft-background/80 disabled:pointer-events-none disabled:opacity-40'
              >
                Save
              </button>
            )}
          </div>
          <div className='flex items-center justify-between text-[10.5px] text-text-secondary/60'>
            <span>Press Enter to save, Esc to revert</span>
            <span className='font-mono'>
              {name.length}/{MAX_NAME_LENGTH}
            </span>
          </div>
        </Panel>
      </Section>

      <Section
        title='Visibility'
        description='Control whether this project appears in the project list.'
      >
        <Panel className='flex items-center gap-4 px-4 py-3.5'>
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors',
              project.hidden
                ? 'bg-primary/10 text-primary'
                : 'bg-white/[0.05] text-text-secondary',
            )}
          >
            <EyeOff className='h-4 w-4' />
          </span>
          <div className='min-w-0 flex-1'>
            <div className='text-[13px] font-medium text-text-primary'>
              Hide from project list
            </div>
            <p className='mt-0.5 text-xs leading-relaxed text-text-secondary'>
              The project stays on disk and can be restored from the visibility menu in the panel
              header.
            </p>
          </div>
          <Toggle
            checked={project.hidden}
            label='Hide from project list'
            onChange={(value) => onChange({ hidden: value })}
          />
        </Panel>
      </Section>
    </div>
  );
}