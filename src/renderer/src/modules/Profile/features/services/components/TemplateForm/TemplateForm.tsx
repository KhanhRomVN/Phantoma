import { useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@renderer/components/ui/Dropdown';
import type { AuthMethod, FieldDef, TwoFactorType } from '../../../../shared/types';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import {
  AUTH_METHODS,
  AUTH_ORDER,
  CUSTOM_FIELD_KIND_ORDER,
  FIELD_KINDS,
  TWO_FACTOR,
  TWO_FACTOR_ORDER,
} from '../../constants/service-catalog.constants';
import { hostOf, isValidUrl, normalizeUrl } from '../../utils/service.util';
import { ServiceIcon } from '../ServiceBadges';
import { CANCEL_BTN, CONFIRM_BTN, Field, InputField } from '../../../../shared/components/FormBits';
import { SERVICE_PRESETS } from '../../constants/service.constants';
import type { ServicePreset } from '../../constants/service.constants';
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_ORDER,
  categoryChipStyle,
  isServiceCategory,
} from '../../constants/service-category.constants';
import type { ServiceCategory } from '../../constants/service-category.constants';
import { ConfirmOverwriteModal } from '../modals/ConfirmOverwriteModal';
import { TemplateFormProps } from './template-form.types';
import { TWO_FACTOR_HINT } from './template-form.constants';
import { toggle, isTwoFactorField } from '../../utils/template-form.util';
import { Section, ProviderMark } from './TemplateFormParts';
import { PresetDropdown } from './PresetDropdown';

export function TemplateForm({ template, existingNames, onCancel, onSave, onDelete, initialPreset }: TemplateFormProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [category, setCategory] = useState<ServiceCategory | undefined>(() => {
    const c = template?.category;
    return isServiceCategory(c) ? c : undefined;
  });
  const [suggest, setSuggest] = useState<'name' | 'url' | null>(null);
  const [pending, setPending] = useState<ServicePreset | null>(null);
  const [url, setUrl] = useState(template?.url ?? '');
  const [authMethods, setAuthMethods] = useState<AuthMethod[]>(
    (template?.authMethods ?? []).filter((m) => m in AUTH_METHODS),
  );
  const [twoFactor, setTwoFactor] = useState<TwoFactorType[]>(
    (template?.twoFactor ?? []).filter((m) => m in TWO_FACTOR),
  );
  const [fields, setFields] = useState<FieldDef[]>(() => {
    const tf = (template?.twoFactor ?? []).filter((m) => m in TWO_FACTOR);
    return (template?.fields ?? []).filter((f) => !isTwoFactorField(f, tf));
  });
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const twoFactorFields = twoFactor.map((m) => TWO_FACTOR[m].field);
  const reservedNames = twoFactorFields.map((f) => f.name.toLowerCase());

  const trimmed = name.trim();
  const nameError = !trimmed
    ? 'Name is required'
    : existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())
      ? 'A service with this name already exists'
      : null;
  const urlError = isValidUrl(url) ? null : 'Invalid URL';
  const fieldNames = fields.map((f) => f.name.trim().toLowerCase());
  const fieldError = (f: FieldDef, i: number): string | null => {
    const n = f.name.trim().toLowerCase();
    if (!n) return 'Name is required';
    if (reservedNames.includes(n)) return 'Reserved by two-factor';
    return fieldNames.indexOf(n) !== i ? 'Duplicate name' : null;
  };
  const fieldsValid = fields.every((f, i) => !fieldError(f, i));
  const valid = !nameError && !urlError && fieldsValid;
  const previewUrl = url.trim() && !urlError ? normalizeUrl(url) : '';

  const takenNames = new Set(existingNames.map((n) => n.toLowerCase()));
  const suggestQuery =
    suggest === 'name' ? trimmed.toLowerCase() : suggest === 'url' ? url.trim().toLowerCase() : '';
  const suggestions =
    template || !suggestQuery
      ? []
      : SERVICE_PRESETS.filter(
          (p) =>
            !takenNames.has(p.name.toLowerCase()) &&
            (p.name.toLowerCase().includes(suggestQuery) || hostOf(p.websiteUrl).includes(suggestQuery)),
        );

  const isTwoFactorPresetField = (m: TwoFactorType, f: { name: string; kind: string }): boolean =>
    f.kind === TWO_FACTOR[m].field.kind && f.name.trim().toLowerCase() === TWO_FACTOR[m].field.name.toLowerCase();

  const applyPreset = (p: ServicePreset): void => {
    const tf = TWO_FACTOR_ORDER.filter((m) => p.customFields.some((f) => isTwoFactorPresetField(m, f)));
    setName(p.name);
    setUrl(p.websiteUrl);
    setCategory(p.category);
    setAuthMethods(p.authMethods.filter((m) => m in AUTH_METHODS));
    setTwoFactor(tf);
    setFields(
      p.customFields
        .filter((f) => !tf.some((m) => isTwoFactorPresetField(m, f)))
        .map((f) => ({ id: crypto.randomUUID(), name: f.name, kind: f.kind, required: f.required })),
    );
  };

  // ASSUMED: a preset is applied silently on a pristine form; confirm only when it would overwrite existing config
  const hasConfig = !!(url.trim() || category || authMethods.length || twoFactor.length || fields.length);
  const pickPreset = (p: ServicePreset): void => {
    setSuggest(null);
    if (hasConfig) setPending(p);
    else applyPreset(p);
  };

  // ASSUMED: opening the form from a preset card pre-fills it once on mount (new service only)
  useEffect(() => {
    if (initialPreset && !template) applyPreset(initialPreset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchField = (id: string, patch: Partial<FieldDef>): void =>
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const submit = (): void => {
    setTouched(true);
    if (!valid) return;
    // ASSUMED: two-factor value fields are appended on save (hidden from the custom field list) so linking and details keep working
    const twoFactorDefs: FieldDef[] = twoFactorFields.map((a) => ({
      id:
        template?.fields.find((f) => f.name.trim().toLowerCase() === a.name.toLowerCase())?.id ??
        crypto.randomUUID(),
      name: a.name,
      kind: a.kind,
    }));
    onSave({
      id: template?.id ?? `tpl_${crypto.randomUUID()}`,
      name: trimmed,
      url: previewUrl,
      authMethods,
      twoFactor,
      fields: [...fields.map((f) => ({ ...f, name: f.name.trim() })), ...twoFactorDefs],
      category,
      builtin: template?.builtin,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-md bg-text-secondary/10 px-2 py-1 text-[11px] text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </button>
        <span className="text-xs font-semibold text-text-primary">
          {template ? 'Edit service' : 'New service'}
        </span>
      </div>

      <Section title="Identity" hint="Name and website; the favicon is loaded from the URL.">
        <Field label="Service name" error={touched ? nameError : null}>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-text-secondary/10">
              <ServiceIcon name={trimmed} url={previewUrl} size={20} />
            </span>
            <InputField
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSuggest('name');
              }}
              placeholder="e.g. Stripe"
              className={cn('h-9 bg-background py-0', touched && nameError && 'border-error')}
            />
          </div>
          <PresetDropdown
            presets={suggest === 'name' ? suggestions : []}
            onClose={() => setSuggest(null)}
            onPick={pickPreset}
          />
        </Field>
        <Field label="Website URL" optional error={urlError} hint={previewUrl ? hostOf(previewUrl) : undefined}>
          <InputField
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setSuggest('url');
            }}
            placeholder="stripe.com"
            className={cn('h-9 bg-background py-0 font-mono text-xs', urlError && 'border-error')}
          />
          <PresetDropdown
            presets={suggest === 'url' ? suggestions : []}
            onClose={() => setSuggest(null)}
            onPick={pickPreset}
          />
        </Field>
      </Section>

      <Section title="Category" hint="Optional. Groups this service when linking it to a profile.">
        <div className="flex flex-wrap gap-1.5">
          {SERVICE_CATEGORY_ORDER.map((c) => {
            const meta = SERVICE_CATEGORIES[c];
            const on = category === c;
            return (
              <button
                key={c}
                type="button"
                title={meta.desc}
                onClick={() => setCategory(on ? undefined : c)}
                style={on ? { borderColor: categoryChipStyle(c, true).borderColor } : undefined}
                className={cn(
                  'flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-xs font-medium transition-colors',
                  'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary',
                  !on && 'border-transparent',
                )}
              >
                <meta.icon
                  className="h-3 w-3 shrink-0"
                  style={{ color: categoryChipStyle(c, false).color }}
                />
                {meta.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Sign-in providers" hint="Accounts this service lets you sign in with.">
        <div className="flex flex-wrap gap-1.5">
          {AUTH_ORDER.map((m) => {
            const meta = AUTH_METHODS[m];
            const on = authMethods.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => setAuthMethods((prev) => toggle(prev, m))}
                className={cn(
                  'flex items-center gap-2 rounded-md py-1.5 pl-2 pr-2.5 text-xs font-medium transition-colors',
                  on
                    ? 'bg-text-secondary/20 text-text-primary'
                    : 'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary',
                )}
              >
                <ProviderMark label={meta.label} url={meta.url} />
                {meta.label}
                {on && <Check className="h-3 w-3 text-success" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Two-factor data" hint="Enabled options store their value on every profile that links this service.">
        <div className="grid grid-cols-2 gap-2">
          {TWO_FACTOR_ORDER.map((m) => {
            const meta = TWO_FACTOR[m];
            const on = twoFactor.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => setTwoFactor((prev) => toggle(prev, m))}
                className={cn(
                  'flex items-start gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors',
                  on ? 'bg-text-secondary/20' : 'bg-text-secondary/10 hover:bg-text-secondary/15',
                )}
              >
                <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md', TONE_CLASS[meta.tone].icon)}>
                  <meta.icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-text-primary">{meta.label}</span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-text-secondary">{TWO_FACTOR_HINT[m]}</span>
                </span>
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                    on ? 'bg-success/20 text-success' : 'bg-text-secondary/15 text-transparent',
                  )}
                >
                  <Check className="h-2.5 w-2.5" />
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title={`Custom fields ${fields.length}`}
        hint="Extra values collected when linking this service."
        action={
          <button
            type="button"
            onClick={() => setFields((prev) => [...prev, { id: crypto.randomUUID(), name: '', kind: 'text' }])}
            className="flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Plus className="h-3 w-3" />
            Add field
          </button>
        }
      >
        {fields.length === 0 && (
          <div className="rounded-md bg-text-secondary/10 px-3 py-4 text-center text-xs text-text-secondary">
            No custom fields. Profiles can still add their own later.
          </div>
        )}

        {fields.map((f, i) => {
          const meta = FIELD_KINDS[f.kind];
          const err = touched ? fieldError(f, i) : null;
          return (
            <div key={f.id} className="flex flex-col gap-1">
              <div className="grid grid-cols-[28px_minmax(0,1fr)_140px_28px] items-center gap-2">
                <span className={cn('flex h-7 w-7 items-center justify-center rounded-md', TONE_CLASS[meta.tone].icon)}>
                  <meta.icon className="h-3.5 w-3.5" />
                </span>
                <InputField
                  value={f.name}
                  onChange={(e) => patchField(f.id, { name: e.target.value })}
                  placeholder="Field name"
                  className={cn('bg-background py-1.5 text-xs', err && 'border-error')}
                />
                <Dropdown align="end" width={160}>
                  <DropdownTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-input-border-default bg-input-background px-3 py-1.5 text-xs text-text-primary"
                    >
                      {meta.label}
                      <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
                    </button>
                  </DropdownTrigger>
                  <DropdownContent>
                    {CUSTOM_FIELD_KIND_ORDER.map((k) => {
                      const km = FIELD_KINDS[k];
                      return (
                        <DropdownItem
                          key={k}
                          icon={
                            <span className={cn('flex h-5 w-5 items-center justify-center rounded-md', TONE_CLASS[km.tone].icon)}>
                              <km.icon className="h-3 w-3" />
                            </span>
                          }
                          onClick={() => patchField(f.id, { kind: k })}
                        >
                          {km.label}
                        </DropdownItem>
                      );
                    })}
                  </DropdownContent>
                </Dropdown>
                <button
                  type="button"
                  aria-label="Remove field"
                  onClick={() => setFields((prev) => prev.filter((x) => x.id !== f.id))}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-error/15 hover:text-error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {err && <span className="pl-9 text-[11px] text-error">{err}</span>}
            </div>
          );
        })}
      </Section>

      <div className="flex items-center justify-between gap-2">
        {onDelete ? (
          confirming ? (
            <div className="flex items-center gap-1.5">
              <Button
                className="rounded-md bg-error/15 text-error hover:bg-error/25 active:bg-error/30"
                onClick={onDelete}
              >
                Confirm delete
              </Button>
              <Button className={CANCEL_BTN} onClick={() => setConfirming(false)}>
                No
              </Button>
            </div>
          ) : (
            <Button
              className="rounded-md bg-text-secondary/10 text-error hover:bg-text-secondary/15 active:bg-text-secondary/20"
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1.5">
          <Button className={CANCEL_BTN} onClick={onCancel}>
            Cancel
          </Button>
          <Button className={CONFIRM_BTN} onClick={submit}>
            {template ? 'Save changes' : 'Create service'}
          </Button>
        </div>
      </div>
      <ConfirmOverwriteModal
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending) applyPreset(pending);
          setPending(null);
        }}
        title={`Apply ${pending?.name ?? ''} template?`}
        description="Website, category, sign-in providers, two-factor and custom fields will be replaced with the template values."
      />
    </div>
  );
}

export default TemplateForm;
