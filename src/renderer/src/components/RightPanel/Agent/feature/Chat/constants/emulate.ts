/**
 * ------------------------------------------------------------------
 * Emulate Tool Tag Registry
 * ------------------------------------------------------------------
 * Định nghĩa metadata cho các tool thuộc module Emulate.
 * Bao gồm cấu hình permission và timeout cho từng tool.
 *
 * Main exports:
 * - EMULATE_TAG_REGISTRY : Registry chứa định nghĩa 8 emulate tools
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import type { TagDefinition } from "../types/tag-types";

// ─── Constants ──────────────────────────────────────────────────────────
export const EMULATE_TAG_REGISTRY: Record<string, TagDefinition> = {
  list_https: {
    id: "list_https",
    title: "LIST HTTPS",
    category: "tool",
    timeout: 30000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
  },

  get_https_detail: {
    id: "get_https_detail",
    title: "HTTPS DETAIL",
    category: "tool",
    timeout: 30000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
  },

  list_hosts: {
    id: "list_hosts",
    title: "LIST HOSTS",
    category: "tool",
    timeout: 15000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
  },

  list_sources: {
    id: "list_sources",
    title: "LIST SOURCES",
    category: "tool",
    timeout: 15000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
  },

  list_resources: {
    id: "list_resources",
    title: "LIST RESOURCES",
    category: "tool",
    timeout: 15000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
  },

  get_source_detail: {
    id: "get_source_detail",
    title: "SOURCE DETAIL",
    category: "tool",
    timeout: 15000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
  },

  get_resource_content: {
    id: "get_resource_content",
    title: "RESOURCE CONTENT",
    category: "tool",
    timeout: 15000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
  },

  apply_filter: {
    id: "apply_filter",
    title: "APPLY FILTER",
    category: "tool",
    timeout: 5000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
  },
};