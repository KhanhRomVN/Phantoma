import path from 'path';
import { AppError } from '../../application/errors/app.error';
import { PathAccessPort, RootProvider, SafePathOptions } from '../../application/ports/path-access.port';

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

function isWithin(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export class ProjectPathAccessAdapter implements PathAccessPort {
  constructor(private readonly rootProvider: RootProvider) {}

  // ASSUMED: registered roots = worktree paths in DB; mkdir/list-dir skip the root check so unregistered new projects still work
  safePath(value: unknown, field: string, options: SafePathOptions = {}): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new AppError(`${field} is required`, 400);
    }
    if (value.includes('\0')) throw new AppError(`${field} contains a null byte`, 400);

    const resolved = path.resolve(value);
    const base = path.basename(resolved);

    if (!options.allowSensitive && SENSITIVE_PATTERNS.some((p) => p.test(resolved) || p.test(base))) {
      throw new AppError(`Access to sensitive file blocked: ${base}`, 403);
    }
    if (options.write && PROTECTED_DIRS.some((d) => isWithin(d, resolved))) {
      throw new AppError(`Writing to protected system directory is blocked: ${resolved}`, 403);
    }
    if (options.withinProject) {
      const inside = this.rootProvider().some((p) => isWithin(path.resolve(p), resolved));
      if (!inside) throw new AppError(`${field} is outside registered projects`, 403);
    }
    return resolved;
  }
}