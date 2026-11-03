import { memo, useEffect, useMemo, useState } from 'react';
import { Copy, Download, ExternalLink, Hash, MessageSquare, Tag, User } from 'lucide-react';

import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@renderer/components/ui/Dropdown';
import { parseRefs, type Commit } from './graph';

interface CommitContextMenuProps {
  commit: Commit;
  projectPath: string;
  position: { top: number; left: number };
  onClose: () => void;
  onNotice: (message: string) => void;
  onApplyToBranch: (commit: Commit) => void;
}

function toWebBase(remote: string): string | null {
  const url = remote.trim().replace(/\.git$/, '');
  const ssh = url.match(/^(?:ssh:\/\/)?git@([^:/]+)[:/](.+)$/);
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`;
  if (/^https?:\/\//i.test(url)) return url.replace(/^(https?:\/\/)[^@/]+@/i, '$1');
  return null;
}

function buildUrl(base: string, kind: 'commit' | 'tag', value: string): string {
  const host = new URL(base).hostname;
  const v = value.split('/').map(encodeURIComponent).join('/');
  if (host.includes('gitlab')) return `${base}/-/${kind === 'commit' ? 'commit' : 'tags'}/${v}`;
  if (host.includes('bitbucket')) return `${base}/${kind === 'commit' ? 'commits' : 'src'}/${v}`;
  return `${base}/${kind === 'commit' ? 'commit' : 'releases/tag'}/${v}`;
}

const MenuLabel = ({ children }: { children: string }) => (
  <div className={'px-3 pt-1.5 pb-1 text-[10.5px] text-text-secondary/50'}>{children}</div>
);

const ICON = 'w-3.5 h-3.5';

export const CommitContextMenu = memo(function CommitContextMenu({
  commit,
  projectPath,
  position,
  onClose,
  onNotice,
  onApplyToBranch,
}: CommitContextMenuProps) {
  const [webBase, setWebBase] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.api
      .invoke('git:remote-url', projectPath)
      .then((res: { url?: string }) => {
        if (!cancelled) setWebBase(res?.url ? toWebBase(res.url) : null);
      })
      .catch(() => {
        if (!cancelled) setWebBase(null);
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  const tags = useMemo(
    () => parseRefs(commit.refs).filter((c) => c.kind === 'tag'),
    [commit.refs],
  );

  const copy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text).then(() => onNotice(`Copied ${label}`));
  };

  const copyMessage = async () => {
    const res = await window.api
      .invoke('git:commit-body', projectPath, commit.hash)
      .catch(() => null);
    copy(res?.message || commit.subject, 'commit message');
  };

  const openUrl = (url: string) => {
    void window.api.invoke('shell:open-external', url);
  };

  return (
    <Dropdown
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      strategy={'fixed'}
      trigger={'contextmenu'}
      position={position}
    >
      <DropdownTrigger asChild>
        <span />
      </DropdownTrigger>

      <DropdownContent>
        <MenuLabel>Copy</MenuLabel>
        <DropdownItem icon={<Hash className={ICON} />} onClick={() => copy(commit.hash, 'commit hash')}>
          Copy commit hash
        </DropdownItem>
        <DropdownItem
          icon={<Copy className={ICON} />}
          onClick={() => copy(commit.hash.slice(0, 7), 'short hash')}
        >
          Copy short hash
        </DropdownItem>
        <DropdownItem icon={<MessageSquare className={ICON} />} onClick={() => void copyMessage()}>
          Copy commit message
        </DropdownItem>
        <DropdownItem
          icon={<User className={ICON} />}
          onClick={() => copy(`${commit.author} <${commit.email}>`, 'author')}
        >
          Copy author
        </DropdownItem>

        <DropdownSeparator />

        <MenuLabel>Branch</MenuLabel>
        <DropdownItem
          icon={<Download className={ICON} />}
          onClick={() => onApplyToBranch(commit)}
        >
          Apply commit to local branch...
        </DropdownItem>

        <DropdownSeparator />

        <MenuLabel>Remote</MenuLabel>
        <DropdownItem
          icon={<ExternalLink className={ICON} />}
          disabled={!webBase}
          onClick={() => webBase && openUrl(buildUrl(webBase, 'commit', commit.hash))}
        >
          Open commit on remote
        </DropdownItem>
        {tags.map((t) => (
          <DropdownItem
            key={t.label}
            icon={<Tag className={ICON} />}
            disabled={!webBase}
            onClick={() => webBase && openUrl(buildUrl(webBase, 'tag', t.label))}
          >
            {`Open tag "${t.label}" on remote`}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
});