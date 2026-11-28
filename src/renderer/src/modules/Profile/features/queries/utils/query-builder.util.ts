import type { Profile } from '../../../shared/types';
import { compileQuery } from './query.util';
import type { Condition, MatchMode, OpId, SavedQuery } from '../../../shared/types/query.types';

export type { Condition, MatchMode, OpId, QueryKind, SavedQuery } from '../../../shared/types/query.types';

export type FieldKind = 'text' | 'number' | 'boolean' | 'enum' | 'list';

export interface OpDef {
  id: OpId;
  label: string;
  needsValue: boolean;
}

export interface FieldDef {
  name: string;
  label: string;
  group: string;
  hint: string;
  kind: FieldKind;
  options?: string[];
  unit?: string;
  min?: number;
  max?: number;
  defaultOp: OpId;
  defaultValue: string;
}

export const FIELD_GROUPS = ['Account', 'Security', 'Chrome', 'Services', 'Activity'];

export const QUERY_FIELD_DEFS: FieldDef[] = [
  { name: 'email', label: 'Gmail address', group: 'Account', hint: 'The email of the profile', kind: 'text', defaultOp: 'contains', defaultValue: '' },
  { name: 'name', label: 'Display name', group: 'Account', hint: 'The name shown on the profile', kind: 'text', defaultOp: 'contains', defaultValue: '' },
  {
    name: 'status',
    label: 'Account status',
    group: 'Account',
    hint: 'Active, locked, banned...',
    kind: 'enum',
    options: ['active', 'locked', 'suspended', 'banned', 'deleted'],
    defaultOp: 'eq',
    defaultValue: 'active',
  },
  { name: 'group', label: 'Group', group: 'Account', hint: 'The work group of the profile', kind: 'text', defaultOp: 'eq', defaultValue: '' },
  { name: 'security', label: 'Security score', group: 'Security', hint: 'From 0 (weak) to 100 (strong)', kind: 'number', unit: 'points', min: 0, max: 100, defaultOp: 'lt', defaultValue: '60' },
  { name: 'totp', label: 'Two-factor (TOTP)', group: 'Security', hint: 'Whether 2FA is turned on', kind: 'boolean', defaultOp: 'eq', defaultValue: 'false' },
  { name: 'recovery', label: 'Recovery email', group: 'Security', hint: 'Backup email for account recovery', kind: 'text', defaultOp: 'empty', defaultValue: '' },
  { name: 'phone', label: 'Phone number', group: 'Security', hint: 'Phone attached to the account', kind: 'text', defaultOp: 'empty', defaultValue: '' },
  { name: 'backup_left', label: 'Backup codes left', group: 'Security', hint: 'Unused backup codes', kind: 'number', unit: 'codes', min: 0, defaultOp: 'lt', defaultValue: '3' },
  {
    name: 'sync',
    label: 'Chrome sync',
    group: 'Chrome',
    hint: 'Is the Gmail signed in to Chrome',
    kind: 'enum',
    options: ['synced', 'unsynced', 'error'],
    defaultOp: 'eq',
    defaultValue: 'unsynced',
  },
  { name: 'service', label: 'Linked services', group: 'Services', hint: 'Facebook, TikTok, Binance...', kind: 'list', defaultOp: 'eq', defaultValue: '' },
  {
    name: 'service_status',
    label: 'Service status',
    group: 'Services',
    hint: 'Status of any linked service',
    kind: 'list',
    options: ['active', 'limited', 'pending', 'suspended', 'banned', 'deleted'],
    defaultOp: 'eq',
    defaultValue: 'banned',
  },
  { name: 'idle_days', label: 'Days inactive', group: 'Activity', hint: 'Days since the last activity', kind: 'number', unit: 'days', min: 0, defaultOp: 'gt', defaultValue: '14' },
  { name: 'ip_changes', label: 'IP changes', group: 'Activity', hint: 'How many times the IP changed', kind: 'number', unit: 'changes', min: 0, defaultOp: 'gte', defaultValue: '3' },
];

export const FIELD_MAP: Record<string, FieldDef> = Object.fromEntries(QUERY_FIELD_DEFS.map((f) => [f.name, f]));

const OP = (id: OpId, label: string, needsValue = true): OpDef => ({ id, label, needsValue });

const TEXT_OPS = [
  OP('contains', 'contains'),
  OP('not_contains', `doesn't contain`),
  OP('eq', 'is exactly'),
  OP('ne', 'is not'),
  OP('empty', 'is empty', false),
  OP('not_empty', 'is filled in', false),
];
const NUMBER_OPS = [
  OP('lt', 'is less than'),
  OP('lte', 'is at most'),
  OP('eq', 'equals'),
  OP('gte', 'is at least'),
  OP('gt', 'is more than'),
  OP('ne', 'is not'),
];
const BOOL_OPS = [OP('eq', 'is')];
const ENUM_OPS = [OP('eq', 'is'), OP('ne', 'is not')];
const LIST_OPS = [
  OP('eq', 'includes'),
  OP('ne', `doesn't include`),
  OP('contains', 'includes something like'),
  OP('not_contains', 'has nothing like'),
  OP('empty', 'has none', false),
  OP('not_empty', 'has any', false),
];
const LIST_ENUM_OPS = [
  OP('eq', 'has one that is'),
  OP('ne', 'has none that are'),
  OP('empty', 'has none', false),
  OP('not_empty', 'has any', false),
];

export function opsFor(f: FieldDef): OpDef[] {
  switch (f.kind) {
    case 'text':
      return TEXT_OPS;
    case 'number':
      return NUMBER_OPS;
    case 'boolean':
      return BOOL_OPS;
    case 'enum':
      return ENUM_OPS;
    case 'list':
      return f.options ? LIST_ENUM_OPS : LIST_OPS;
  }
}

const OP_SYMBOL: Partial<Record<OpId, string>> = {
  eq: '=',
  ne: '!=',
  contains: '~',
  not_contains: '!~',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};

const SQ = String.fromCharCode(39);
const DQ = String.fromCharCode(34);

function quote(raw: string): string {
  return raw.includes(SQ) ? DQ + raw.split(DQ).join('') + DQ : SQ + raw + SQ;
}

export function conditionToText(c: Condition): string | null {
  const f = FIELD_MAP[c.field];
  if (!f) return null;
  if (c.op === 'empty') return `${f.name} IS NULL`;
  if (c.op === 'not_empty') return `${f.name} IS NOT NULL`;
  const sym = OP_SYMBOL[c.op];
  if (!sym) return null;
  const raw = c.value.trim();
  if (raw === '') return null;
  let lit: string;
  if (f.kind === 'number') {
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    lit = String(n);
  } else if (f.kind === 'boolean') {
    lit = raw === 'true' ? 'true' : 'false';
  } else {
    lit = quote(raw);
  }
  return `${f.name} ${sym} ${lit}`;
}

export function toQueryText(conds: Condition[], mode: MatchMode): string {
  return conds
    .map(conditionToText)
    .filter((t): t is string => t !== null)
    .join(mode === 'all' ? ' AND ' : ' OR ');
}

export function savedQueryText(q: SavedQuery): string {
  return q.kind === 'sql' ? (q.sql ?? '').trim() : toQueryText(q.conditions, q.mode);
}

export function countMatches(text: string, profiles: Profile[]): number {
  const c = compileQuery(text);
  return c.ok ? profiles.filter(c.match).length : 0;
}

export function describeCondition(c: Condition): string {
  const f = FIELD_MAP[c.field];
  if (!f) return '';
  const op = opsFor(f).find((o) => o.id === c.op);
  if (!op) return '';
  if (!op.needsValue) return `${f.label} ${op.label}`;
  const raw = c.value.trim();
  if (raw === '') return '';
  const value = f.kind === 'boolean' ? (raw === 'true' ? 'Yes' : 'No') : raw;
  return `${f.label} ${op.label} ${value}`;
}

export function summarizeQuery(q: SavedQuery): string {
  if (q.kind === 'sql') return (q.sql ?? '').trim().replace(/\s+/g, ' ') || 'Empty SQL query';
  const parts = q.conditions.map(describeCondition).filter((t) => t !== '');
  return parts.join(q.mode === 'all' ? ' and ' : ' or ') || 'No conditions yet';
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function makeCondition(field: string): Condition {
  const f = FIELD_MAP[field];
  return { id: newId('c'), field, op: f.defaultOp, value: f.defaultValue };
}

