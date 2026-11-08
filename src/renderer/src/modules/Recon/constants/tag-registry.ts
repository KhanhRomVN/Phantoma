/**
 * ------------------------------------------------------------------
 * Recon Tool Tag Registry
 * ------------------------------------------------------------------
 * Định nghĩa metadata cho các tool thuộc module Recon.
 * Bao gồm cấu hình permission và timeout cho từng tool.
 *
 * Main exports:
 * - RECON_TAG_REGISTRY : Registry chứa định nghĩa 23 recon tools
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import type { TagDefinition } from '@renderer/components/Widgets/Zen/feature/Chat/types/tag-types';

// ─── Constants ──────────────────────────────────────────────────────────
export const RECON_TAG_REGISTRY: Record<string, TagDefinition> = {
  list_tabs: {
    id: 'list_tabs',
    title: 'LIST TABS',
    timeout: 10000,
  },
  create_tab: {
    id: 'create_tab',
    title: 'CREATE TAB',
    timeout: 10000,
  },
  close_tab: {
    id: 'close_tab',
    title: 'CLOSE TAB',
    timeout: 10000,
  },
  switch_tab: {
    id: 'switch_tab',
    title: 'SWITCH TAB',
    timeout: 10000,
  },
  navigate: {
    id: 'navigate',
    title: 'NAVIGATE',
    timeout: 30000,
  },
  back: {
    id: 'back',
    title: 'BACK',
    timeout: 15000,
  },
  forward: {
    id: 'forward',
    title: 'FORWARD',
    timeout: 15000,
  },
  reload: {
    id: 'reload',
    title: 'RELOAD',
    timeout: 15000,
  },
  get_page_content: {
    id: 'get_page_content',
    title: 'GET PAGE CONTENT',
    timeout: 15000,
  },
  list_elements: {
    id: 'list_elements',
    title: 'LIST ELEMENTS',
    timeout: 15000,
  },
  click_element: {
    id: 'click_element',
    title: 'CLICK ELEMENT',
    timeout: 10000,
  },
  fill_input: {
    id: 'fill_input',
    title: 'FILL INPUT',
    timeout: 10000,
  },
  press_key: {
    id: 'press_key',
    title: 'PRESS KEY',
    timeout: 5000,
  },
  scroll: {
    id: 'scroll',
    title: 'SCROLL',
    timeout: 10000,
  },
  capture_screenshot: {
    id: 'capture_screenshot',
    title: 'CAPTURE SCREENSHOT',
    timeout: 30000,
  },
  select_option: {
    id: 'select_option',
    title: 'SELECT OPTION',
    timeout: 10000,
  },
  wait_for: {
    id: 'wait_for',
    title: 'WAIT FOR',
    timeout: 15000,
  },
  scroll_to_element: {
    id: 'scroll_to_element',
    title: 'SCROLL TO ELEMENT',
    timeout: 10000,
  },
  list_frames: {
    id: 'list_frames',
    title: 'LIST FRAMES',
    timeout: 10000,
  },
  hover: {
    id: 'hover',
    title: 'HOVER',
    timeout: 10000,
  },
  clear_input: {
    id: 'clear_input',
    title: 'CLEAR INPUT',
    timeout: 10000,
  },
  upload_file: {
    id: 'upload_file',
    title: 'UPLOAD FILE',
    timeout: 15000,
  },
  evaluate_js: {
    id: 'evaluate_js',
    title: 'EVALUATE JS',
    timeout: 10000,
  },

  // ── Multi-agent ──
  conversation_title: {
    id: 'conversation_title',
    title: 'CONVERSATION TITLE',
    timeout: 5000,
  },
  list_agents: {
    id: 'list_agents',
    title: 'LIST AGENTS',
    timeout: 10000,
  },
  create_agent: {
    id: 'create_agent',
    title: 'CREATE AGENT',
    timeout: 30000,
  },
  delete_agent: {
    id: 'delete_agent',
    title: 'DELETE AGENT',
    timeout: 15000,
  },
  send_message: {
    id: 'send_message',
    title: 'SEND MESSAGE',
    timeout: 15000,
  },

  // ── Recon workspace file tools ──
  read_file: {
    id: 'read_file',
    title: 'READ CC',
    timeout: 15000,
  },
  create_file: {
    id: 'create_file',
    title: 'CREATE',
    timeout: 15000,
  },
  update_file: {
    id: 'update_file',
    title: 'UPDATE',
    timeout: 15000,
  },
  list_files: {
    id: 'list_files',
    title: 'LIST',
    timeout: 15000,
  },
  delete_file: {
    id: 'delete_file',
    title: 'DELETE',
    timeout: 15000,
  },

  // ── Terminal (shared run_command executor) ──
  run_command: {
    id: 'run_command',
    title: 'RUN COMMAND',
    timeout: 300000,
  },
};
