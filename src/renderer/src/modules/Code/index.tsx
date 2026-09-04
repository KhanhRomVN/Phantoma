/**
 * ------------------------------------------------------------------
 * Code Module Barrel
 * ------------------------------------------------------------------
 * Re-exports the main Code component, its Zustand store hook,
 * and key types for use by other modules.
 *
 * Main exports:
 * - Code         : Main Code editor layout component
 * - useCodeStore : Zustand store hook for Code module state
 * - Project      : Project data type
 * - Service      : Service data type
 * - FileNode     : File tree node type
 * ------------------------------------------------------------------
 */

// ─── Re-exports ─────────────────────────────────────────────────────────
console.log('[Module] Code (barrel) loaded');
export { Code } from "./Code";
export { useCodeStore } from "./hooks/useCodeStore";
export type { Project, Service, FileNode } from "./hooks/useCodeStore";