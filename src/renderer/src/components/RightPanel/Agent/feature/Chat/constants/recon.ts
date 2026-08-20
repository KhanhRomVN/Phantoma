/**
 * ------------------------------------------------------------------
 * Recon Tool Tag Registry
 * ------------------------------------------------------------------
 * Định nghĩa metadata cho các tool thuộc module Recon.
 * Bao gồm cấu hình permission và timeout cho từng tool.
 *
 * Main exports:
 * - RECON_TAG_REGISTRY : Registry chứa định nghĩa 14 recon tools
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import type { TagDefinition } from '../types/tag-types';

// ─── Constants ──────────────────────────────────────────────────────────
export const RECON_TAG_REGISTRY: Record<string, TagDefinition> = {
  list_tabs: {
    id: 'list_tabs',
    title: 'LIST TABS',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  create_tab: {
    id: 'create_tab',
    title: 'CREATE TAB',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  close_tab: {
    id: 'close_tab',
    title: 'CLOSE TAB',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  switch_tab: {
    id: 'switch_tab',
    title: 'SWITCH TAB',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  navigate: {
    id: 'navigate',
    title: 'NAVIGATE',
    category: 'tool',
    timeout: 30000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  back: {
    id: 'back',
    title: 'BACK',
    category: 'tool',
    timeout: 15000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  forward: {
    id: 'forward',
    title: 'FORWARD',
    category: 'tool',
    timeout: 15000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  reload: {
    id: 'reload',
    title: 'RELOAD',
    category: 'tool',
    timeout: 15000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  get_page_content: {
    id: 'get_page_content',
    title: 'GET PAGE CONTENT',
    category: 'tool',
    timeout: 15000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  list_elements: {
    id: 'list_elements',
    title: 'LIST ELEMENTS',
    category: 'tool',
    timeout: 15000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  click_element: {
    id: 'click_element',
    title: 'CLICK ELEMENT',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  fill_input: {
    id: 'fill_input',
    title: 'FILL INPUT',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  press_key: {
    id: 'press_key',
    title: 'PRESS KEY',
    category: 'tool',
    timeout: 5000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  scroll: {
    id: 'scroll',
    title: 'SCROLL',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
};