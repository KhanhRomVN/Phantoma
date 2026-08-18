/**
 * Recon Tool Constants
 * Định nghĩa các tools cho Recon module (Browser reconnaissance)
 * Bao gồm cả tool definitions và tag registry (hợp nhất từ recon-registry.ts)
 */

import type { TagDefinition } from '../types/tag-types';

export interface ReconToolDefinition {
  tag: string;
  title: string;
  description: string;
  parameters: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
}

// ── Tool Definitions ────────────────────────────────────────────────

export const LIST_TABS: ReconToolDefinition = {
  tag: 'list_tabs',
  title: 'LIST TABS',
  description: 'List all open tabs in the active browser session',
  parameters: [
    { name: 'targetId', type: 'string', required: false, description: 'Target ID (uses active target if not specified)' },
  ],
};

export const CREATE_TAB: ReconToolDefinition = {
  tag: 'create_tab',
  title: 'CREATE TAB',
  description: 'Create a new tab with optional URL',
  parameters: [
    { name: 'url', type: 'string', required: false, description: 'URL to navigate to' },
    { name: 'targetId', type: 'string', required: false, description: 'Target ID' },
  ],
};

export const CLOSE_TAB: ReconToolDefinition = {
  tag: 'close_tab',
  title: 'CLOSE TAB',
  description: 'Close a specific tab',
  parameters: [
    { name: 'tabId', type: 'string', required: true, description: 'Tab ID from list_tabs' },
    { name: 'targetId', type: 'string', required: false, description: 'Target ID' },
  ],
};

export const SWITCH_TAB: ReconToolDefinition = {
  tag: 'switch_tab',
  title: 'SWITCH TAB',
  description: 'Switch to a specific tab',
  parameters: [
    { name: 'tabId', type: 'string', required: true, description: 'Tab ID from list_tabs' },
    { name: 'targetId', type: 'string', required: false, description: 'Target ID' },
  ],
};

export const NAVIGATE: ReconToolDefinition = {
  tag: 'navigate',
  title: 'NAVIGATE',
  description: 'Navigate to a URL in the active tab',
  parameters: [
    { name: 'url', type: 'string', required: true, description: 'URL to navigate to' },
    { name: 'tabId', type: 'string', required: false, description: 'Specific tab ID' },
    { name: 'targetId', type: 'string', required: false, description: 'Target ID' },
  ],
};

export const BACK: ReconToolDefinition = {
  tag: 'back',
  title: 'BACK',
  description: 'Navigate back in the active tab',
  parameters: [
    { name: 'tabId', type: 'string', required: false, description: 'Specific tab ID' },
    { name: 'targetId', type: 'string', required: false, description: 'Target ID' },
  ],
};

export const FORWARD: ReconToolDefinition = {
  tag: 'forward',
  title: 'FORWARD',
  description: 'Navigate forward in the active tab',
  parameters: [
    { name: 'tabId', type: 'string', required: false, description: 'Specific tab ID' },
    { name: 'targetId', type: 'string', required: false, description: 'Target ID' },
  ],
};

export const RELOAD: ReconToolDefinition = {
  tag: 'reload',
  title: 'RELOAD',
  description: 'Reload the active tab',
  parameters: [
    { name: 'tabId', type: 'string', required: false, description: 'Specific tab ID' },
    { name: 'targetId', type: 'string', required: false, description: 'Target ID' },
  ],
};

export const GET_PAGE_CONTENT: ReconToolDefinition = {
  tag: 'get_page_content',
  title: 'GET PAGE CONTENT',
  description: 'Get the current page content as markdown with element references',
  parameters: [
    { name: 'tabId', type: 'string', required: false, description: 'Specific tab ID' },
    { name: 'targetId', type: 'string', required: false, description: 'Target ID' },
  ],
};

export const LIST_ELEMENTS: ReconToolDefinition = {
  tag: 'list_elements',
  title: 'LIST ELEMENTS',
  description: 'List all interactive elements on the page',
  parameters: [
    { name: 'elementType', type: 'string', required: false, description: 'Filter by type: input, button, link, select, textarea' },
    { name: 'tabId', type: 'string', required: false, description: 'Specific tab ID' },
    { name: 'targetId', type: 'string', required: false, description: 'Target ID' },
  ],
};

export const CLICK_ELEMENT: ReconToolDefinition = {
  tag: 'click_element',
  title: 'CLICK ELEMENT',
  description: 'Click an element on the page',
  parameters: [
    { name: 'ref', type: 'string', required: true, description: 'Element ref ID from get_page_content or list_elements' },
    { name: 'tabId', type: 'string', required: false, description: 'Specific tab ID' },
    { name: 'targetId', type: 'string', required: false, description: 'Target ID' },
  ],
};

export const FILL_INPUT: ReconToolDefinition = {
  tag: 'fill_input',
  title: 'FILL INPUT',
  description: 'Fill an input field with text',
  parameters: [
    { name: 'ref', type: 'string', required: true, description: 'Element ref ID' },
    { name: 'value', type: 'string', required: true, description: 'Text to fill' },
    { name: 'tabId', type: 'string', required: false, description: 'Specific tab ID' },
    { name: 'targetId', type: 'string', required: false, description: 'Target ID' },
  ],
};

export const PRESS_KEY: ReconToolDefinition = {
  tag: 'press_key',
  title: 'PRESS KEY',
  description: 'Press keyboard key(s) in the active element',
  parameters: [
    { name: 'key', type: 'string', required: true, description: 'Key name (Enter, Tab, Escape, etc.)' },
    { name: 'tabId', type: 'string', required: false, description: 'Specific tab ID' },
    { name: 'targetId', type: 'string', required: false, description: 'Target ID' },
  ],
};

export const SCROLL: ReconToolDefinition = {
  tag: 'scroll',
  title: 'SCROLL',
  description: 'Scroll the page',
  parameters: [
    { name: 'direction', type: 'string', required: true, description: 'up, down, top, bottom' },
    { name: 'amount', type: 'number', required: false, description: 'Pixels to scroll (default 500)' },
    { name: 'tabId', type: 'string', required: false, description: 'Specific tab ID' },
    { name: 'targetId', type: 'string', required: false, description: 'Target ID' },
  ],
};

// ── All tools ────────────────────────────────────────────────────────

export const RECON_TOOLS: Record<string, ReconToolDefinition> = {
  list_tabs: LIST_TABS,
  create_tab: CREATE_TAB,
  close_tab: CLOSE_TAB,
  switch_tab: SWITCH_TAB,
  navigate: NAVIGATE,
  back: BACK,
  forward: FORWARD,
  reload: RELOAD,
  get_page_content: GET_PAGE_CONTENT,
  list_elements: LIST_ELEMENTS,
  click_element: CLICK_ELEMENT,
  fill_input: FILL_INPUT,
  press_key: PRESS_KEY,
  scroll: SCROLL,
};

// ── Tag Registry (hợp nhất từ recon-registry.ts) ────────────────────

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