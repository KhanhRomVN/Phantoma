import { Folder, GitBranch } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { ProjectLogoImage } from '../ProjectLogo';

interface TreeUIPreviewProps {
  projectName: string;
  projectPath: string;
  folderName: string;
  targetDir: string;
  logoPath?: string | null;
  projectBranch?: string;
  newBranch?: string;
}

type RowTag = 'current' | 'new';

interface TreeRow {
  depth: number;
  label: string;
  tag?: RowTag;
}

const trimSlash = (p: string) => p.replace(/\/+$/, '') || '/';

const parentOf = (p: string) => {
  const t = trimSlash(p);
  const i = t.lastIndexOf('/');
  return i <= 0 ? '/' : t.slice(0, i);
};

const baseOf = (p: string) => trimSlash(p).split('/').pop() || p;

function buildGroups(
  projectPath: string,
  projectName: string,
  folderName: string,
  targetDir: string,
): TreeRow[][] {
  const project = trimSlash(projectPath);
  const parent = parentOf(project);
  const target = trimSlash(targetDir || parent);
  const projectLabel = baseOf(project) || projectName;
  const projectSegs = project.split('/').filter(Boolean);
  const targetSegs = target.split('/').filter(Boolean);

  let common = 0;
  while (
    common < projectSegs.length &&
    common < targetSegs.length &&
    projectSegs[common] === targetSegs[common]
  ) {
    common++;
  }

  const projectIsRoot = common === projectSegs.length;
  const rootLabel = common === 0 ? '/' : `/${projectSegs.slice(0, common).join('/')}/`;
  const rows: TreeRow[] = [
    { depth: 0, label: rootLabel, tag: projectIsRoot ? 'current' : undefined },
  ];

  if (!projectIsRoot) {
    projectSegs
      .slice(common, -1)
      .forEach((seg, i) => rows.push({ depth: i + 1, label: seg }));
    rows.push({ depth: projectSegs.length - common, label: projectLabel, tag: 'current' });
  }

  const rel = targetSegs.slice(common);
  rel.forEach((seg, i) => rows.push({ depth: i + 1, label: seg }));
  rows.push({ depth: rel.length + 1, label: folderName, tag: 'new' });

  return [rows];
}

function RowIcon({ tag, logoPath }: { tag?: RowTag; logoPath?: string | null }) {
  const fallback =
    tag === 'new' ? (
      <GitBranch className="h-3.5 w-3.5 text-primary" />
    ) : (
      <Folder className="h-3.5 w-3.5 text-text-secondary" />
    );
  if (!tag || !logoPath) {
    return <span className="grid h-4 w-4 shrink-0 place-items-center">{fallback}</span>;
  }
  return (
    <span className="grid h-4 w-4 shrink-0 place-items-center overflow-hidden rounded-[4px]">
      <ProjectLogoImage
        path={logoPath}
        side={32}
        className="h-full w-full object-contain"
        fallback={fallback}
      />
    </span>
  );
}

function BranchBadge({ name, primary }: { name: string; primary?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-px text-[11px]',
        primary ? 'bg-primary/10 text-primary' : 'bg-white/[0.06] text-text-secondary',
      )}
    >
      <GitBranch className="h-2.5 w-2.5" />
      {name}
    </span>
  );
}

export function TreeUIPreview({
  projectName,
  projectPath,
  folderName,
  targetDir,
  logoPath,
  projectBranch,
  newBranch,
}: TreeUIPreviewProps) {
  const groups = buildGroups(projectPath, projectName, folderName, targetDir);

  return (
    <div className="flex flex-col gap-2">
      {groups.map((rows, gi) => (
        <div
          key={gi}
          className="rounded-md border border-divider bg-input-background/40 px-3 py-2 font-mono text-[12.5px]"
        >
          {rows.map((row, ri) => (
            <div
              key={ri}
              className="flex h-6 items-center gap-1.5"
              style={{ paddingLeft: row.depth * 16 }}
              title={row.label}
            >
              {row.depth > 0 && <span className="text-text-secondary/40">└</span>}
              {(row.depth > 0 || row.tag) && <RowIcon tag={row.tag} logoPath={logoPath} />}
              <span
                className={cn(
                  'min-w-0 truncate',
                  row.tag === 'new' && 'font-semibold text-text-primary',
                  row.tag === 'current' && 'text-text-primary',
                  !row.tag && 'text-text-secondary',
                )}
              >
                {row.label}
              </span>
              {row.tag === 'new' && newBranch && <BranchBadge name={newBranch} primary />}
              {row.tag === 'current' && projectBranch && <BranchBadge name={projectBranch} />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default TreeUIPreview;