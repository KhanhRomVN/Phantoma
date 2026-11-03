import type { ReactNode } from 'react';
import { Eye, EyeOff, Folder, GitBranch } from 'lucide-react';
import {
  CopyButton,
  Panel,
  ProjectMark,
  Section,
  type ProjectSettingsTarget,
} from '../shared';

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Panel className='flex items-center gap-3 px-4 py-3.5'>
      <span
        className='w-9 h-9 rounded-lg grid place-items-center shrink-0'
        style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
      >
        {icon}
      </span>
      <div className='min-w-0'>
        <div className='text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary/60'>
          {label}
        </div>
        <div className='mt-0.5 truncate text-[13px] font-medium text-text-primary'>{value}</div>
      </div>
    </Panel>
  );
}

function DetailRow({
  label,
  children,
  copy,
}: {
  label: string;
  children: ReactNode;
  copy?: string;
}) {
  return (
    <div className='flex items-center gap-3 px-4 py-2.5 min-h-[46px]'>
      <span className='w-[120px] shrink-0 text-xs text-text-secondary'>{label}</span>
      <div className='min-w-0 flex-1 text-xs text-text-primary'>{children}</div>
      {copy && <CopyButton value={copy} />}
    </div>
  );
}

export function OverviewTab({ project }: { project: ProjectSettingsTarget }) {
  const VisibilityIcon = project.hidden ? EyeOff : Eye;
  return (
    <div className='flex flex-col gap-7'>
      <div
        className='rounded-2xl border border-divider p-5'
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${project.color} 16%, transparent) 0%, transparent 65%)`,
        }}
      >
        <div className='flex items-center gap-4'>
          <ProjectMark
            name={project.name}
            color={project.color}
            logoPath={project.logoPath}
            size={76}
          />
          <div className='min-w-0 flex-1'>
            <h3 className='truncate text-lg font-semibold leading-tight text-text-primary'>
              {project.name}
            </h3>
            <div className='mt-2 flex flex-wrap items-center gap-1.5'>
              <span className='inline-flex h-5 items-center gap-1.5 rounded-full border border-divider bg-black/20 px-2 text-[10.5px] text-text-secondary'>
                <span
                  className='h-1.5 w-1.5 rounded-full'
                  style={{ backgroundColor: project.hidden ? '#8b91a1' : '#3fb950' }}
                />
                {project.hidden ? 'Hidden' : 'Visible'}
              </span>
              <span className='inline-flex h-5 items-center gap-1.5 rounded-full border border-divider bg-black/20 px-2 text-[10.5px] text-text-secondary'>
                <Folder className='h-3 w-3' />
                {project.groupName || 'Ungrouped'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-3 gap-3'>
        <Stat
          color={project.color}
          icon={<GitBranch className='h-4 w-4' />}
          label='Branches'
          value={String(project.branchCount)}
        />
        <Stat
          color={project.color}
          icon={<Folder className='h-4 w-4' />}
          label='Group'
          value={project.groupName || 'Ungrouped'}
        />
        <Stat
          color={project.color}
          icon={<VisibilityIcon className='h-4 w-4' />}
          label='Visibility'
          value={project.hidden ? 'Hidden' : 'Visible'}
        />
      </div>

      <Section title='Details' description='Identifiers and location of this project.'>
        <Panel className='divide-y divide-divider'>
          <DetailRow label='Location' copy={project.path}>
            <span className='break-all font-mono'>{project.path}</span>
          </DetailRow>
          <DetailRow label='Project ID' copy={project.id}>
            <span className='break-all font-mono'>{project.id}</span>
          </DetailRow>
          <DetailRow label='Accent color' copy={project.color}>
            <span className='inline-flex items-center gap-2'>
              <span
                className='h-3.5 w-3.5 rounded-full border border-border'
                style={{ backgroundColor: project.color }}
              />
              <span className='font-mono'>{project.color}</span>
            </span>
          </DetailRow>
        </Panel>
      </Section>
    </div>
  );
}