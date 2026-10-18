import { memo, useState, useEffect, useRef } from 'react';
import {
  CalendarDays,
  Tag,
  ListChecks,
  Paperclip,
  FileText,
  Folder,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  UploadCloud,
  Circle,
  Loader,
  Eye,
  CheckCircle2,
  X,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { $ } from '@renderer/utils/color';
import { Modal, ModalBody } from '@renderer/components/ui/Modal';
import { Calendar } from '@renderer/components/ui/Calendar';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import {
  dialogService,
  type StoredTask,
  type CreateTaskInput,
  type UpdateTaskInput,
  type TaskStatus,
  type TaskPriority,
  type TaskTag,
  type TaskChecklistItem,
  type TaskAttachment,
  getAncestorIds,
  getDescendantIds,
  getBlockers,
  getUnfinishedChain,
  formatTaskRange,
} from '../../../services/task.service';
import { ConfirmForceStartTaskModal } from './ConfirmForceStartTaskModal';

interface SelectOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  color?: string;
}

const STATUSES: SelectOption[] = [
  { value: 'todo', label: 'Todo', icon: Circle, color: '--text-secondary' },
  { value: 'progress', label: 'In Progress', icon: Loader, color: '--info' },
  { value: 'review', label: 'In Review', icon: Eye, color: '--warn' },
  { value: 'done', label: 'Done', icon: CheckCircle2, color: '--success' },
];

const PRIORITIES: [TaskPriority, string, string][] = [
  ['high', 'High', '--error'],
  ['medium', 'Medium', '--warn'],
  ['low', 'Low', '--text-secondary'],
];

const TAG_COLORS = ['--blue', '--green', '--yellow', '--red', '--purple', '--pink', '--teal', '--violet'];

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary/50 outline-none focus:outline-none focus:ring-0 transition-colors';

const SOFT_BUTTON = 'bg-primary/15 text-primary hover:bg-primary/25 transition-colors cursor-pointer';

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const baseName = (p: string) => p.split(/[\\/]/).filter(Boolean).pop() ?? p;

const getFilePath = (file: File): string =>
  (file as any).path || (window as any).electron?.webUtils?.getPathForFile?.(file) || '';

function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateLabel(value: string): string {
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

interface TaskModalProps {
  open: boolean;
  task?: StoredTask | null;
  allTasks?: StoredTask[];
  defaultStatus?: TaskStatus;
  onClose: () => void;
  onSubmit: (
    data: CreateTaskInput | UpdateTaskInput,
    nextIds: string[],
    forceChain?: StoredTask[],
  ) => void;
  onDelete?: () => void;
  onSwitchTask?: (task: StoredTask) => void;
}

export const TaskModal = memo(function TaskModal({
  open,
  task,
  allTasks,
  defaultStatus,
  onClose,
  onSubmit,
  onDelete,
  onSwitchTask,
}: TaskModalProps) {
  const isEdit = !!task;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [startDateStr, setStartDateStr] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [endTime, setEndTime] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [nextIds, setNextIds] = useState<string[]>([]);
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);
  const [forced, setForced] = useState(false);
  const allTasksRef = useRef<StoredTask[]>([]);
  allTasksRef.current = allTasks ?? [];
  const [tags, setTags] = useState<TaskTag[]>([]);
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [attachSearch, setAttachSearch] = useState('');
  const attachQuery = attachSearch.trim().toLowerCase();
  const visibleAttachments = attachQuery
    ? attachments.filter((a) => a.path.toLowerCase().includes(attachQuery))
    : attachments;

  const [tagInput, setTagInput] = useState('');
  const [checkInput, setCheckInput] = useState('');

  const addAttachmentsRef = useRef<(items: TaskAttachment[]) => void>(() => {});
  addAttachmentsRef.current = (items) => {
    if (items.length === 0) return;
    setAttachments((prev) => {
      const existing = new Set(prev.map((a) => a.path));
      return [...prev, ...items.filter((i) => !existing.has(i.path))];
    });
  };

  const baselineRef = useRef('');

  useEffect(() => {
    if (!open) return;
    const init = {
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? defaultStatus ?? 'todo',
      priority: task?.priority ?? 'medium',
      startDateStr: task?.startDate ? toDateInputValue(task.startDate) : '',
      startTime: task?.startTime ?? '',
      endDateStr: task?.endDate ? toDateInputValue(task.endDate) : '',
      endTime: task?.endTime ?? '',
      dependsOn: task?.dependsOn ?? [],
      nextIds: task
        ? allTasksRef.current.filter((t) => (t.dependsOn ?? []).includes(task.id)).map((t) => t.id)
        : [],
      tags: task?.tags ?? [],
      checklist: task?.checklist ?? [],
      attachments: task?.attachments ?? [],
    };
    baselineRef.current = JSON.stringify(init);
    setTitle(init.title);
    setDescription(init.description);
    setStatus(init.status);
    setPriority(init.priority);
    setStartDateStr(init.startDateStr);
    setStartTime(init.startTime);
    setEndDateStr(init.endDateStr);
    setEndTime(init.endTime);
    setStartOpen(false);
    setEndOpen(false);
    setDependsOn(init.dependsOn);
    setNextIds(init.nextIds);
    setTags(init.tags);
    setChecklist(init.checklist);
    setAttachments(init.attachments);
    setTagInput('');
    setCheckInput('');
    setIsDragging(false);
    setAttachSearch('');
    setPendingStatus(null);
    setForced(false);
  }, [open, task?.id, defaultStatus]);

  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length === 0) return;
      const items: TaskAttachment[] = files
        .map((f) => getFilePath(f))
        .filter(Boolean)
        .map((path) => ({ path, kind: 'file' as const }));
      if (items.length === 0) return;
      e.preventDefault();
      addAttachmentsRef.current(items);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const items: TaskAttachment[] = [];
    for (const item of Array.from(e.dataTransfer.items)) {
      if (item.kind !== 'file') continue;
      const entry = item.webkitGetAsEntry?.();
      const file = item.getAsFile();
      if (!file) continue;
      const path = getFilePath(file);
      if (!path) continue;
      items.push({ path, kind: entry?.isDirectory ? 'folder' : 'file' });
    }
    addAttachmentsRef.current(items);
  };

  const addTag = () => {
    const label = tagInput.trim();
    if (!label || tags.some((t) => t.label.toLowerCase() === label.toLowerCase())) return;
    const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
    setTags((prev) => [...prev, { id: uid(), label, color }]);
    setTagInput('');
  };

  const addCheckItem = () => {
    const text = checkInput.trim();
    if (!text) return;
    setChecklist((prev) => [...prev, { id: uid(), text, done: false }]);
    setCheckInput('');
  };

  const pickFiles = async () => {
    const paths = await dialogService.selectPaths('file');
    addAttachmentsRef.current(paths.map((path) => ({ path, kind: 'file' as const })));
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    if (rangeInvalid) return;
    onSubmit(
      {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        startDate: startDateStr ? new Date(startDateStr + 'T00:00:00').getTime() : null,
        startTime: startDateStr && startTime ? startTime : null,
        endDate: endDateStr ? new Date(endDateStr + 'T00:00:00').getTime() : null,
        endTime: endDateStr && endTime ? endTime : null,
        dependsOn,
        tags,
        checklist,
        attachments,
      },
      nextIds,
      forced && status !== 'todo'
        ? getUnfinishedChain({ dependsOn }, allTasksRef.current)
        : undefined,
    );
  };

  const startMs = startDateStr
    ? new Date(startDateStr + 'T' + (startTime || '00:00') + ':00').getTime()
    : null;
  const endMs = endDateStr
    ? new Date(endDateStr + 'T' + (endTime || '23:59') + ':59').getTime()
    : null;
  const rangeInvalid = startMs !== null && endMs !== null && startMs > endMs;

  const everyTask = allTasks ?? [];
  const others = everyTask.filter((t) => t.id !== task?.id && !t.archived);
  const descendantIds = task ? getDescendantIds(task.id, everyTask) : new Set<string>();
  const ancestorIds = task ? getAncestorIds(task.id, everyTask) : new Set<string>();
  const prevOptions = others.filter(
    (t) => !dependsOn.includes(t.id) && !nextIds.includes(t.id) && !descendantIds.has(t.id),
  );
  const nextOptions = others.filter(
    (t) =>
      !nextIds.includes(t.id) &&
      !dependsOn.includes(t.id) &&
      !ancestorIds.has(t.id) &&
      (t.status === 'todo' || status === 'done'),
  );

  const doneCount = checklist.filter((c) => c.done).length;
  const canSubmit = !!title.trim() && !rangeInvalid;
  const statusMeta = STATUSES.find((s) => s.value === status);
  const StatusMetaIcon = statusMeta?.icon;
  const priorityMeta = PRIORITIES.find(([k]) => k === priority);
  const statusLocked = !forced && getBlockers({ dependsOn }, everyTask).length > 0;
  const requestStatus = (v: string) => {
    const next = v as TaskStatus;
    if (next === status) return;
    if (next !== 'todo' && statusLocked) setPendingStatus(next);
    else setStatus(next);
  };

  const formSnapshot = JSON.stringify({
    title,
    description,
    status,
    priority,
    startDateStr,
    startTime,
    endDateStr,
    endTime,
    dependsOn,
    nextIds,
    tags,
    checklist,
    attachments,
  });

  const commitEdit = () => {
    baselineRef.current = formSnapshot;
    handleSubmit();
  };

  const flushEdit = () => {
    if (isEdit && canSubmit && formSnapshot !== baselineRef.current) commitEdit();
  };

  const handleClose = () => {
    flushEdit();
    onClose();
  };

  const handleSwitch = (t: StoredTask) => {
    flushEdit();
    onSwitchTask?.(t);
  };

  useEffect(() => {
    if (!open || !isEdit || !canSubmit || formSnapshot === baselineRef.current) return;
    const timer = setTimeout(() => {
      if (formSnapshot !== baselineRef.current) commitEdit();
    }, 500);
    return () => clearTimeout(timer);
  }, [open, isEdit, canSubmit, formSnapshot]);

  return (
    <>
    <Modal isOpen={open} onClose={handleClose} className="max-w-7xl w-[94vw] h-[85vh]">
      <div className="px-5 py-3.5 border-b border-divider shrink-0 flex items-center gap-3 bg-sidebar-background/50">
        {!isEdit && (
          <>
            <span
              className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: $(statusMeta?.color ?? '--text-secondary', 0.12) }}
            >
              {StatusMetaIcon && (
                <StatusMetaIcon
                  className="w-4 h-4"
                  style={{ color: $(statusMeta?.color ?? '--text-secondary') }}
                />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-text-primary">New Task</h3>
              <p className="text-xs text-text-secondary mt-0.5 truncate">
                Create a task for this project
              </p>
            </div>
          </>
        )}
        {isEdit && (
          <>
            <StatusTimeline value={status} onChange={requestStatus} />
            <div className="flex-1" />
          </>
        )}
        <div className="hidden 2xl:flex items-center gap-2 text-xs shrink-0">
          {priorityMeta && (
            <span
              className="rounded-lg px-3 py-1.5 font-medium"
              style={{ color: $(priorityMeta[2]), backgroundColor: $(priorityMeta[2], 0.15) }}
            >
              {priorityMeta[1]}
            </span>
          )}
          {checklist.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-card-hover text-text-secondary font-mono">
              <ListChecks className="w-4 h-4" />
              {doneCount}/{checklist.length}
            </span>
          )}
          {attachments.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-card-hover text-text-secondary font-mono">
              <Paperclip className="w-4 h-4" />
              {attachments.length}
            </span>
          )}

        </div>
        {isEdit && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Delete task"
            className="p-1.5 rounded-lg bg-card-hover text-text-secondary outline-none hover:bg-error/15 hover:text-error transition-colors shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={handleClose}
          className="p-1.5 rounded-lg bg-card-hover text-text-secondary outline-none hover:bg-error/15 hover:text-error transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ModalBody className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] min-h-full">
          <div className="p-5 flex flex-col gap-5 min-w-0">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isEdit) handleSubmit();
              }}
              placeholder="Task title..."
              className="w-full bg-transparent text-lg font-semibold text-text-primary placeholder:text-text-secondary/50 outline-none focus:outline-none focus:ring-0"
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={4}
              className={cn(INPUT_CLASS, 'resize-none')}
            />

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DateTimeField
                  label="Start"
                  dateStr={startDateStr}
                  time={startTime}
                  open={startOpen}
                  onOpenChange={setStartOpen}
                  onDateChange={setStartDateStr}
                  onTimeChange={setStartTime}
                />
                <DateTimeField
                  label="End"
                  dateStr={endDateStr}
                  time={endTime}
                  open={endOpen}
                  onOpenChange={setEndOpen}
                  onDateChange={setEndDateStr}
                  onTimeChange={setEndTime}
                />
              </div>
              {rangeInvalid && <p className="text-xs text-error">End must be after start</p>}
            </div>

            <Section
              icon={<ListChecks className="w-3.5 h-3.5" />}
              label="Checklist"
              extra={checklist.length > 0 ? `${doneCount}/${checklist.length}` : undefined}
            >
              {checklist.length > 0 && (
                <div className="h-1 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(doneCount / checklist.length) * 100}%`,
                      backgroundColor: $('--success'),
                    }}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-card-hover"
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={item.done}
                      onClick={() =>
                        setChecklist((prev) =>
                          prev.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)),
                        )
                      }
                      className={cn(
                        'w-4 h-4 shrink-0 rounded flex items-center justify-center outline-none transition-colors cursor-pointer',
                        item.done
                          ? 'bg-primary/20 text-primary'
                          : 'bg-card-hover text-transparent hover:bg-primary/10 hover:text-primary/50',
                      )}
                    >
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </button>
                    <span
                      className={cn(
                        'flex-1 min-w-0 text-sm break-words',
                        item.done ? 'line-through text-text-secondary' : 'text-text-primary',
                      )}
                    >
                      {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => setChecklist((prev) => prev.filter((c) => c.id !== item.id))}
                      className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-error transition-opacity cursor-pointer outline-none"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={checkInput}
                  onChange={(e) => setCheckInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCheckItem();
                    }
                  }}
                  placeholder="Add an item and press Enter"
                  className={INPUT_CLASS}
                />
                <IconButton onClick={addCheckItem} title="Add item">
                  <Plus className="w-4 h-4" />
                </IconButton>
              </div>
            </Section>

            <Section
              icon={<Paperclip className="w-3.5 h-3.5" />}
              label="Attachments"
              extra={attachments.length > 0 ? String(attachments.length) : undefined}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={pickFiles}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    pickFiles();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  'relative flex flex-col items-center gap-2.5 px-4 py-7 rounded-xl text-center transition-colors cursor-pointer outline-none',
                  isDragging ? 'bg-primary/10' : 'bg-card-background/50 hover:bg-card-hover',
                )}
              >
                <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                  <rect
                    x="1"
                    y="1"
                    rx="11"
                    ry="11"
                    fill="none"
                    strokeWidth="2"
                    strokeDasharray="10 8"
                    strokeLinecap="round"
                    style={{ width: 'calc(100% - 2px)', height: 'calc(100% - 2px)' }}
                    className={cn('transition-colors', isDragging ? 'stroke-primary' : 'stroke-border')}
                  />
                </svg>
                <UploadCloud
                  className={cn('w-7 h-7', isDragging ? 'text-primary' : 'text-text-secondary')}
                />
                <span className="text-xs text-text-secondary">
                  Click to browse files, drop files or folders here, or press Ctrl+V to paste
                </span>
              </div>
              {attachments.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
                  <input
                    value={attachSearch}
                    onChange={(e) => setAttachSearch(e.target.value)}
                    placeholder="Search attachments..."
                    className={cn(INPUT_CLASS, 'pl-9')}
                  />
                </div>
              )}
              {attachments.length > 0 && visibleAttachments.length === 0 && (
                <p className="text-xs text-text-secondary text-center py-2">No attachments match</p>
              )}
              {visibleAttachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {visibleAttachments.map((a) => (
                    <div
                      key={a.path}
                      className="group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-divider bg-card-background hover:bg-card-hover transition-colors min-w-0"
                      title={a.path}
                    >
                      <span className="w-8 h-8 shrink-0 rounded-md bg-card-hover flex items-center justify-center">
                        {a.kind === 'folder' ? (
                          <Folder className="w-4 h-4 text-warn" />
                        ) : (
                          <FileText className="w-4 h-4 text-info" />
                        )}
                      </span>
                      <span className="flex flex-col min-w-0 flex-1">
                        <span className="truncate text-xs font-medium text-text-primary">
                          {baseName(a.path)}
                        </span>
                        <span className="truncate text-[10px] font-mono text-text-secondary">
                          {a.path}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((x) => x.path !== a.path))}
                        className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 bg-background/70 text-text-secondary hover:text-error transition-opacity cursor-pointer outline-none"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          <div className="p-5 flex flex-col gap-5 border-t md:border-t-0 md:border-l border-divider bg-sidebar-background/50">
            <Section label="Status" extra={statusLocked ? 'Blocked' : undefined}>
              <Select
                value={status}
                options={STATUSES}
                onChange={requestStatus}
              />
            </Section>

            <Section label="Priority">
              <div className="flex gap-1.5">
                {PRIORITIES.map(([k, l, c]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPriority(k)}
                    className={cn(
                      'flex-1 px-2 py-1.5 rounded-lg text-xs font-medium outline-none transition-colors cursor-pointer',
                      priority !== k && 'bg-card-hover text-text-secondary hover:text-text-primary',
                    )}
                    style={priority === k ? { color: $(c), backgroundColor: $(c, 0.15) } : undefined}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Section>

            <Section icon={<Tag className="w-3.5 h-3.5" />} label="Tags">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 text-xs font-medium rounded-md pl-2 pr-1 py-0.5"
                      style={{ color: $(t.color), backgroundColor: $(t.color, 0.12) }}
                    >
                      {t.label}
                      <button
                        type="button"
                        onClick={() => setTags((prev) => prev.filter((x) => x.id !== t.id))}
                        className="w-4 h-4 rounded flex items-center justify-center hover:bg-background/40 cursor-pointer outline-none"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="New tag and press Enter"
                className={INPUT_CLASS}
              />
            </Section>

            <TaskPicker
              label="Previous tasks"
              placeholder="Search to add previous task..."
              selectedIds={dependsOn}
              options={prevOptions}
              all={everyTask}
              onAdd={(id) => setDependsOn((prev) => [...prev, id])}
              onRemove={(id) => setDependsOn((prev) => prev.filter((x) => x !== id))}
              onOpen={handleSwitch}
            />

            <TaskPicker
              label="Next tasks"
              placeholder="Search to add next task..."
              selectedIds={nextIds}
              options={nextOptions}
              all={everyTask}
              onAdd={(id) => setNextIds((prev) => [...prev, id])}
              onRemove={(id) => setNextIds((prev) => prev.filter((x) => x !== id))}
              onOpen={handleSwitch}
            />
          </div>
        </div>
      </ModalBody>

      {!isEdit && (
        <div className="px-5 py-3 border-t border-divider shrink-0 flex items-center justify-end bg-sidebar-background/50">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className={cn(
              'px-4 py-2 text-xs font-medium rounded-lg outline-none',
              canSubmit ? SOFT_BUTTON : 'bg-primary/10 text-primary opacity-40 cursor-not-allowed',
            )}
          >
            Create task
          </button>
        </div>
      )}
    </Modal>
    <ConfirmForceStartTaskModal
      isOpen={pendingStatus !== null}
      taskTitle={title.trim() || 'Untitled task'}
      chain={getUnfinishedChain({ dependsOn }, everyTask)}
      onClose={() => setPendingStatus(null)}
      onConfirm={() => {
        if (pendingStatus) setStatus(pendingStatus);
        setForced(true);
      }}
    />
    </>
  );
});

TaskModal.displayName = 'TaskModal';

function Select({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const current = options.find((o) => o.value === value);
  const CurrentIcon = current?.icon;
  return (
    <Dropdown trigger="click" align="start">
      <DropdownTrigger asChild>
        <button
          type="button"
          className={cn(INPUT_CLASS, 'flex items-center justify-between gap-2 cursor-pointer text-left')}
        >
          <span className="flex items-center gap-2 min-w-0">
            {CurrentIcon && (
              <CurrentIcon
                className="w-3.5 h-3.5 shrink-0"
                style={current?.color ? { color: $(current.color) } : undefined}
              />
            )}
            <span className="truncate">{current?.label ?? placeholder ?? 'None'}</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-text-secondary" />
        </button>
      </DropdownTrigger>
      <DropdownContent className="max-h-[240px] overflow-y-auto custom-scrollbar">
        {options.map((o) => {
          const Icon = o.icon;
          return (
            <DropdownItem
              key={o.value}
              closeOnSelect
              onClick={() => onChange(o.value)}
              icon={
                Icon ? (
                  <Icon
                    className="w-3.5 h-3.5"
                    style={o.color ? { color: $(o.color) } : undefined}
                  />
                ) : undefined
              }
            >
              {o.label}
            </DropdownItem>
          );
        })}
      </DropdownContent>
    </Dropdown>
  );
}

function Section({
  icon,
  label,
  extra,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  extra?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
        {icon}
        <span>{label}</span>
        {extra && <span className="ml-auto font-mono normal-case">{extra}</span>}
      </div>
      {children}
    </div>
  );
}

function DateTimeField({
  label,
  dateStr,
  time,
  open,
  onOpenChange,
  onDateChange,
  onTimeChange,
}: {
  label: string;
  dateStr: string;
  time: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}) {
  return (
    <Section icon={<CalendarDays className="w-3.5 h-3.5" />} label={label}>
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <Dropdown
            className="block w-full"
            trigger="click"
            align="start"
            open={open}
            onOpenChange={onOpenChange}
            width={264}
          >
            <DropdownTrigger asChild>
              <button
                type="button"
                className={cn(
                  INPUT_CLASS,
                  'flex items-center justify-between gap-2 cursor-pointer text-left',
                )}
              >
                <span className={cn('truncate', !dateStr && 'text-text-secondary/50')}>
                  {dateStr ? formatDateLabel(dateStr) : 'Select date'}
                </span>
                <CalendarDays className="w-3.5 h-3.5 shrink-0 text-text-secondary" />
              </button>
            </DropdownTrigger>
            <DropdownContent>
              <Calendar
                value={dateStr}
                onChange={(v) => {
                  onDateChange(v);
                  onOpenChange(false);
                }}
              />
            </DropdownContent>
          </Dropdown>
        </div>
        <input
          type="time"
          value={time}
          disabled={!dateStr}
          onChange={(e) => onTimeChange(e.target.value)}
          className={cn(INPUT_CLASS, 'w-28 shrink-0', !dateStr && 'opacity-40 cursor-not-allowed')}
        />
        {dateStr && (
          <IconButton
            onClick={() => {
              onDateChange('');
              onTimeChange('');
            }}
            title="Clear date"
          >
            <X className="w-4 h-4" />
          </IconButton>
        )}
      </div>
    </Section>
  );
}

function StatusTimeline({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const currentIndex = STATUSES.findIndex((s) => s.value === value);
  const last = STATUSES.length - 1;
  return (
    <div className="hidden lg:flex flex-1 items-center min-w-0 max-w-2xl pr-2 overflow-hidden">
      {STATUSES.map((s, i) => {
        const Icon = s.icon;
        const color = s.color ?? '--text-secondary';
        const reached = i <= currentIndex;
        const active = i === currentIndex;
        return (
          <div key={s.value} className={cn('flex items-center', i < last && 'flex-1')}>
            <button
              type="button"
              onClick={() => onChange(s.value)}
              title={s.label}
              className="group flex items-center gap-1.5 shrink-0 outline-none cursor-pointer"
            >
              {Icon && (
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    !reached && 'text-text-secondary group-hover:text-text-primary',
                  )}
                  style={reached ? { color: $(color) } : undefined}
                />
              )}
              <span
                className={cn(
                  'text-sm font-medium whitespace-nowrap transition-colors hidden xl:inline',
                  active ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary',
                )}
              >
                {s.label}
              </span>
            </button>
            {i < last && (
              <div
                className={cn('flex-1 min-w-3 h-[3px] mx-2 xl:mx-3 rounded-full transition-colors', i >= currentIndex && 'bg-border')}
                style={
                  i < currentIndex
                    ? { backgroundColor: $(STATUSES[i + 1].color ?? '--text-secondary') }
                    : undefined
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  onOpen,
  onRemove,
}: {
  task: StoredTask;
  onOpen?: (task: StoredTask) => void;
  onRemove?: () => void;
}) {
  const st = STATUSES.find((s) => s.value === task.status);
  const StatusIcon = st?.icon;
  const prio = PRIORITIES.find(([k]) => k === task.priority);
  const range = formatTaskRange(task);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpen?.(task);
        }
      }}
      title={task.title}
      className="group relative flex flex-col gap-1.5 px-3 py-2 rounded-lg border border-divider bg-card-background hover:bg-card-hover transition-colors cursor-pointer outline-none min-w-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        {StatusIcon && (
          <StatusIcon
            className="w-3.5 h-3.5 shrink-0"
            style={st?.color ? { color: $(st.color) } : undefined}
          />
        )}
        <span
          className={cn(
            'flex-1 min-w-0 truncate text-xs font-medium',
            task.status === 'done' ? 'line-through text-text-secondary' : 'text-text-primary',
          )}
        >
          {task.title}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-error transition-opacity cursor-pointer outline-none"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-text-secondary min-w-0">
        {prio && (
          <span
            className="rounded px-1 py-px font-medium shrink-0"
            style={{ color: $(prio[2]), backgroundColor: $(prio[2], 0.12) }}
          >
            {prio[1]}
          </span>
        )}
        {range && <span className="font-mono truncate">{range}</span>}
      </div>
    </div>
  );
}

function TaskPicker({
  label,
  placeholder,
  selectedIds,
  options,
  all,
  onAdd,
  onRemove,
  onOpen,
}: {
  label: string;
  placeholder: string;
  selectedIds: string[];
  options: StoredTask[];
  all: StoredTask[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onOpen?: (task: StoredTask) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((t) => t.title.toLowerCase().includes(q)) : options;
  const selected = selectedIds
    .map((id) => all.find((x) => x.id === id))
    .filter((t): t is StoredTask => !!t);

  return (
    <Section label={label} extra={selected.length > 0 ? String(selected.length) : undefined}>
      {selected.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {selected.map((t) => (
            <TaskCard key={t.id} task={t} onOpen={onOpen} onRemove={() => onRemove(t.id)} />
          ))}
        </div>
      )}
      {selected.length === 0 && (
        <p className="text-xs text-text-secondary/70">No linked tasks</p>
      )}
      <div className="relative">
        <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setAdding(true)}
          onBlur={() => setAdding(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              e.currentTarget.blur();
            }
          }}
          placeholder={placeholder}
          className={cn(INPUT_CLASS, 'pl-9 bg-transparent border-dashed')}
        />
      </div>
      {adding && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="flex flex-col gap-1.5 max-h-56 overflow-y-auto custom-scrollbar p-1.5 rounded-lg border border-divider bg-card-background/50"
        >
          {filtered.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-2">No tasks available</p>
          ) : (
            filtered.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onOpen={() => {
                  onAdd(t.id);
                  setQuery('');
                }}
              />
            ))
          )}
        </div>
      )}
    </Section>
  );
}


function IconButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="shrink-0 w-9 h-9 rounded-lg bg-card-hover flex items-center justify-center text-text-secondary hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer outline-none"
    >
      {children}
    </button>
  );
}