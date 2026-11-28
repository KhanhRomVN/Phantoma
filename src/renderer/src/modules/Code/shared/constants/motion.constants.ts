/**
 * ------------------------------------------------------------------
 * Motion Constants
 * ------------------------------------------------------------------
 * Bộ hằng số và variants framer-motion dùng chung cho animation của
 * Code module (easing, duration, spring, tween, các variants phổ biến).
 *
 * Main constants:
 * - EASE_OUT / EASE_IN_OUT : Đường cong easing
 * - DURATION / SPRING / TWEEN : Thời lượng và transition chuẩn
 * - fade, slideUp, slideDown, scaleIn, panelSwap, collapse : Variants cơ bản
 * - listContainer / listItem : Variants cho danh sách có stagger
 * - toastMotion : Variants cho toast
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── UI ──
import type { Transition, Variants } from 'framer-motion';

// ─── Constants ───────────────────────────────────────────────────────────────
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.4, 0, 0.2, 1] as const;

export const DURATION = {
  instant: 0.1,
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
} as const;

export const SPRING = {
  panel: { type: 'spring', stiffness: 420, damping: 38, mass: 0.8 } as Transition,
  soft: { type: 'spring', stiffness: 320, damping: 32, mass: 0.9 } as Transition,
  snappy: { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 } as Transition,
};

export const TWEEN = {
  fast: { duration: DURATION.fast, ease: EASE_OUT } as Transition,
  base: { duration: DURATION.base, ease: EASE_OUT } as Transition,
  slow: { duration: DURATION.slow, ease: EASE_OUT } as Transition,
  none: { duration: 0 } as Transition,
};

export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: TWEEN.fast },
  exit: { opacity: 0, transition: { duration: DURATION.instant } },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: TWEEN.base },
  exit: { opacity: 0, y: 6, transition: { duration: DURATION.fast } },
};

export const slideDown: Variants = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0, transition: TWEEN.base },
  exit: { opacity: 0, y: -4, transition: { duration: DURATION.fast } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: TWEEN.base },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: DURATION.fast } },
};

export const panelSwap: Variants = {
  initial: { opacity: 0, x: 6 },
  animate: { opacity: 1, x: 0, transition: TWEEN.fast },
  exit: { opacity: 0, x: -6, transition: { duration: DURATION.instant } },
};

export const collapse: Variants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto', transition: TWEEN.base },
  exit: { opacity: 0, height: 0, transition: { duration: DURATION.fast } },
};

export const listContainer: Variants = {
  animate: { transition: { staggerChildren: 0.025, delayChildren: 0.02 } },
};

export const listItem: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: TWEEN.fast },
  exit: { opacity: 0, transition: { duration: DURATION.instant } },
};

export const toastMotion: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: SPRING.soft },
  exit: { opacity: 0, x: -24, scale: 0.96, transition: { duration: DURATION.base, ease: EASE_IN_OUT } },
};