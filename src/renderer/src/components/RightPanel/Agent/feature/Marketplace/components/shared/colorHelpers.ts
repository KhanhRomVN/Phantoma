import { isReservedGroupName } from '../../hooks/useSkillWorkspaceState';

export const GROUP_ACCENT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1',
];

const OTHERS_COLOR = '#9ca3af';

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function resolveGroupColor(group: { name: string; color?: string }): string {
  if (group.color) return group.color;
  if (isReservedGroupName(group.name)) return OTHERS_COLOR;
  return GROUP_ACCENT_COLORS[hashString(group.name) % GROUP_ACCENT_COLORS.length];
}