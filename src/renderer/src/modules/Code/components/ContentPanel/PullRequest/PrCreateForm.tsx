/**
 * ------------------------------------------------------------------
 * PR Create Form
 * ------------------------------------------------------------------
 * Form tạo Pull Request mới từ branch hiện tại: hiển thị luồng
 * head -> base, tiêu đề, mô tả và tuỳ chọn draft.
 * ------------------------------------------------------------------
 */

import { memo } from 'react';
import { AlertTriangle, ArrowRight, GitBranch, Loader2 } from 'lucide-react';

import { cn } from '@renderer/utils/cn';
import { BTN, BTN_PRIMARY, FIELD, tint } from './utils';

export interface CreateFormState {
  title: string;
  body: string;
  draft: boolean;
}

interface PrCreateFormProps {
  currentBranch: string | null;
  baseBranch: string;
  onDefault: boolean;
  form: CreateFormState;
  busy: boolean;
  canCreate: boolean;
  onChange: (next: CreateFormState) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

const Branch = ({ name }: { name: string }) => (
  <span className={'inline-flex items-center gap-1 rounded bg-button-soft-background px-2 py-0.5 font-mono text-[11.5px] text-text-primary'}>
    <GitBranch className={'w-3 h-3 text-text-secondary'} />
    {name}
  </span>
);

export const PrCreateForm = memo(function PrCreateForm({
  currentBranch,
  baseBranch,
  onDefault,
  form,
  busy,
  canCreate,
  onChange,
  onCancel,
  onSubmit,
}: PrCreateFormProps) {
  const warn = 'rgb(var(--warn))';
  return (
    <div className={'p-6 flex flex-col gap-4 max-w-[680px]'}>
      <div>
        <h3 className={'text-[15px] font-semibold text-text-primary'}>New pull request</h3>
        <p className={'mt-1 text-[12px] text-text-secondary'}>
          The branch is pushed to origin first, then the pull request is opened.
        </p>
      </div>

      <div className={'flex items-center gap-2 rounded-lg border border-border bg-card-background px-3 py-2.5'}>
        <Branch name={currentBranch ?? '-'} />
        <ArrowRight className={'w-3.5 h-3.5 text-text-secondary/60'} />
        <Branch name={baseBranch || '-'} />
      </div>

      {onDefault && (
        <div
          style={{ background: tint(warn, 10), borderColor: tint(warn, 30) }}
          className={'flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] text-text-primary'}
        >
          <AlertTriangle className={'w-4 h-4 shrink-0 text-warn'} />
          You are on the default branch. Create and switch to a feature branch first.
        </div>
      )}

      <input
        value={form.title}
        onChange={(e) => onChange({ ...form, title: e.target.value })}
        placeholder={'Title'}
        spellCheck={false}
        className={cn(FIELD, 'h-9')}
      />
      <textarea
        value={form.body}
        onChange={(e) => onChange({ ...form, body: e.target.value })}
        placeholder={'Description'}
        rows={9}
        className={cn(FIELD, 'py-2 resize-y')}
      />
      <label className={'flex items-center gap-2 text-[12px] text-text-secondary cursor-pointer w-fit'}>
        <input
          type={'checkbox'}
          checked={form.draft}
          onChange={(e) => onChange({ ...form, draft: e.target.checked })}
        />
        Create as draft
      </label>

      <div className={'flex gap-2'}>
        <button onClick={onCancel} disabled={busy} className={BTN}>
          Cancel
        </button>
        <button onClick={onSubmit} disabled={!canCreate} className={BTN_PRIMARY}>
          {busy && <Loader2 className={'w-3.5 h-3.5 animate-spin'} />}
          Create pull request
        </button>
      </div>
    </div>
  );
});

PrCreateForm.displayName = 'PrCreateForm';