import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

import type { Profile } from '../../types';
import { TONE_CLASS } from '../../constants/tone';
import { CANCEL_BTN, CONFIRM_BTN, Field, InputField } from './FormBits';

export interface GroupDraft {
  name: string;
  purpose: string;
}

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  selectedCount: number;
  onAssign: (group: GroupDraft) => void;
  onRename: (oldName: string, group: GroupDraft) => void;
  onDelete: (name: string) => void;
}

const ICON_BTN =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary';
const SOFT_INPUT =
  'border-transparent bg-text-secondary/10 hover:bg-text-secondary/15 focus:border-transparent focus:bg-text-secondary/15';

export function GroupModal({ isOpen, onClose, profiles, selectedCount, onAssign, onRename, onDelete }: GroupModalProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [armedDelete, setArmedDelete] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [touched, setTouched] = useState(false);

  const groups = useMemo(() => {
    const info = new Map<string, { purpose: string; count: number }>();
    profiles.forEach((p) => {
      const cur = info.get(p.group);
      if (cur) cur.count += 1;
      else info.set(p.group, { purpose: p.purpose, count: 1 });
    });
    return Array.from(info, ([n, v]) => ({ name: n, ...v })).sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles]);

  const trimmed = name.trim();
  const nameError = !trimmed
    ? 'Group name is required'
    : groups.some((g) => g.name.toLowerCase() === trimmed.toLowerCase() && g.name !== editing)
      ? 'A group with this name already exists'
      : null;

  const resetForm = (): void => {
    setEditing(null);
    setName('');
    setPurpose('');
    setTouched(false);
  };

  const startEdit = (g: { name: string; purpose: string }): void => {
    setEditing(g.name);
    setName(g.name);
    setPurpose(g.purpose);
    setTouched(false);
    setArmedDelete(null);
  };

  const submitForm = (): void => {
    setTouched(true);
    if (nameError) return;
    const draft = { name: trimmed, purpose: purpose.trim() };
    if (editing) {
      onRename(editing, draft);
      if (picked === editing) setPicked(draft.name);
      resetForm();
    } else {
      onAssign(draft);
    }
  };

  const removeGroup = (g: string): void => {
    if (armedDelete !== g) {
      setArmedDelete(g);
      return;
    }
    onDelete(g);
    setArmedDelete(null);
    if (picked === g) setPicked(null);
    if (editing === g) resetForm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className='max-w-lg'>
      <ModalHeader
        title='Groups'
        description={`Choose a group for ${selectedCount} selected profile${selectedCount > 1 ? 's' : ''}, or manage groups`}
        onClose={onClose}
      />
      <ModalBody className='flex flex-col gap-4 py-4'>
        <div className='flex flex-col gap-3 rounded-lg bg-card-background p-3.5'>
          <div className='flex items-center justify-between text-xs font-semibold text-text-primary'>
            <span>{editing ? 'Edit group' : 'New group'}</span>
            {editing && (
              <button type='button' aria-label='Cancel edit' className={ICON_BTN} onClick={resetForm}>
                <X className='h-3.5 w-3.5' />
              </button>
            )}
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <Field label='Name' error={touched ? nameError : null}>
              <InputField
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitForm()}
                placeholder='e.g. Ads Team'
                className={cn(SOFT_INPUT, touched && nameError && 'bg-error/10 hover:bg-error/15 focus:bg-error/15')}
              />
            </Field>
            <Field label='Purpose' optional>
              <InputField
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitForm()}
                placeholder='What is it used for'
                className={SOFT_INPUT}
              />
            </Field>
          </div>
          <Button onClick={submitForm} className={cn(CONFIRM_BTN, 'self-end')}>
            {editing ? (
              <>
                <Check className='h-3.5 w-3.5' />
                Save group
              </>
            ) : (
              <>
                <Plus className='h-3.5 w-3.5' />
                {`Create & move ${selectedCount}`}
              </>
            )}
          </Button>
        </div>

        <div className='flex max-h-64 flex-col gap-1.5 overflow-y-auto'>
          {groups.length === 0 && <span className='px-1 text-xs text-text-secondary'>No groups yet</span>}
          {groups.map((g) => (
            <div
              key={g.name}
              onClick={() => setPicked(g.name)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors',
                picked === g.name ? 'bg-text-secondary/15' : 'bg-card-background hover:bg-text-secondary/10',
              )}
            >
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', TONE_CLASS.primary.icon)}>
                <Tag className='h-3.5 w-3.5' />
              </span>
              <div className='flex min-w-0 flex-1 flex-col'>
                <span className='truncate text-xs font-medium text-text-primary'>{g.name}</span>
                <span className='truncate text-[11px] text-text-secondary'>
                  {`${g.purpose || 'No purpose'} · ${g.count} profile${g.count > 1 ? 's' : ''}`}
                </span>
              </div>
              {picked === g.name && <Check className='h-3.5 w-3.5 shrink-0 text-text-primary' />}
              <button
                type='button'
                aria-label='Edit group'
                className={ICON_BTN}
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(g);
                }}
              >
                <Pencil className='h-3.5 w-3.5' />
              </button>
              <button
                type='button'
                aria-label='Delete group'
                title={armedDelete === g.name ? 'Click again: profiles move to Ungrouped' : 'Delete group'}
                className={cn(ICON_BTN, armedDelete === g.name && 'bg-error/15 text-error hover:bg-error/20 hover:text-error')}
                onClick={(e) => {
                  e.stopPropagation();
                  removeGroup(g.name);
                }}
              >
                <Trash2 className='h-3.5 w-3.5' />
              </button>
            </div>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose} className={CANCEL_BTN}>
          Cancel
        </Button>
        <Button
          disabled={!picked}
          onClick={() => {
            if (!picked) return;
            onAssign({ name: picked, purpose: groups.find((g) => g.name === picked)?.purpose ?? '' });
          }}
          className={CONFIRM_BTN}
        >
          {`Move ${selectedCount} to group`}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default GroupModal;