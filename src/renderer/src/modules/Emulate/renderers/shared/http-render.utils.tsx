import { cn } from '@renderer/utils/cn';

export function tryFormatJson(text: string): string {
  try {
    const parsed = JSON.parse(text.trim());
    return JSON.stringify(parsed, null, 2);
  } catch {
    return text.trim();
  }
}

export function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'text-success',
    POST: 'text-warn',
    PUT: 'text-primary',
    PATCH: 'text-primary',
    DELETE: 'text-error',
    OPTIONS: 'text-text-secondary',
    HEAD: 'text-text-secondary',
  };
  return (
    <span
      className={cn(
        'text-[11px] font-bold font-mono',
        colors[method.toUpperCase()] || 'text-text-primary',
      )}
    >
      {method.toUpperCase()}
    </span>
  );
}