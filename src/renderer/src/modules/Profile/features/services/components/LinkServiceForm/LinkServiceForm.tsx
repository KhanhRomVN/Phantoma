import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Filter,
  Layers,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import type { CustomField, ServiceStatus, ServiceTemplate } from '../../../../shared/types';
import { SERVICE_STATUS } from '../../constants/service-status.constants';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import { AUTH_METHODS, FIELD_KINDS, TWO_FACTOR } from '../../constants/service-catalog.constants';
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_ORDER,
  categoryOf,
  categoryOfName,
  categoryOfTemplate,
} from '../../constants/service-category.constants';
import type { ServiceCategory } from '../../constants/service-category.constants';
import { SERVICE_PRESETS } from '../../constants/service.constants';
import type { ServicePreset } from '../../constants/service.constants';
import { hostOf, toCustomField, validateValue } from '../../utils/service.util';
import { ServiceIcon } from '../ServiceBadges';
import { CANCEL_BTN, CONFIRM_BTN } from '../../../../shared/components/FormBits';
import { FieldInput } from '../FieldInput';
import { TotpCard, BackupCodesCard, parseBackup, serializeBackup } from '../../../security';
import { ConfirmOverwriteModal } from '../modals/ConfirmOverwriteModal';
import { LinkServiceFormProps } from './link-service-form.types';
import {
  STATUS_ORDER,
  BADGE,
  STATUS_BORDER,
  PRIMARY_BTN,
  SOFT_BTN,
  CATEGORY_LABEL,
} from './link-service-form.constants';
import { toggleIn } from '../../utils/link-service-form.util';
import { SectionHeader, CategoryBadge } from './LinkServiceFormParts';

export function LinkServiceForm({
  templates,
  links,
  initialTemplateId,
  onCancel,
  onNewTemplate,
  onCreate,
  onPickPreset,
  onEditTemplate,
}: LinkServiceFormProps) {
  const [templateId, setTemplateId] = useState<string | null>(initialTemplateId);

  const [status, setStatus] = useState<ServiceStatus>('active');
  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Set<ServiceCategory>>(new Set());

  const baseTemplate = templates.find((t) => t.id === templateId) ?? null;
  // ASSUMED: enabled 2FA types add their value field (TOTP secret / backup codes) at link time, independent of template fields
  const template: ServiceTemplate | null = baseTemplate && {
    ...baseTemplate,
    fields: [
      ...baseTemplate.fields,
      ...baseTemplate.twoFactor
        .filter((m) => m in TWO_FACTOR)
        .map((m) => ({ id: `2fa_${m}`, name: TWO_FACTOR[m].field.name, kind: TWO_FACTOR[m].field.kind }))
        .filter((a) => !baseTemplate.fields.some((f) => f.name.toLowerCase() === a.name.toLowerCase())),
    ],
  };

  const fieldErrors = Object.fromEntries(
    (template?.fields ?? []).map((f) => [f.id, validateValue(f.kind, values[f.id] ?? '', f.required)]),
  );
  const valid = !!template && Object.values(fieldErrors).every((e) => !e);
  const providers = (template?.authMethods ?? []).filter((m) => m in AUTH_METHODS);
  const twoFactorMethods = (template?.twoFactor ?? []).filter((m) => m in TWO_FACTOR);
  // ASSUMED: fields of kind totp/backup belong to the 2FA section; everything else stays in Custom fields
  const twoFactorFields = (template?.fields ?? []).filter((f) => f.kind === 'totp' || f.kind === 'backup');
  const customFields = (template?.fields ?? []).filter((f) => f.kind !== 'totp' && f.kind !== 'backup');

  // ASSUMED: a category already present on the profile is hidden (except 'other'); services already linked are hidden too
  const takenCategories = useMemo(() => {
    const set = new Set(links.map((l) => categoryOf(l)));
    set.delete('other');
    return set;
  }, [links]);
  const linkedNames = useMemo(() => new Set(links.map((l) => l.name.toLowerCase())), [links]);
  const availableCategories = SERVICE_CATEGORY_ORDER.filter((c) => !takenCategories.has(c));

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = templates.filter((t) => {
      const cat = categoryOfName(t.name);
      if (takenCategories.has(cat) || linkedNames.has(t.name.toLowerCase())) return false;
      if (categoryFilter.size > 0 && !categoryFilter.has(cat)) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || hostOf(t.url).includes(q);
    });
    const templateNames = new Set(templates.map((t) => t.name.toLowerCase()));
    const presets = SERVICE_PRESETS.filter((p) => {
      const cat = p.category ?? categoryOfName(p.name);
      const key = p.name.toLowerCase();
      if (takenCategories.has(cat) || templateNames.has(key) || linkedNames.has(key)) return false;
      if (categoryFilter.size > 0 && !categoryFilter.has(cat)) return false;
      if (!q) return true;
      return key.includes(q) || hostOf(p.websiteUrl).includes(q);
    });
    // ASSUMED: while searching/filtering, matching presets are listed in full; otherwise presets top the list up to 20 cards (4 per category max, categories with real cards first, a category is skipped if it cannot reach 2 cards); above 20 real cards only the empty cell of an odd row is filled
    const searching = !!q || categoryFilter.size > 0;
    const itemsOf = (c: ServiceCategory): ServiceTemplate[] => visible.filter((t) => categoryOfName(t.name) === c);
    const poolOf = (c: ServiceCategory): ServicePreset[] =>
      presets.filter((p) => (p.category ?? categoryOfName(p.name)) === c);
    const picked = new Map<ServiceCategory, ServicePreset[]>();
    if (searching) {
      availableCategories.forEach((c) => picked.set(c, poolOf(c).slice(0, 60)));
    } else {
      let need = Math.max(0, 20 - visible.length);
      const priority = [...availableCategories].sort((a, b) => Number(itemsOf(b).length > 0) - Number(itemsOf(a).length > 0));
      for (const c of priority) {
        const own = itemsOf(c).length;
        const pool = poolOf(c);
        let take = 0;
        if (visible.length > 20) take = Math.min(own % 2 === 1 ? 1 : 0, pool.length);
        else if (need > 0) {
          take = Math.min(Math.max(0, 4 - own), need, pool.length);
          if (own + take < 2) take = 0;
        }
        need -= take;
        picked.set(c, pool.slice(0, take));
      }
    }
    return availableCategories
      .map((c) => ({ category: c, items: itemsOf(c), presets: picked.get(c) ?? [] }))
      .filter((g) => g.items.length > 0 || g.presets.length > 0)
      .sort((a, b) => Number(b.items.length > 0) - Number(a.items.length > 0));
  }, [templates, takenCategories, linkedNames, categoryFilter, query, availableCategories]);

  const submit = (): void => {
    setTouched(true);
    if (!template || !valid) return;
    const customFields: CustomField[] = template.fields
      .filter((f) => (values[f.id] ?? '').trim())
      .map((f) => toCustomField(f.name, f.kind, values[f.id]));
    onCreate({
      id: crypto.randomUUID(),
      name: template.name,

      status,
      linkedAt: new Date().toISOString(),
      customFields,
      templateId: template.id,
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={template && !initialTemplateId ? () => setTemplateId(null) : onCancel}
          className="flex items-center gap-1.5 rounded-md bg-text-secondary/10 px-2 py-1 text-[11px] text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </button>
      </div>

      {!template ? (
        <>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services..."
                className="w-full rounded-lg border border-transparent bg-input-background py-1.5 pl-9 pr-8 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/60"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-text-secondary hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Dropdown align="end" width={200} closeOnSelect={false}>
              <DropdownTrigger asChild>
                <Button className={cn(categoryFilter.size > 0 ? PRIMARY_BTN : SOFT_BTN, 'relative h-8 w-8 p-0')}>
                  <Filter className="h-3.5 w-3.5" />
                  {categoryFilter.size > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-medium tabular-nums text-white">
                      {categoryFilter.size}
                    </span>
                  )}
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                <div className={cn(CATEGORY_LABEL, 'px-3 pb-1 pt-2')}>Category</div>
                {availableCategories.map((c) => {
                  const meta = SERVICE_CATEGORIES[c];
                  const on = categoryFilter.has(c);
                  return (
                    <DropdownItem
                      key={c}
                      icon={
                        <span className={cn('flex h-5 w-5 items-center justify-center rounded-md', TONE_CLASS[meta.tone].icon)}>
                          {on ? <Check className="h-3 w-3" /> : <meta.icon className="h-3 w-3" />}
                        </span>
                      }
                      onClick={() => setCategoryFilter((prev) => toggleIn(prev, c))}
                    >
                      {meta.label}
                    </DropdownItem>
                  );
                })}
                {categoryFilter.size > 0 && (
                  <>
                    <DropdownSeparator />
                    <DropdownItem icon={<X className="h-3.5 w-3.5" />} onClick={() => setCategoryFilter(new Set())}>
                      Clear filters
                    </DropdownItem>
                  </>
                )}
              </DropdownContent>
            </Dropdown>
            <Button
              aria-label="New service"
              title="New service"
              className={cn(PRIMARY_BTN, 'h-8 w-8 p-0')}
              onClick={onNewTemplate}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {groups.map((g) => (
            <div key={g.category} className="flex flex-col gap-2">
              <div className={CATEGORY_LABEL}>{SERVICE_CATEGORIES[g.category].label}</div>
              <div className="grid grid-cols-2 gap-2">
                {g.items.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className="flex items-center gap-2.5 rounded-md bg-card-background px-3 py-2.5 text-left transition-colors hover:bg-text-secondary/10"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-text-secondary/10">
                      <ServiceIcon name={t.name} url={t.url} size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-text-primary">{t.name}</span>
                      <span className="block truncate text-[10px] text-text-secondary">
                        {hostOf(t.url) || `${t.fields.length} fields`}
                      </span>
                    </span>
                  </button>
                ))}
                {g.presets.map((p) => (
                  <button
                    key={`preset-${p.name}`}
                    type="button"
                    onClick={() => onPickPreset(p)}
                    className="flex items-center gap-2.5 rounded-md bg-card-background px-3 py-2.5 text-left opacity-50 transition-all hover:bg-text-secondary/10 hover:opacity-100"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-text-secondary/10">
                      <ServiceIcon name={p.name} url={p.websiteUrl} size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-text-primary">{p.name}</span>
                      <span className="block truncate text-[10px] text-text-secondary">
                        {hostOf(p.websiteUrl) || `${p.customFields.length} fields`}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-text-secondary/10 text-text-secondary">
                {query.trim() ? <Search className="h-6 w-6" /> : <Layers className="h-6 w-6" />}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-text-primary">
                  {query.trim() ? 'No results' : 'No service available to link.'}
                </span>
                <span className="text-xs text-text-secondary">
                  {query.trim() ? `No service matches "${query}".` : 'There is nothing left to link to this profile.'}
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-md bg-card-background p-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-text-secondary/10">
                <ServiceIcon name={template.name} url={template.url} size={22} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-text-primary">{template.name}</div>
                <div className="truncate text-[11px] text-text-secondary">
                  {hostOf(template.url) || 'No URL'} · {template.fields.length} preset fields
                </div>
              </div>
              <button
                type="button"
                title="Edit service"
                onClick={() => (Object.values(values).some((v) => v.trim()) ? setConfirmEdit(true) : onEditTemplate(template.id))}
                className="ml-auto flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-text-secondary/10 px-2 text-[11px] font-medium text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <CategoryBadge category={categoryOfTemplate(template)} />
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
          </section>

          <section className="flex flex-col gap-3 rounded-md bg-card-background p-3.5">
            <SectionHeader
              icon={ShieldCheck}
              tone="success"
              title="Status"
            />
            <div className="flex flex-wrap gap-1.5">
              {STATUS_ORDER.map((s) => {
                const meta = SERVICE_STATUS[s];
                const on = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    title={meta.desc}
                    onClick={() => setStatus(s)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border border-dashed bg-text-secondary/10 px-2.5 py-1.5 text-xs font-medium transition-colors',
                      on
                        ? cn(STATUS_BORDER[meta.tone] ?? 'border-primary', 'text-text-primary')
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
          </section>

          {twoFactorFields.length > 0 && (
            <div className="flex flex-col gap-3">
              {twoFactorFields.map((f) => {
                const setValue = (v: string): void => setValues((prev) => ({ ...prev, [f.id]: v }));
                const error = touched ? fieldErrors[f.id] : null;
                return (
                  <div key={f.id} className="flex flex-col gap-1.5">
                    {f.kind === 'totp' ? (
                      <TotpCard
                        secret={(values[f.id] ?? '').trim() ? values[f.id] : null}
                        onSave={(s) => setValue(s ?? '')}
                      />
                    ) : (
                      <BackupCodesCard
                        codes={parseBackup(values[f.id] ?? '')}
                        onChange={(next) => setValue(serializeBackup(next))}
                      />
                    )}
                    {error && <div className="text-[11px] text-error">{error}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {customFields.length > 0 ? (
            <section className="flex flex-col gap-3 rounded-md bg-card-background p-3.5">
              <SectionHeader
                icon={SlidersHorizontal}
                tone="primary"
                title="Custom fields"
                action={<span className="text-[11px] tabular-nums text-text-secondary">{customFields.length}</span>}
              />
              {customFields.map((f) => {
                const meta = FIELD_KINDS[f.kind];
                return (
                  <div key={f.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn('flex h-5 w-5 items-center justify-center rounded-md', TONE_CLASS[meta.tone].icon)}>
                        <meta.icon className="h-3 w-3" />
                      </span>
                      <span className="text-xs font-medium text-text-primary">{f.name}</span>
                      <span className="text-[10px] uppercase tracking-wider text-text-secondary">{meta.label}</span>
                      {(values[f.id] ?? '').trim() && !fieldErrors[f.id] && (
                        <Check className="ml-auto h-3 w-3 text-success" />
                      )}
                    </div>
                    <FieldInput
                      kind={f.kind}
                      value={values[f.id] ?? ''}
                      error={touched ? fieldErrors[f.id] : null}
                      onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
                    />
                  </div>
                );
              })}
            </section>
          ) : (
            <section className="flex flex-col gap-3 rounded-md bg-card-background p-3.5">
              <SectionHeader
                icon={SlidersHorizontal}
                tone="primary"
                title="Custom fields"
                action={<span className="text-[11px] tabular-nums text-text-secondary">0</span>}
              />
              <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-text-secondary/20 py-5 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-text-secondary/10 text-text-secondary">
                  <Layers className="h-4 w-4" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-text-primary">No custom fields</span>
                  <span className="text-[11px] text-text-secondary">This service has no extra values to fill in.</span>
                </div>
              </div>
            </section>
          )}

          <div className="flex items-center justify-end gap-1.5">
            <Button className={CANCEL_BTN} onClick={onCancel}>
              Cancel
            </Button>
            <Button className={CONFIRM_BTN} onClick={submit}>
              Link service
            </Button>
          </div>
        </>
      )}

      <ConfirmOverwriteModal
        isOpen={confirmEdit}
        title="Discard entered values?"
        description="The values you typed for this service will be lost when you switch to editing the service."
        confirmLabel="Discard & edit"
        onClose={() => setConfirmEdit(false)}
        onConfirm={() => {
          setConfirmEdit(false);
          if (template) onEditTemplate(template.id);
        }}
      />
    </div>
  );
}

export default LinkServiceForm;
