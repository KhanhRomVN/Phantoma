/**
 * ------------------------------------------------------------------
 * Module Prompt Context Service
 * ------------------------------------------------------------------
 * Resolve context do Zen module (Emulate) cung cấp cho prompt tại thời điểm gọi,
 * không capture service ở module scope để tôn trọng registration runtime.
 * Thiếu module/service → trả undefined cho phần context tương ứng.
 *
 * Main exports:
 * - buildEmulatePromptContext() : Traffic + filter context cho feature emulate
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { getModuleService } from '../registries/module.registry';

// ─── Types ──────────────────────────────────────────────────────────────
export interface EmulatePromptContext {
  trafficContext?: string;
  filterContext?: string;
}

// ─── Functions ──────────────────────────────────────────────────────────
const emulateService = (name: string): any => getModuleService('emulate', name);

const buildTrafficContextSafe = (): string | undefined => {
  try {
    const summary = emulateService('getTrafficSummary')();
    const isEmpty =
      summary.hosts.length === 0 &&
      summary.methods.length === 0 &&
      summary.statuses.length === 0 &&
      summary.types.length === 0;

    return isEmpty
      ? emulateService('buildEmptyTrafficContext')()
      : emulateService('buildTrafficContext')(summary);
  } catch {
    return undefined;
  }
};

const buildFilterContextSafe = (): string | undefined => {
  try {
    const filter = emulateService('getCurrentFilter')();
    return filter
      ? emulateService('buildFilterContext')(emulateService('getFilterText')())
      : emulateService('buildEmptyFilterContext')();
  } catch {
    return undefined;
  }
};

export const buildEmulatePromptContext = (): EmulatePromptContext => ({
  trafficContext: buildTrafficContextSafe(),
  filterContext: buildFilterContextSafe(),
});