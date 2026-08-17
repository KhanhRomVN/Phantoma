/**
 * ------------------------------------------------------------------
 * Todo Panel
 * ------------------------------------------------------------------
 * Task management panel with kanban-style workflow.
 * Workflow: Pending → In Progress → Review → Completed
 *
 * Main features:
 * - Create/Edit/Delete tasks
 * - Status management (drag or click to move)
 * - Priority levels (low, medium, high, urgent)
 * - Task filtering and search
 * - Review workflow (approve/reject)
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useMemo } from 'react';

// ── UI ──
import {
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Edit2,
  Trash2,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react';

// ── Hooks ──
import { useCodeStore } from '../../../hooks/useCodeStore';

// ── Types ──
import type { Task, TaskStatus, TaskPriority } from '../../../types/task';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ─── Constants ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; icon: typeof Clock; color: string; bgColor: string }
> = {
  pending: {
    label: 'Chờ làm',
    icon: Clock,
    color: 'text-text-secondary',
    bgColor: 'bg-text-secondary/10',
  },
  in_progress: {
    label: 'Đang làm',
    icon: AlertCircle,
    color: 'text-blue',
    bgColor: 'bg-blue/10',
  },
  review: {
    label: 'Đang duyệt',
    icon: CheckCircle2,
    color: 'text-yellow',
    bgColor: 'bg-yellow/10',
  },
  completed: {
    label: 'Hoàn thành',
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Thấp', color: 'text-text-secondary' },
  medium: { label: 'Trung bình', color: 'text-blue' },
  high: { label: 'Cao', color: 'text-yellow' },
  urgent: { label: 'Khẩn cấp', color: 'text-error' },
};

// ─── Component ──────────────────────────────────────────────────────────

export function TodoPanel() {
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const tasks = useCodeStore((s) => {
    const project = s.projects.find((p) => p.id === currentProjectId);
    return project?.tasks ?? [];
  });

  const addTask = useCodeStore((s) => s.addTask);
  const updateTask = useCodeStore((s) => s.updateTask);
  const removeTask = useCodeStore((s) => s.removeTask);
  const changeTaskStatus = useCodeStore((s) => s.changeTaskStatus);

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
  }>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // ── Filtered tasks ──
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, filterStatus]);

  // ── Group by status ──
  const tasksByStatus = useMemo(() => {
    return {
      pending: filteredTasks.filter((t) => t.status === 'pending'),
      in_progress: filteredTasks.filter((t) => t.status === 'in_progress'),
      review: filteredTasks.filter((t) => t.status === 'review'),
      completed: filteredTasks.filter((t) => t.status === 'completed'),
    };
  }, [filteredTasks]);

  // ── Handlers ──

  const handleCreate = () => {
    setIsCreating(true);
    setFormData({ title: '', description: '', priority: 'medium', status: 'pending' });
  };

  const handleSave = () => {
    if (!currentProjectId) return;

    if (editingId) {
      updateTask(currentProjectId, editingId, formData);
      setEditingId(null);
    } else {
      addTask(currentProjectId, formData);
      setIsCreating(false);
    }

    setFormData({ title: '', description: '', priority: 'medium', status: 'pending' });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ title: '', description: '', priority: 'medium', status: 'pending' });
  };

  const handleEdit = (task: Task) => {
    setEditingId(task.id);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
    });
  };

  const handleDelete = (taskId: string) => {
    if (!currentProjectId) return;
    if (confirm('Bạn có chắc muốn xóa task này?')) {
      removeTask(currentProjectId, taskId);
    }
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    if (!currentProjectId) return;
    changeTaskStatus(currentProjectId, taskId, newStatus);
  };

  const handleReview = (task: Task) => {
    setReviewingTask(task);
    setReviewNotes('');
  };

  const handleApprove = () => {
    if (!currentProjectId || !reviewingTask) return;
    updateTask(currentProjectId, reviewingTask.id, {
      reviewNotes,
    });
    changeTaskStatus(currentProjectId, reviewingTask.id, 'completed');
    setReviewingTask(null);
    setReviewNotes('');
  };

  const handleReject = () => {
    if (!currentProjectId || !reviewingTask) return;
    updateTask(currentProjectId, reviewingTask.id, {
      reviewNotes,
    });
    changeTaskStatus(currentProjectId, reviewingTask.id, 'in_progress');
    setReviewingTask(null);
    setReviewNotes('');
  };

  // ── Render Form ──

  if (isCreating || editingId) {
    return (
      <div className="flex-1 flex flex-col bg-sidebar-background p-4 gap-4 overflow-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">
            {editingId ? 'Sửa Task' : 'Tạo Task Mới'}
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Tiêu đề</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary"
              placeholder="Tên task"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary min-h-[80px]"
              placeholder="Mô tả chi tiết"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Độ ưu tiên</label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value as TaskPriority })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary"
            >
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {editingId && (
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Trạng thái</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as TaskStatus })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary"
              >
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-auto pt-4">
          <button
            onClick={handleSave}
            disabled={!formData.title.trim()}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {editingId ? 'Cập nhật' : 'Tạo'}
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-sidebar-item-hover text-text-secondary rounded text-sm hover:bg-sidebar-item-hover/80 transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>
    );
  }

  // ── Render Review Modal ──

  if (reviewingTask) {
    return (
      <div className="flex-1 flex flex-col bg-sidebar-background p-4 gap-4 overflow-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">Duyệt Task</h3>
        </div>

        <div className="flex flex-col gap-3">
          <div className="p-3 bg-background border border-border rounded">
            <h4 className="text-sm font-medium text-text-primary mb-2">
              {reviewingTask.title}
            </h4>
            {reviewingTask.description && (
              <p className="text-xs text-text-secondary">{reviewingTask.description}</p>
            )}
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Nhận xét</label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary min-h-[100px]"
              placeholder="Nhập nhận xét về task..."
            />
          </div>
        </div>

        <div className="flex gap-2 mt-auto pt-4">
          <button
            onClick={handleApprove}
            className="flex-1 px-4 py-2 bg-success text-white rounded text-sm font-medium hover:bg-success/90 transition-colors"
          >
            ✓ Duyệt
          </button>
          <button
            onClick={handleReject}
            className="flex-1 px-4 py-2 bg-error text-white rounded text-sm font-medium hover:bg-error/90 transition-colors"
          >
            ✗ Không duyệt
          </button>
          <button
            onClick={() => setReviewingTask(null)}
            className="px-4 py-2 bg-sidebar-item-hover text-text-secondary rounded text-sm hover:bg-sidebar-item-hover/80 transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>
    );
  }

  // ── Render List ──

  return (
    <div className="flex-1 flex flex-col bg-sidebar-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-medium text-text-primary">Tasks</h3>
        <button
          onClick={handleCreate}
          className="p-1.5 rounded hover:bg-sidebar-item-hover text-text-secondary hover:text-primary transition-colors"
          title="Tạo task mới"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Filter */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm tasks..."
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary"
        >
          <option value="all">Tất cả ({tasks.length})</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label} ({tasksByStatus[key as TaskStatus].length})
            </option>
          ))}
        </select>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto p-3">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary/40 gap-3">
            <CheckCircle2 className="w-8 h-8" strokeWidth={1} />
            <div className="text-sm">
              {searchQuery || filterStatus !== 'all' ? 'Không tìm thấy task' : 'Chưa có task nào'}
            </div>
            {!searchQuery && filterStatus === 'all' && (
              <button onClick={handleCreate} className="text-xs text-primary hover:underline">
                Tạo task đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={() => handleEdit(task)}
                onDelete={() => handleDelete(task.id)}
                onStatusChange={(status) => handleStatusChange(task.id, status)}
                onReview={() => handleReview(task)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Task Card ──────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onReview: () => void;
}

function TaskCard({ task, onEdit, onDelete, onStatusChange, onReview }: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const statusConfig = STATUS_CONFIG[task.status];
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const StatusIcon = statusConfig.icon;

  const getNextStatus = (): TaskStatus | null => {
    switch (task.status) {
      case 'pending':
        return 'in_progress';
      case 'in_progress':
        return 'review';
      case 'review':
        return null; // Cần review thủ công
      case 'completed':
        return null;
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus();

  return (
    <div
      className={cn(
        'group relative border border-border rounded-lg p-3 bg-background hover:border-primary/50 transition-colors',
        statusConfig.bgColor,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-text-primary line-clamp-2">{task.title}</h4>
        </div>

        {/* Actions */}
        {isHovered && (
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-1 rounded hover:bg-sidebar-item-hover text-text-secondary hover:text-primary transition-colors"
              title="Sửa"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-sidebar-item-hover text-text-secondary hover:text-error transition-colors"
              title="Xóa"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-text-secondary/70 line-clamp-2 mb-2">{task.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Status */}
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs',
              statusConfig.color,
              statusConfig.bgColor,
            )}
          >
            <StatusIcon className="w-3 h-3" />
            <span>{statusConfig.label}</span>
          </div>

          {/* Priority */}
          <div className={cn('text-xs', priorityConfig.color)}>●</div>
        </div>

        {/* Next action */}
        {task.status === 'review' ? (
          <button
            onClick={onReview}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Duyệt
            <ChevronRight className="w-3 h-3" />
          </button>
        ) : nextStatus ? (
          <button
            onClick={() => onStatusChange(nextStatus)}
            className="text-xs text-text-secondary hover:text-primary flex items-center gap-1"
          >
            {STATUS_CONFIG[nextStatus].label}
            <ChevronRight className="w-3 h-3" />
          </button>
        ) : null}
      </div>

      {/* Review notes */}
      {task.reviewNotes && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs text-text-secondary italic">&quot;{task.reviewNotes}&quot;</p>
        </div>
      )}
    </div>
  );
}
