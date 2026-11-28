import type { Profile } from '../../../shared/types';
import { computeSecurity, countIpChanges } from '../../security';
import { daysSince } from '../../../shared/utils/format.util';

type Lit = string | number | boolean | null;
type Value = Lit | string[];
type Op = '=' | '!=' | '~' | '!~' | '>' | '>=' | '<' | '<=';

export interface QueryField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'list';
  hint: string;
}

export const QUERY_FIELDS: QueryField[] = [
  { name: 'email', type: 'text', hint: 'Gmail address' },
  { name: 'name', type: 'text', hint: 'Display name' },
  { name: 'status', type: 'text', hint: 'active | locked | suspended | banned | deleted' },
  { name: 'group', type: 'text', hint: 'Usage group' },
  { name: 'service', type: 'list', hint: 'Linked services' },
  { name: 'service_status', type: 'list', hint: 'Service status (banned, deleted...)' },
  { name: 'recovery', type: 'text', hint: 'Recovery email' },
  { name: 'phone', type: 'text', hint: 'Phone number' },
  { name: 'totp', type: 'boolean', hint: 'TOTP enabled' },
  { name: 'sync', type: 'text', hint: 'synced | unsynced | error' },
  { name: 'security', type: 'number', hint: 'Security score 0-100' },
  { name: 'ip_changes', type: 'number', hint: 'Number of IP changes' },
  { name: 'idle_days', type: 'number', hint: 'Days since last activity' },
  { name: 'backup_left', type: 'number', hint: 'Backup codes remaining' },
];

export const QUERY_OPERATORS = ['=', '!=', '~', '!~', '>', '>=', '<', '<=', 'IN', 'IS NULL'];



const GETTERS: Record<string, (p: Profile) => Value> = {
  email: (p) => p.email,
  name: (p) => p.displayName,
  status: (p) => p.status,
  group: (p) => p.group,
  service: (p) => p.services.map((s) => s.name),
  service_status: (p) => p.services.map((s) => s.status),
  recovery: (p) => p.recoveryEmail,
  phone: (p) => p.phone,
  totp: (p) => p.totpEnabled,
  sync: (p) => p.chromeSync,
  security: (p) => computeSecurity(p).score,
  ip_changes: (p) => countIpChanges(p),
  idle_days: (p) => daysSince(p.lastActive),
  backup_left: (p) => p.backupCodes.filter((c) => !c.used).length,
};

type Node =
  | { t: 'and' | 'or'; l: Node; r: Node }
  | { t: 'not'; e: Node }
  | { t: 'cmp'; field: string; op: Op; lit: Lit }
  | { t: 'in'; field: string; lits: Lit[] }
  | { t: 'null'; field: string; neg: boolean };

type TokKind = 'str' | 'num' | 'word' | 'op' | 'lp' | 'rp' | 'comma' | 'eof';
interface Tok {
  k: TokKind;
  v: string;
  pos: number;
}

class QueryError extends Error {
  pos: number;
  constructor(message: string, pos: number) {
    super(message);
    this.pos = pos;
  }
}

const isDigit = (c: string | undefined): boolean => c !== undefined && c >= '0' && c <= '9';
const isWordChar = (c: string): boolean => /[a-z0-9_.]/i.test(c);

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n') {
      i++;
      continue;
    }
    if (c === '(') {
      out.push({ k: 'lp', v: c, pos: i++ });
      continue;
    }
    if (c === ')') {
      out.push({ k: 'rp', v: c, pos: i++ });
      continue;
    }
    if (c === ',') {
      out.push({ k: 'comma', v: c, pos: i++ });
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== c) s += src[j++];
      if (j >= src.length) throw new QueryError('Unterminated string', i);
      out.push({ k: 'str', v: s, pos: i });
      i = j + 1;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['>=', '<=', '!=', '!~', '=='].includes(two)) {
      out.push({ k: 'op', v: two, pos: i });
      i += 2;
      continue;
    }
    if ('=<>~'.includes(c)) {
      out.push({ k: 'op', v: c, pos: i++ });
      continue;
    }
    if (isDigit(c) || (c === '-' && isDigit(src[i + 1]))) {
      let j = i + 1;
      while (j < src.length && (isDigit(src[j]) || src[j] === '.')) j++;
      out.push({ k: 'num', v: src.slice(i, j), pos: i });
      i = j;
      continue;
    }
    if (isWordChar(c)) {
      let j = i;
      while (j < src.length && isWordChar(src[j])) j++;
      out.push({ k: 'word', v: src.slice(i, j), pos: i });
      i = j;
      continue;
    }
    throw new QueryError(`Invalid character: ${c}`, i);
  }
  out.push({ k: 'eof', v: '', pos: src.length });
  return out;
}

function parse(tokens: Tok[]): Node {
  let i = 0;
  const peek = (): Tok => tokens[i];
  const next = (): Tok => tokens[Math.min(i++, tokens.length - 1)];
  const isWord = (t: Tok, w: string): boolean => t.k === 'word' && t.v.toLowerCase() === w;

  function literal(): Lit {
    const t = next();
    if (t.k === 'str') return t.v;
    if (t.k === 'num') return Number(t.v);
    if (t.k === 'word') {
      const w = t.v.toLowerCase();
      if (w === 'true') return true;
      if (w === 'false') return false;
      if (w === 'null') return null;
      return t.v;
    }
    throw new QueryError('Expected a value', t.pos);
  }

  function primary(): Node {
    const t = next();
    if (t.k === 'lp') {
      const inner = parseOr();
      const close = next();
      if (close.k !== 'rp') throw new QueryError('Missing closing parenthesis', close.pos);
      return inner;
    }
    if (t.k !== 'word') throw new QueryError('Expected a field name', t.pos);
    const field = t.v.toLowerCase();
    if (!GETTERS[field]) throw new QueryError(`Unknown field: ${t.v}`, t.pos);
    const o = next();
    if (isWord(o, 'is')) {
      let neg = false;
      if (isWord(peek(), 'not')) {
        next();
        neg = true;
      }
      const n = next();
      if (!isWord(n, 'null')) throw new QueryError('Expected NULL after IS', n.pos);
      return { t: 'null', field, neg };
    }
    if (isWord(o, 'in')) {
      const open = next();
      if (open.k !== 'lp') throw new QueryError('Expected ( after IN', open.pos);
      const lits: Lit[] = [];
      for (;;) {
        lits.push(literal());
        const sep = next();
        if (sep.k === 'rp') break;
        if (sep.k !== 'comma') throw new QueryError('Expected , or )', sep.pos);
      }
      return { t: 'in', field, lits };
    }
    if (o.k !== 'op') throw new QueryError('Expected operator (=, !=, ~, >, <, IN, IS NULL)', o.pos);
    const op = (o.v === '==' ? '=' : o.v) as Op;
    return { t: 'cmp', field, op, lit: literal() };
  }

  function parseNot(): Node {
    if (isWord(peek(), 'not')) {
      next();
      return { t: 'not', e: parseNot() };
    }
    return primary();
  }

  function parseAnd(): Node {
    let left = parseNot();
    while (isWord(peek(), 'and')) {
      next();
      left = { t: 'and', l: left, r: parseNot() };
    }
    return left;
  }

  function parseOr(): Node {
    let left = parseAnd();
    while (isWord(peek(), 'or')) {
      next();
      left = { t: 'or', l: left, r: parseAnd() };
    }
    return left;
  }

  const root = parseOr();
  const rest = peek();
  if (rest.k !== 'eof') throw new QueryError('Unexpected expression or missing AND / OR', rest.pos);
  return root;
}

function test(v: Value, op: Op, lit: Lit): boolean {
  const needle = String(lit).toLowerCase();
  if (Array.isArray(v)) {
    switch (op) {
      case '=':
        return v.some((x) => x.toLowerCase() === needle);
      case '!=':
        return !v.some((x) => x.toLowerCase() === needle);
      case '~':
        return v.some((x) => x.toLowerCase().includes(needle));
      case '!~':
        return !v.some((x) => x.toLowerCase().includes(needle));
      default:
        return false;
    }
  }
  if (v === null) return op === '!=' || op === '!~';
  if (typeof v === 'number') {
    const n = Number(lit);
    if (Number.isNaN(n)) return false;
    switch (op) {
      case '=':
        return v === n;
      case '!=':
        return v !== n;
      case '>':
        return v > n;
      case '>=':
        return v >= n;
      case '<':
        return v < n;
      case '<=':
        return v <= n;
      default:
        return false;
    }
  }
  if (typeof v === 'boolean') {
    const b = lit === true || needle === 'true';
    if (op === '=') return v === b;
    if (op === '!=') return v !== b;
    return false;
  }
  const s = v.toLowerCase();
  switch (op) {
    case '=':
      return s === needle;
    case '!=':
      return s !== needle;
    case '~':
      return s.includes(needle);
    case '!~':
      return !s.includes(needle);
    case '>':
      return s > needle;
    case '>=':
      return s >= needle;
    case '<':
      return s < needle;
    case '<=':
      return s <= needle;
  }
}

function evalNode(n: Node, p: Profile): boolean {
  switch (n.t) {
    case 'and':
      return evalNode(n.l, p) && evalNode(n.r, p);
    case 'or':
      return evalNode(n.l, p) || evalNode(n.r, p);
    case 'not':
      return !evalNode(n.e, p);
    case 'null': {
      const v = GETTERS[n.field](p);
      const isNull = v === null || (Array.isArray(v) && v.length === 0);
      return n.neg ? !isNull : isNull;
    }
    case 'in':
      return n.lits.some((l) => test(GETTERS[n.field](p), '=', l));
    case 'cmp':
      return test(GETTERS[n.field](p), n.op, n.lit);
  }
}

export type CompiledQuery =
  | { ok: true; match: (p: Profile) => boolean }
  | { ok: false; error: string; pos: number };

export function compileQuery(src: string): CompiledQuery {
  if (!src.trim()) return { ok: true, match: () => true };
  try {
    const ast = parse(tokenize(src));
    return { ok: true, match: (p) => evalNode(ast, p) };
  } catch (e) {
    if (e instanceof QueryError) return { ok: false, error: e.message, pos: e.pos };
    return { ok: false, error: 'Invalid query', pos: 0 };
  }
}