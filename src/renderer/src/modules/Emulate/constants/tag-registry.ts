/**
 * ------------------------------------------------------------------
 * Emulate Tool Tag Registry
 * ------------------------------------------------------------------
 * Định nghĩa metadata cho các tool thuộc module Emulate.
 * Bao gồm cấu hình permission và timeout cho từng tool.
 *
 * Main exports:
 * - EMULATE_TAG_REGISTRY : Registry chứa định nghĩa 18 emulate tools
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import type { TagDefinition } from '@renderer/components/Widgets/Zen/feature/Chat/types/tag-types';

// ─── Constants ──────────────────────────────────────────────────────────
export const EMULATE_TAG_REGISTRY: Record<string, TagDefinition> = {
  list_https: {
    id: 'list_https',
    title: 'LIST HTTPS',
    timeout: 30000,
  },

  get_https_detail: {
    id: 'get_https_detail',
    title: 'HTTPS DETAIL',
    timeout: 30000,
  },

  list_hosts: {
    id: 'list_hosts',
    title: 'LIST HOSTS',
    timeout: 15000,
  },

  list_sources: {
    id: 'list_sources',
    title: 'LIST SOURCES',
    timeout: 15000,
  },

  list_resources: {
    id: 'list_resources',
    title: 'LIST RESOURCES',
    timeout: 15000,
  },

  get_source_detail: {
    id: 'get_source_detail',
    title: 'SOURCE DETAIL',
    timeout: 15000,
  },

  get_resource_content: {
    id: 'get_resource_content',
    title: 'RESOURCE CONTENT',
    timeout: 15000,
  },

  apply_filter: {
    id: 'apply_filter',
    title: 'APPLY FILTER',
    timeout: 5000,
  },

  send_to_repeater: {
    id: 'send_to_repeater',
    title: 'SEND TO REPEATER',
    timeout: 5000,
  },

  list_repeaters: {
    id: 'list_repeaters',
    title: 'LIST REPEATERS',
    timeout: 5000,
  },

  delete_repeater: {
    id: 'delete_repeater',
    title: 'DELETE REPEATER',
    timeout: 5000,
  },

  get_repeater_detail: {
    id: 'get_repeater_detail',
    title: 'GET REPEATER DETAIL',
    timeout: 5000,
  },

  update_repeater_content: {
    id: 'update_repeater_content',
    title: 'UPDATE REPEATER CONTENT',
    timeout: 5000,
  },

  run_repeater: {
    id: 'run_repeater',
    title: 'RUN REPEATER',
    timeout: 30000,
  },

  list_reports: {
    id: 'list_reports',
    title: 'LIST REPORTS',
    timeout: 5000,
  },

  create_report: {
    id: 'create_report',
    title: 'CREATE REPORT',
    timeout: 5000,
  },

  read_report: {
    id: 'read_report',
    title: 'READ REPORT',
    timeout: 5000,
  },

  update_report: {
    id: 'update_report',
    title: 'UPDATE REPORT',
    timeout: 5000,
  },
};
