import { ArrowDown, CheckCheck, Lock, type LucideIcon } from 'lucide-react';
import { $ } from '@renderer/utils/color';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import type { StoredTask } from '../../../services/task.service';
import { STATUS_META } from './kanban/KanbanTaskCard';

interface ConfirmForceStartTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskTitle: string;
  chain: StoredTask[];
}

const tiersOf = (chain: StoredTask[]): StoredTask[][] => {
  const ids = new Set(chain.map((t) => t.id));
  const depth = new Map<string, number>();
  const tiers: StoredTask[][] = [];
  chain.forEach((t) => {
    const parents = (t.dependsOn ?? []).filter((id) => ids.has(id));
    const d = Math.max(-1, ...parents.map((id) => depth.get(id) ?? 0)) + 1;
    depth.set(t.id, d);
    (tiers[d] ??= []).push(t);
  });
  return tiers.filter(Boolean);
};

function FlowNode({ title, color, icon: Icon }: { title: string; color: string; icon: LucideIcon }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 max-w-[180px] px-2.5 py-1.5 rounded-lg border text-[11px] font-medium text-text-primary"
      style={{ borderColor: $(color, 0.35), backgroundColor: $(color, 0.08) }}
    >
      <Icon className="w-3 h-3 shrink-0" style={{ color: $(color) }} />
      <span className="truncate">{title}</span>
    </span>
  );
}

export function ConfirmForceStartTaskModal({
  isOpen,
  onClose,
  onConfirm,
  taskTitle,
  chain,
}: ConfirmForceStartTaskModalProps) {
  const warn = '--warn';
  const tiers = tiersOf(chain);
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[440px]">
      <ModalBody className="py-6 px-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div
            className="w-11 h-11 rounded-xl border grid place-items-center shrink-0"
            style={{
              color: $(warn),
              backgroundColor: $(warn, 0.1),
              borderColor: $(warn, 0.2),
            }}
          >
            <Lock className="w-5 h-5" strokeWidth={1.8} />
          </div>

          <h3 className="text-base font-semibold text-text-primary leading-snug">
            Task is blocked
          </h3>

          <p className="text-xs text-text-secondary leading-relaxed max-w-[320px]">
            <b className="font-medium text-text-primary">{taskTitle}</b> depends on {chain.length}{' '}
            unfinished {chain.length === 1 ? 'task' : 'tasks'}. Continue anyway and they will all be
            marked as Done.
          </p>

          <div className="w-full flex flex-col items-center gap-1.5 mt-1 py-3 px-3 rounded-xl border border-divider bg-sidebar-background/50">
            {tiers.map((tier, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="flex flex-wrap justify-center gap-1.5">
                  {tier.map((t) => {
                    const meta = STATUS_META[t.status];
                    return (
                      <FlowNode key={t.id} title={t.title} color={meta.color} icon={meta.icon} />
                    );
                  })}
                </div>
                <ArrowDown className="w-3.5 h-3.5 text-text-secondary" />
              </div>
            ))}
            <FlowNode title={taskTitle} color={warn} icon={Lock} />
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="gap-0 p-0 border-t border-divider">
        <button
          onClick={onClose}
          className="flex-1 h-[42px] text-xs font-medium text-text-secondary hover:bg-white/[0.03] hover:text-text-primary transition-colors border-r border-divider"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="flex-1 h-[42px] text-xs font-semibold hover:bg-white/[0.03] transition-colors flex items-center justify-center gap-1.5"
          style={{ color: $(warn) }}
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Complete previous & continue
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmForceStartTaskModal;