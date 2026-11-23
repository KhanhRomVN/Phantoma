import path from 'path';
import { AppError } from './envelope';

export const param = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : (v ?? ''));

export function found<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new AppError(`${what} not found`, 404);
  return value;
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(`${field} is required`, 400);
  }
  return value;
}

const SENSITIVE_PATTERNS = [
  /\.env$/,
  /\.env\..+$/,
  /credentials\.json$/,
  /credentials\.yaml$/,
  /\.pem$/,
  /\.key$/,
  /id_rsa$/,
  /id_ed25519$/,
  /\.ssh\/config$/,
  /\.netrc$/,
  /\.pgpass$/,
  /\.aws\/credentials$/,
  /\.docker\/config\.json$/,
  /secrets\.yaml$/,
  /secrets\.json$/,
];

const PROTECTED_DIRS = ['/etc', '/usr', '/sbin', '/boot', '/sys', '/proc'];

export interface SafePathOptions {
  write?: boolean;
  withinProject?: boolean;
  allowSensitive?: boolean;
}

export type RootProvider = () => string[];

let rootProvider: RootProvider = () => [];

export function registerRootProvider(provider: RootProvider): void {
  rootProvider = provider;
}

function isWithin(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

// ASSUMED: registered roots = worktree paths in DB; mkdir/list-dir skip the root check so unregistered new projects still work
export function safePath(value: unknown, field: string, options: SafePathOptions = {}): string {
  const raw = requireString(value, field);
  if (raw.includes('\0')) throw new AppError(`${field} contains a null byte`, 400);

  const resolved = path.resolve(raw);
  const base = path.basename(resolved);

  if (!options.allowSensitive && SENSITIVE_PATTERNS.some((p) => p.test(resolved) || p.test(base))) {
    throw new AppError(`Access to sensitive file blocked: ${base}`, 403);
  }
  if (options.write && PROTECTED_DIRS.some((d) => isWithin(d, resolved))) {
    throw new AppError(`Writing to protected system directory is blocked: ${resolved}`, 403);
  }
  if (options.withinProject) {
    const inside = rootProvider().some((p) => isWithin(path.resolve(p), resolved));
    if (!inside) throw new AppError(`${field} is outside registered projects`, 403);
  }
  return resolved;
}