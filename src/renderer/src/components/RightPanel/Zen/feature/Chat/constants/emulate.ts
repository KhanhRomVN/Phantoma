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
  },

  get_https_detail: {
    id: "get_https_detail",
    title: "HTTPS DETAIL",
    category: "tool",
    timeout: 30000,
  },

  list_hosts: {
    id: "list_hosts",
    title: "LIST HOSTS",
    category: "tool",
    timeout: 15000,
  },

  list_sources: {
    id: "list_sources",
    title: "LIST SOURCES",
    category: "tool",
    timeout: 15000,
  },

  list_resources: {
    id: "list_resources",
    title: "LIST RESOURCES",
    category: "tool",
    timeout: 15000,
  },

  get_source_detail: {
    id: "get_source_detail",
    title: "SOURCE DETAIL",
    category: "tool",
    timeout: 15000,
  },

  get_resource_content: {
    id: "get_resource_content",
    title: "RESOURCE CONTENT",
    category: "tool",
    timeout: 15000,
  },

  apply_filter: {
    id: "apply_filter",
    title: "APPLY FILTER",
    category: "tool",
    timeout: 5000,
  },

  send_to_repeater: {
    id: "send_to_repeater",
    title: "SEND TO REPEATER",
    category: "tool",
    timeout: 5000,
  },

  list_repeaters: {
    id: "list_repeaters",
    title: "LIST REPEATERS",
    category: "tool",
    timeout: 5000,
  },

  delete_repeater: {
    id: "delete_repeater",
    title: "DELETE REPEATER",
    category: "tool",
    timeout: 5000,
  },

  get_repeater_detail: {
    id: "get_repeater_detail",
    title: "GET REPEATER DETAIL",
    category: "tool",
    timeout: 5000,
  },

  update_repeater_content: {
    id: "update_repeater_content",
    title: "UPDATE REPEATER CONTENT",
    category: "tool",
    timeout: 5000,
  },

  run_repeater: {
    id: "run_repeater",
    title: "RUN REPEATER",
    category: "tool",
    timeout: 30000,
  },

  list_reports: {
    id: "list_reports",
    title: "LIST REPORTS",
    category: "tool",
    timeout: 5000,
  },

  create_report: {
    id: "create_report",
    title: "CREATE REPORT",
    category: "tool",
    timeout: 5000,
  },

  read_report: {
    id: "read_report",
    title: "READ REPORT",
    category: "tool",
    timeout: 5000,
  },

  update_report: {
    id: "update_report",
    title: "UPDATE REPORT",
    category: "tool",
    timeout: 5000,
  },

  list_report_files: {
    id: "list_report_files",
    title: "LIST REPORT FILES",
    category: "tool",
    timeout: 5000,
  },

  create_report_file: {
    id: "create_report_file",
    title: "CREATE REPORT FILE",
    category: "tool",
    timeout: 5000,
  },

  read_report_file: {
    id: "read_report_file",
    title: "READ REPORT FILE",
    category: "tool",
    timeout: 5000,
  },

  update_report_file: {
    id: "update_report_file",
    title: "UPDATE REPORT FILE",
    category: "tool",
    timeout: 5000,
  },

  delete_report_file: {
    id: "delete_report_file",
    title: "DELETE REPORT FILE",
    category: "tool",
    timeout: 5000,
  },

  execute_command: {
    id: "execute_command",
    title: "EXECUTE COMMAND",
    category: "tool",
    timeout: 30000,
  },
};