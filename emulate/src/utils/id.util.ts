export function generateID(): string {
  return Date.now().toString(16) + Math.random().toString(16).slice(2);
}

export function isSafeId(id: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(id);
}