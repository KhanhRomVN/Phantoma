export function getStatusColor(status: number): string {
  if (!status || status === 0) return 'text-red-400';
  if (status < 300) return 'text-emerald-400';
  if (status < 400) return 'text-blue-400';
  if (status < 500) return 'text-amber-400';
  return 'text-red-400';
}

export function getStatusBgColor(status: number): string {
  if (!status || status === 0) return 'bg-red-500/10';
  if (status < 300) return 'bg-emerald-500/10';
  if (status < 400) return 'bg-blue-500/10';
  if (status < 500) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

export function getMethodColor(method: string): string {
  const m = method.toUpperCase();
  if (m === 'GET') return 'text-blue-400';
  if (m === 'POST') return 'text-green-400';
  if (m === 'PUT') return 'text-orange-400';
  if (m === 'DELETE') return 'text-red-400';
  if (m === 'PATCH') return 'text-purple-400';
  return 'text-gray-400';
}

export function getMethodBgColor(method: string): string {
  const m = method.toUpperCase();
  if (m === 'GET') return 'bg-blue-500/10';
  if (m === 'POST') return 'bg-green-500/10';
  if (m === 'PUT') return 'bg-orange-500/10';
  if (m === 'DELETE') return 'bg-red-500/10';
  if (m === 'PATCH') return 'bg-purple-500/10';
  return 'bg-gray-500/10';
}

export function getLogLevelColor(level: string): string {
  switch (level) {
    case 'E': case 'F': return 'text-red-400';
    case 'W': return 'text-amber-400';
    case 'I': return 'text-cyan-400';
    case 'D': return 'text-slate-400';
    case 'V': return 'text-zinc-500';
    default: return 'text-foreground';
  }
}

export function getLogLevelBgColor(level: string): string {
  switch (level) {
    case 'E': case 'F': return 'bg-red-500/5';
    case 'W': return 'bg-amber-500/5';
    case 'I': return 'bg-cyan-500/5';
    case 'D': return 'bg-slate-500/5';
    case 'V': return 'bg-zinc-500/5';
    default: return 'bg-muted/10';
  }
}

export function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash % 360)}, 70%, 60%)`;
}

export function getPlatformColor(platform: string): string {
  switch (platform) {
    case 'web': return 'text-sky-400';
    case 'pc': return 'text-violet-400';
    case 'android': return 'text-emerald-400';
    case 'cli': return 'text-amber-400';
    default: return 'text-gray-400';
  }
}

export function getPlatformBgColor(platform: string): string {
  switch (platform) {
    case 'web': return 'bg-sky-500/15';
    case 'pc': return 'bg-violet-500/15';
    case 'android': return 'bg-emerald-500/15';
    case 'cli': return 'bg-amber-500/15';
    default: return 'bg-gray-500/15';
  }
}