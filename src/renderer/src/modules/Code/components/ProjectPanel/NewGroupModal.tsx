import { useState, useMemo, memo } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Folder, Search, X } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { ProjectIcon, getProjectIdentity } from './ProjectCard';

const MAX_NAME_LENGTH = 30;

const sanitizeName = (value: string) =>
  value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, MAX_NAME_LENGTH);

interface NewGroupProject {
  id: string;
  name: string;
  groupId?: string | null;
}

interface NewGroupInfo {
  id: string;
  name: string;
}

interface NewGroupModalProps {
  projects: NewGroupProject[];
  groups: NewGroupInfo[];
  onSave: (name: string, projectIds: string[]) => void;
  onCancel: () => void;
}

export const NewGroupModal = memo(function NewGroupModal({
  projects,
  groups,
  onSave,
  onCancel,
}: NewGroupModalProps) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const searching = query.trim().length > 0;

  const tree = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (p: NewGroupProject) => !q || p.name.toLowerCase().includes(q);
    const groupIds = new Set(groups.map((g) => g.id));
    const grouped = groups
      .map((g) => ({ group: g, items: projects.filter((p) => p.groupId === g.id && match(p)) }))
      .filter((node) => node.items.length > 0);
    const loose = projects.filter((p) => !(p.groupId && groupIds.has(p.groupId)) && match(p));
    return { grouped, loose };
  }, [projects, groups, query]);

  const conflictGroups = useMemo(() => {
    const names = new Set<string>();
    projects.forEach((p) => {
      if (!selected.includes(p.id)) return;
      const g = groups.find((x) => x.id === p.groupId);
      if (g) names.add(g.name);
    });
    return Array.from(names);
  }, [projects, groups, selected]);

  const conflictCount = useMemo(
    () =>
      projects.filter((p) => selected.includes(p.id) && groups.some((g) => g.id === p.groupId))
        .length,
    [projects, groups, selected],
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = () => {
    if (!name) return;
    if (conflictCount > 0) {
      setConfirmOpen(true);
      return;
    }
    onSave(name, selected);
  };

  const renderProject = (p: NewGroupProject) => {
    const active = selected.includes(p.id);
    const identity = getProjectIdentity(p.id + p.name);
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => toggle(p.id)}
        style={
          active
            ? {
                borderColor: `color-mix(in srgb, ${identity.color} 40%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${identity.color} 10%, transparent)`,
              }
            : undefined
        }
        className={cn(
          'w-full shrink-0 flex items-center gap-2.5 px-3 h-11 rounded-lg border text-left cursor-pointer transition-colors',
          active
            ? 'text-text-primary'
            : 'border-divider bg-card-background text-text-secondary hover:bg-card-hover hover:text-text-primary',
        )}
      >
        <ProjectIcon color={identity.color} Icon={identity.Icon} />
        <span className="text-[12.5px] truncate">{p.name}</span>
      </button>
    );
  };

  if (confirmOpen) {
    return (
      <Modal isOpen onClose={() => setConfirmOpen(false)} className="max-w-[400px]">
        <ModalBody className="py-6 px-5">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary shrink-0">
              <AlertTriangle className="w-5 h-5" strokeWidth={1.8} />
            </div>

            <h3 className="text-base font-semibold text-text-primary leading-snug">
              Move Projects?
            </h3>

            <p className="text-xs text-text-secondary leading-relaxed max-w-[300px]">
              {conflictCount} selected {conflictCount === 1 ? 'project already belongs' : 'projects already belong'} to{' '}
              <b className="font-medium text-text-primary">{conflictGroups.join(', ')}</b>. Moving{' '}
              {conflictCount === 1 ? 'it' : 'them'} to{' '}
              <b className="font-medium text-text-primary">{name}</b> will remove{' '}
              {conflictCount === 1 ? 'it' : 'them'} from the current group.
            </p>
          </div>
        </ModalBody>

        <ModalFooter className="gap-0 p-0 border-t border-divider">
          <button
            onClick={() => setConfirmOpen(false)}
            className="flex-1 h-[42px] text-xs font-medium text-text-secondary hover:bg-white/[0.03] hover:text-text-primary transition-colors border-r border-divider"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(name, selected)}
            className="flex-1 h-[42px] text-xs font-semibold text-primary hover:bg-primary/[0.06] transition-colors flex items-center justify-center gap-1.5"
          >
            Move
          </button>
        </ModalFooter>
      </Modal>
    );
  }

  const nothing = tree.grouped.length === 0 && tree.loose.length === 0;

  return (
    <Modal isOpen onClose={onCancel} className="max-w-[480px]">
      <ModalHeader
        title="New group"
        description="Organize related projects together"
        onClose={onCancel}
      />

      <ModalBody className="flex flex-col gap-4 py-4">
        <Input
          label="Name"
          autoFocus
          value={name}
          maxLength={MAX_NAME_LENGTH}
          inputClassName="focus:border-input-border-default"
          placeholder="e.g. Backend-services"
          hint={`${name.length}/${MAX_NAME_LENGTH} · letters, numbers, - and _ only`}
          onChange={(e) => setName(sanitizeName(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">Projects</span>
            <span className="text-[10.5px] font-mono text-text-secondary/50">
              {selected.length}/{projects.length}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/60 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full h-8 pl-8 pr-8 rounded-lg border border-divider bg-card-background text-[12.5px] text-text-primary placeholder:text-text-secondary/50 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto">
            {nothing && (
              <div className="px-3 py-4 text-center text-xs text-text-secondary">
                {searching ? 'No matching projects' : 'No projects available'}
              </div>
            )}

            {tree.grouped.map(({ group, items }) => {
              const open = searching || !collapsed.includes(group.id);
              return (
                <div key={group.id} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(group.id)}
                    className="flex items-center gap-1.5 px-1.5 h-7 rounded-md text-left cursor-pointer text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
                  >
                    {open ? (
                      <ChevronDown className="w-3 h-3 shrink-0 text-text-secondary/60" />
                    ) : (
                      <ChevronRight className="w-3 h-3 shrink-0 text-text-secondary/60" />
                    )}
                    <Folder className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 min-w-0 truncate font-mono text-[12px] font-semibold">
                      {group.name}
                    </span>
                    <span className="font-mono text-[10.5px] text-text-secondary/50">{items.length}</span>
                  </button>
                  {open && (
                    <div className="relative ml-[11px] flex flex-col gap-1">
                      {items.map((p, i) => (
                        <div key={p.id} className="relative pl-5 shrink-0">
                          <span className="absolute left-0 top-0 h-[22px] w-4 border-l border-b border-divider rounded-bl-[10px] pointer-events-none" />
                          {i < items.length - 1 && (
                            <span className="absolute left-0 top-[22px] -bottom-1 w-px bg-divider pointer-events-none" />
                          )}
                          {renderProject(p)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {tree.loose.map(renderProject)}
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          className="bg-button-soft-background text-text-secondary hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70 disabled:hover:bg-button-soft-background"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70 disabled:hover:bg-button-soft-background"
          disabled={!name}
          onClick={handleSubmit}
        >
          Create
        </Button>
      </ModalFooter>
    </Modal>
  );
});

export default NewGroupModal;