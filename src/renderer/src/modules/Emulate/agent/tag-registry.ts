/**
 * Định nghĩa metadata cho các tool thuộc module Emulate.
 * Bao gồm cấu hình permission và timeout cho từng tool.
 */

import type { TagDefinition } from '@renderer/components/Widgets/Zen/screens/Chat/types/tag-types';
import { BROWSER_TOOL_NAMES } from './tools/browser/browser.parser';

const BROWSER_TOOL_TAGS: Record<string, TagDefinition> = Object.fromEntries(
  BROWSER_TOOL_NAMES.map((tool) => [
    tool,
    { id: tool, title: tool.toUpperCase().replace(/_/g, ' '), timeout: 30000 },
  ]),
);

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

  send_to_fuzzer: {
    id: 'send_to_fuzzer',
    title: 'SEND TO FUZZER',
    timeout: 5000,
  },

  list_fuzzers: {
    id: 'list_fuzzers',
    title: 'LIST FUZZERS',
    timeout: 5000,
  },

  delete_fuzzer: {
    id: 'delete_fuzzer',
    title: 'DELETE FUZZER',
    timeout: 5000,
  },

  get_fuzzer_detail: {
    id: 'get_fuzzer_detail',
    title: 'GET FUZZER DETAIL',
    timeout: 5000,
  },

  update_fuzzer_content: {
    id: 'update_fuzzer_content',
    title: 'UPDATE FUZZER CONTENT',
    timeout: 5000,
  },

  run_fuzzer: {
    id: 'run_fuzzer',
    title: 'RUN FUZZER',
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

  conversation_title: {
    id: 'conversation_title',
    title: 'TITLE',
    features: { clickable: false },
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

  send_message: {
    id: 'send_message',
    title: 'SEND MESSAGE',
    timeout: 30000,
  },

  delete_agent: {
    id: 'delete_agent',
    title: 'DELETE AGENT',
    timeout: 10000,
  },

  ...BROWSER_TOOL_TAGS,
};
