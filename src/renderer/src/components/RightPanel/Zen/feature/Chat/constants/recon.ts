/**
 * ------------------------------------------------------------------
 * Recon Tool Tag Registry
 * ------------------------------------------------------------------
 * Định nghĩa metadata cho các tool thuộc module Recon.
 * Bao gồm cấu hình permission và timeout cho từng tool.
 *
 * Main exports:
 * - RECON_TAG_REGISTRY : Registry chứa định nghĩa 15 recon tools
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
  capture_screenshot: {
    id: 'capture_screenshot',
    title: 'CAPTURE SCREENSHOT',
    category: 'tool',
    timeout: 30000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  select_option: {
    id: 'select_option',
    title: 'SELECT OPTION',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  wait_for: {
    id: 'wait_for',
    title: 'WAIT FOR',
    category: 'tool',
    timeout: 15000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  scroll_to_element: {
    id: 'scroll_to_element',
    title: 'SCROLL TO ELEMENT',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  list_frames: {
    id: 'list_frames',
    title: 'LIST FRAMES',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  hover: {
    id: 'hover',
    title: 'HOVER',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  clear_input: {
    id: 'clear_input',
    title: 'CLEAR INPUT',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  upload_file: {
    id: 'upload_file',
    title: 'UPLOAD FILE',
    category: 'tool',
    timeout: 15000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  evaluate_js: {
    id: 'evaluate_js',
    title: 'EVALUATE JS',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
};