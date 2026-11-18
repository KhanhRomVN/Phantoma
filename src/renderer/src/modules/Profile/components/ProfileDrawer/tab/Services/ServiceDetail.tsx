import { useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Check, ExternalLink, Loader2, MoreHorizontal, Pencil, Plus, ShieldCheck, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import type { CustomField, FieldDef, FieldKind, ServiceLink, ServiceStatus, ServiceTemplate } from '../../../../types';
import type { Tone } from '../../../../types/ui.types';
import { SERVICE_STATUS } from '../../../../constants/status';
import { TONE_CLASS } from '../../../../constants/tone';
import { AUTH_METHODS, FIELD_KINDS, FIELD_KIND_ORDER, TWO_FACTOR } from '../../../../constants/serviceCatalog';
import { SERVICE_CATEGORIES, categoryChipStyle, categoryOfTemplate } from '../../../../constants/serviceCategory';
import { formatDateTime, timeAgo } from '../../../../utils/format';
import { hostOf, resolveKind, toCustomField, validateValue } from '../../../../utils/service';
import { ServiceIcon, ServiceStatusBadge } from '../../../common/StatusBadge';

import { CANCEL_BTN, CONFIRM_BTN, InputField, NativeSelect } from '../../../modal/FormBits';
import { FieldInput } from './FieldInput';
import { FieldView } from './FieldView';
import { TwoFactorSection } from './TwoFactorSection';
import type { TwoFactorField } from './TwoFactorSection';
import { saveOutlineClass, useSaveState } from '../../common/useSaveState';
import { SaveIndicator } from '../../common/SaveIndicator';

interface AddEditor {
  name: string;
  kind: FieldKind;
  value: string;
  fixed: boolean;
}

interface ServiceDetailProps {
  link: ServiceLink;
  template?: ServiceTemplate;
  onBack: () => void;
  onChange: (link: ServiceLink) => Promise<void>;
  onDelete: () => void;
}

const ICON_BTN =
  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary';
const BADGE =
  'inline-flex items-center gap-1.5 rounded-md bg-text-secondary/10 px-2 py-1 text-[11px] font-medium text-text-secondary';
const STATUS_ORDER = Object.keys(SERVICE_STATUS) as ServiceStatus[];
const is2fa = (kind: FieldKind): boolean => kind === 'totp' || kind === 'backup';

interface SectionCardProps {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  desc?: string;
  count?: number;
  className?: string;
  children: ReactNode;
}

function SectionCard({ icon: Icon, tone, title, desc, count, className, children }: SectionCardProps) {
  return (
    <section className={cn('flex flex-col gap-3 rounded-md bg-card-background p-3.5', className)}>
      <header className="flex items-center gap-2">
        <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', TONE_CLASS[tone].icon)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-text-primary">{title}</div>
          {desc && <div className="text-[11px] text-text-secondary">{desc}</div>}
        </div>
        {count !== undefined && <span className="text-[11px] tabular-nums text-text-secondary">{count}</span>}
      </header>
      {children}
    </section>
  );
}

export function ServiceDetail({ link: saved, template, onBack, onChange, onDelete }: ServiceDetailProps) {
  const [editor, setEditor] = useState<AddEditor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<ServiceLink>(saved);
  const saveState = useSaveState();
  const link = editMode ? draft : saved;
  const outline = saveOutlineClass(saveState.status);

  const missing = (template?.fields ?? []).filter(
    (d) => !link.customFields.some((f) => f.key.toLowerCase() === d.name.toLowerCase()),
  );

  const patchFields = (fields: CustomField[]): void => {
    if (editMode) {
      setDraft({ ...draft, customFields: fields });
      return;
    }
    void saveState.run(() => onChange({ ...saved, customFields: fields }));
  };

  const startEdit = (): void => {
    setDraft(saved);
    saveState.reset();
    setEditMode(true);
  };

  const cancelEdit = (): void => {
    closeEditor();
    saveState.reset();
    setEditMode(false);
  };

  const commitEdit = async (): Promise<void> => {
    const ok = await saveState.run(() => onChange(draft));
    if (ok) {
      closeEditor();
      setEditMode(false);
    }
  };

  const closeEditor = (): void => {
    setEditor(null);
    setError(null);
    setNameError(null);
  };

  const openAdd = (name = '', kind: FieldKind = 'text', fixed = false): void => {
    closeEditor();
    setEditor({ name, kind, value: '', fixed });
  };

  const setValue = (value: string): void => {
    setError(null);
    setEditor((e) => (e ? { ...e, value } : e));
  };

  const submit = (): void => {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) {
      setNameError('Name is required');
      return;
    }
    if (link.customFields.some((f) => f.key.toLowerCase() === name.toLowerCase())) {
      setNameError('A field with this name already exists');
      return;
    }
    const err = validateValue(editor.kind, editor.value, true);
    if (err) {
      setError(err);
      return;
    }
    patchFields([...link.customFields, toCustomField(name, editor.kind, editor.value)]);
    closeEditor();
  };

  const changeValue = (index: number, kind: FieldKind, value: string): void =>
    patchFields(link.customFields.map((f, i) => (i === index ? toCustomField(f.key, kind, value) : f)));

  const setStatus = (status: ServiceStatus): void =>
    setDraft({ ...draft, status, statusNote: status === 'active' ? undefined : draft.statusNote });

  const editorActions = (
    <div className="flex items-center justify-end gap-1.5">
      <Button className={CANCEL_BTN} onClick={closeEditor}>
        Cancel
      </Button>
      <Button className={CONFIRM_BTN} onClick={submit}>
        Save
      </Button>
    </div>
  );

  const addEditor = editor;
  const kindOf = (f: CustomField): FieldKind => resolveKind(f, template);
  const missingTwoFactor = missing.filter((d) => is2fa(d.kind));
  const missingCustom = missing.filter((d) => !is2fa(d.kind));
  const customCount = link.customFields.filter((f) => !is2fa(kindOf(f))).length;

  // ASSUMED: 2FA fields are keyed by their name; clearing a value removes the stored field
  const twoFactorFields: TwoFactorField[] = [
    ...link.customFields.filter((f) => is2fa(kindOf(f))).map((f) => ({ id: f.key, name: f.key, kind: kindOf(f) })),
    ...missingTwoFactor.map((d) => ({ id: d.name, name: d.name, kind: d.kind })),
  ];
  const twoFactorValues = Object.fromEntries(link.customFields.map((f) => [f.key, f.value]));
  const twoFactorErrors = Object.fromEntries(
    twoFactorFields.map((f) => [f.id, validateValue(f.kind, twoFactorValues[f.id] ?? '', false)]),
  );

  const setTwoFactor = (id: string, value: string): void => {
    const field = twoFactorFields.find((f) => f.id === id);
    if (!field) return;
    const exists = link.customFields.some((f) => f.key === id);
    if (!value.trim()) {
      if (exists) patchFields(link.customFields.filter((f) => f.key !== id));
      return;
    }
    patchFields(
      exists
        ? link.customFields.map((f) => (f.key === id ? toCustomField(f.key, field.kind, value) : f))
        : [...link.customFields, toCustomField(field.name, field.kind, value)],
    );
  };

  const renderField = (f: CustomField, i: number): ReactNode => {
    const kind = kindOf(f);
    const meta = FIELD_KINDS[kind];
    return (
      <div key={f.key} className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className={cn('flex h-5 w-5 items-center justify-center rounded-md', TONE_CLASS[meta.tone].icon)}>
            <meta.icon className="h-3 w-3" />
          </span>
          <span className="text-xs font-medium text-text-primary">{f.key}</span>
          <span className="text-[10px] uppercase tracking-wider text-text-secondary">{meta.label}</span>
        </div>
        <FieldInput kind={kind} value={f.value} error={validateValue(kind, f.value, false)} onChange={(v) => changeValue(i, kind, v)} />
      </div>
    );
  };

  const renderMissing = (d: FieldDef): ReactNode => {
    const meta = FIELD_KINDS[d.kind];
    if (addEditor?.fixed && addEditor.name === d.name) {
      return (
        <div key={d.id} className="flex flex-col gap-2 rounded-md border border-dashed border-primary/50 p-3">
          <span className="text-xs font-medium text-text-primary">{d.name}</span>
          <FieldInput autoFocus kind={d.kind} value={addEditor.value} error={error} onChange={setValue} onSubmit={submit} onCancel={closeEditor} />
          {editorActions}
        </div>
      );
    }
    return (
      <button
        key={d.id}
        type="button"
        onClick={() => openAdd(d.name, d.kind, true)}
        className="flex items-center gap-2.5 rounded-md border border-dashed border-text-secondary/30 px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/10"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-text-primary">{d.name}</span>
          <span className="block text-[10px] uppercase tracking-wider text-text-secondary">{meta.label} · not set</span>
        </span>
        <Plus className="h-3.5 w-3.5 text-text-secondary" />
      </button>
    );
  };

  const providers = (template?.authMethods ?? []).filter((m) => m in AUTH_METHODS);
  const twoFactorMethods = (template?.twoFactor ?? []).filter((m) => m in TWO_FACTOR);
  const category = template ? SERVICE_CATEGORIES[categoryOfTemplate(template)] : null;
  const categoryColor = template ? categoryChipStyle(categoryOfTemplate(template), false).color : undefined;

  return (
    <div aria-busy={saveState.saving} className={cn('flex flex-col gap-3', saveState.saving && 'pointer-events-none')}>
      <div className="flex items-center justify-between gap-2">
        <Tooltip content="Back to services" side="right">
          <button type="button" onClick={onBack} className={ICON_BTN}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-[11px] text-text-secondary">
            Linked {formatDateTime(link.linkedAt)} ({timeAgo(link.linkedAt)})
          </span>
          <SaveIndicator status={saveState.status} error={saveState.error} className="max-w-[180px]" />
          {editMode ? (
            <>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saveState.saving}
                className="flex h-6 shrink-0 items-center gap-1.5 rounded-md bg-text-secondary/10 px-2 text-[11px] font-medium text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void commitEdit()}
                disabled={saveState.saving}
                className="flex h-6 shrink-0 items-center gap-1.5 rounded-md bg-primary/10 px-2 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20 active:bg-primary/30 disabled:opacity-60"
              >
                {saveState.saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                {saveState.saving ? 'Saving...' : saveState.status === 'error' ? 'Retry' : 'Save'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="flex h-6 shrink-0 items-center gap-1.5 rounded-md bg-text-secondary/10 px-2 text-[11px] font-medium text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
          {template?.url && (
            <Tooltip content={`Open ${template.url}`} side="left">
              <a href={template.url} target="_blank" rel="noreferrer" className={ICON_BTN}>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Tooltip>
          )}
          <Dropdown align="end" width={190}>
            <DropdownTrigger asChild>
              <button type="button" className={ICON_BTN}>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem variant="error" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setConfirming(true)}>
                Unlink service
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      </div>

      <section className="flex flex-col gap-3 rounded-md bg-card-background p-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-text-secondary/10">
            <ServiceIcon name={link.name} url={template?.url} size={22} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-text-primary">{link.name}</span>
              <ServiceStatusBadge status={link.status} />
            </div>
            <div className="truncate text-[11px] text-text-secondary">
              {hostOf(template?.url ?? '') || 'No URL'} · {template?.fields.length ?? 0} preset fields
            </div>
          </div>
        </div>
        {template && (
          <div className="flex flex-wrap items-center gap-1.5">
            {category && (
              <span className={BADGE}>
                <category.icon className="h-3 w-3 shrink-0" style={{ color: categoryColor }} />
                {category.label}
              </span>
            )}
            {providers.length > 0 && <span className="mx-0.5 h-4 w-px bg-text-secondary/20" />}
            {providers.map((m) => (
              <span key={m} title={`Sign in with ${AUTH_METHODS[m].label}`} className={BADGE}>
                <ServiceIcon name={AUTH_METHODS[m].label} url={AUTH_METHODS[m].url} size={14} />
                {AUTH_METHODS[m].label}
              </span>
            ))}
            {twoFactorMethods.length > 0 && <span className="mx-0.5 h-4 w-px bg-text-secondary/20" />}
            {twoFactorMethods.map((m) => {
              const meta = TWO_FACTOR[m];
              return (
                <span key={m} title={`2FA: ${meta.label}`} className={BADGE}>
                  <span className={cn('flex h-4 w-4 items-center justify-center rounded', TONE_CLASS[meta.tone].icon)}>
                    <meta.icon className="h-2.5 w-2.5" />
                  </span>
                  {meta.label}
                </span>
              );
            })}
          </div>
        )}
      </section>

      {!editMode && link.statusNote && (
        <div className="rounded-md bg-warn/10 px-2.5 py-1.5 text-[11px] text-warn">{link.statusNote}</div>
      )}

      {confirming && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-error/10 px-3 py-2 text-xs text-error">
          Unlink {link.name} and delete all its stored values?
          <div className="flex gap-1.5">
            <Button className={CANCEL_BTN} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button className="rounded-md bg-error/15 text-error hover:bg-error/25 active:bg-error/30" onClick={onDelete}>
              Unlink
            </Button>
          </div>
        </div>
      )}

      {editMode && (
      <SectionCard
        icon={ShieldCheck}
        tone="success"
        title="Status"
        desc="Current state of this account on the service."
        className={outline}
      >
        <div className="flex flex-wrap gap-1.5">
          {STATUS_ORDER.map((s) => {
            const meta = SERVICE_STATUS[s];
            const on = link.status === s;
            return (
              <button
                key={s}
                type="button"
                title={meta.desc}
                onClick={() => setStatus(s)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md border border-dashed bg-text-secondary/10 px-2.5 py-1.5 text-xs font-medium transition-colors',
                  on
                    ? 'border-primary text-text-primary'
                    : 'border-transparent text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary',
                )}
              >
                <span className={cn('flex h-4 w-4 items-center justify-center rounded', TONE_CLASS[meta.tone].icon)}>
                  <meta.icon className="h-2.5 w-2.5" />
                </span>
                {meta.label}
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-text-secondary">{SERVICE_STATUS[link.status].desc}</div>
        {link.statusNote && (
          <div className="rounded-md bg-warn/10 px-2.5 py-1.5 text-[11px] text-warn">{link.statusNote}</div>
        )}
      </SectionCard>
      )}

      {twoFactorFields.length > 0 && !editMode && (
        <section className={cn('flex flex-col gap-4 rounded-md bg-card-background p-3.5', outline)}>
          {twoFactorFields.map((f) => {
            const meta = FIELD_KINDS[f.kind];
            const value = twoFactorValues[f.id] ?? '';
            const index = link.customFields.findIndex((c) => c.key === f.id);
            return (
              <div key={f.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <meta.icon className="h-3.5 w-3.5 text-text-secondary" />
                  <span className="text-xs font-medium text-text-primary">{f.name}</span>
                </div>
                {value.trim() ? (
                  <FieldView kind={f.kind} value={value} onChange={(v) => changeValue(index, f.kind, v)} />
                ) : (
                  <div className="rounded-md border border-dashed border-text-secondary/30 px-3 py-4 text-center text-xs text-text-secondary">
                    {f.kind === 'backup' ? 'No backup codes stored.' : 'No TOTP secret stored.'}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {twoFactorFields.length > 0 && editMode && (
        <TwoFactorSection
          fields={twoFactorFields}
          values={twoFactorValues}
          errors={twoFactorErrors}
          touched
          onChange={setTwoFactor}
          className={outline}
        />
      )}

      {!editMode && (
        <SectionCard
          icon={SlidersHorizontal}
          tone="muted"
          title="Custom fields"
          count={customCount}
          className={outline}
        >
          {customCount > 0 ? (
            link.customFields.map((f, i) =>
              is2fa(kindOf(f)) ? null : (
                <div key={f.key} className="flex items-start gap-3 rounded-md bg-background/40 px-3 py-2.5">
                  <span className="w-24 shrink-0 truncate pt-0.5 text-xs font-medium text-text-secondary">{f.key}</span>
                  <div className="min-w-0 flex-1">
                    <FieldView kind={kindOf(f)} value={f.value} onChange={(v) => changeValue(i, kindOf(f), v)} />
                  </div>
                </div>
              ),
            )
          ) : (
            <div className="rounded-md border border-dashed border-text-secondary/30 px-3 py-4 text-center text-xs text-text-secondary">
              No custom fields stored.
            </div>
          )}
        </SectionCard>
      )}

      {editMode && (
      <SectionCard
        icon={SlidersHorizontal}
        tone="muted"
        title="Custom fields"
        count={customCount + missingCustom.length}
        className={outline}
      >
        {link.customFields.map((f, i) => (is2fa(kindOf(f)) ? null : renderField(f, i)))}
        {missingCustom.map(renderMissing)}
        {addEditor && !addEditor.fixed ? (
          <div className="flex flex-col gap-2.5 rounded-md border border-dashed border-primary/50 p-3">
            <div className="grid grid-cols-[1fr_150px] gap-2">
              <div className="flex flex-col gap-1">
                <InputField
                  autoFocus
                  value={addEditor.name}
                  placeholder="Field name"
                  className={cn('py-1.5 text-xs', nameError && 'border-error')}
                  onChange={(e) => {
                    setNameError(null);
                    setEditor({ ...addEditor, name: e.target.value });
                  }}
                />
                {nameError && <span className="text-[11px] text-error">{nameError}</span>}
              </div>
              <NativeSelect
                value={addEditor.kind}
                className="py-1.5 text-xs"
                onChange={(e) => {
                  setError(null);
                  setEditor({ ...addEditor, kind: e.target.value as FieldKind });
                }}
              >
                {FIELD_KIND_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {FIELD_KINDS[k].label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <FieldInput kind={addEditor.kind} value={addEditor.value} error={error} onChange={setValue} onSubmit={submit} onCancel={closeEditor} />
            {editorActions}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openAdd()}
            className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-text-secondary/30 px-3 py-2.5 text-xs text-text-secondary transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Add custom field
          </button>
        )}
      </SectionCard>
      )}
    </div>
  );
}

export default ServiceDetail;