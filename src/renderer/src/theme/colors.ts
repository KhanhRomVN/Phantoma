/**
 * Application-wide color palette for UI elements that need random/no-rule color mapping
 * These colors are theme-agnostic and do NOT change when switching themes
 * Used for badges, icons, and other UI elements that require consistent colors across themes
 */
export const UI_COLORS = {
  red: 'rgb(239, 68, 68)',
  pink: 'rgb(236, 72, 153)',
  aqua: 'rgb(0, 200, 220)',
  navy: 'rgb(30, 58, 138)',
  coral: 'rgb(251, 146, 60)',
  teal: 'rgb(20, 184, 166)',
  mustard: 'rgb(202, 180, 44)',
  blueViolet: 'rgb(139, 92, 246)',
  indigo: 'rgb(79, 70, 229)',
  peach: 'rgb(251, 191, 146)',
  grey: 'rgb(148, 163, 184)',
  blue: 'rgb(59, 130, 246)',
  orange: 'rgb(249, 115, 22)',
  green: 'rgb(34, 197, 94)',
  yellow: 'rgb(234, 179, 8)',
  gray: 'rgb(148, 163, 184)',
} as const;

export type UIColorKey = keyof typeof UI_COLORS;
export type UIColorValue = (typeof UI_COLORS)[UIColorKey];