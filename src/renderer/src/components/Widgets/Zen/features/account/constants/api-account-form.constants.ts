import {
  Eye,
  Server,
  ShieldCheck,
  Boxes,
  Gauge,
  ArrowLeftRight,
  Network,
  StickyNote,
  Zap,
  Wrench,
  Braces,
  Brain,
  Bot,
  Sparkles,
  Gem,
  Cloud,
  Cpu,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FieldDef, Preset, SectionId, SectionMeta, Values } from '../types/api-account.types';

export const SECTIONS: Record<SectionId, SectionMeta> = {
  provider: {
    name: 'Provider',
    shortDesc: 'Where requests are sent',
    icon: Server,
    color: '#3b82f6',
  },
  credentials: {
    name: 'Credentials',
    shortDesc: 'API key and how to authenticate',
    icon: ShieldCheck,
    color: '#f59e0b',
  },
  models: {
    name: 'Models',
    shortDesc: 'Available models and capabilities',
    icon: Boxes,
    color: '#8b5cf6',
  },
  quota: {
    name: 'Quota & expiry',
    shortDesc: 'Limits, balance and pricing',
    icon: Gauge,
    color: '#10b981',
  },
  format: {
    name: 'Request & response',
    shortDesc: 'Custom body and response mapping',
    icon: ArrowLeftRight,
    color: '#ec4899',
  },
  network: {
    name: 'Network',
    shortDesc: 'Timeout, retries and proxy',
    icon: Network,
    color: '#06b6d4',
  },
  notes: { name: 'Notes', shortDesc: 'Tags and description', icon: StickyNote, color: '#94a3b8' },
};

export const CORE_IDS: SectionId[] = ['provider', 'credentials', 'models'];
export const OPTIONAL_IDS: SectionId[] = ['quota', 'format', 'network', 'notes'];

export const API_TYPES = [
  'OpenAI-compatible',
  'Anthropic',
  'Google Gemini',
  'Azure OpenAI',
  'AWS Bedrock',
  'Ollama / local',
  'Custom',
];

export const TYPE_ICONS: Record<string, LucideIcon> = {
  'OpenAI-compatible': Bot,
  Anthropic: Sparkles,
  'Google Gemini': Gem,
  'Azure OpenAI': Cloud,
  'AWS Bedrock': Server,
  'Ollama / local': Cpu,
  Custom: Settings,
};

export const TYPE_DEFAULTS: Record<string, Values> = {
  'OpenAI-compatible': { endpoint_path: '/chat/completions' },
  Anthropic: { endpoint_path: '/messages', api_version: '2023-06-01' },
  'Google Gemini': { api_version: 'v1beta' },
  'Azure OpenAI': { endpoint_path: '/chat/completions', api_version: '2024-02-01' },
  'Ollama / local': { endpoint_path: '/api/chat' },
};

// Các field khác nhau giữa các account: không tự điền từ provider đã lưu
export const SENSITIVE_KEYS = [
  'label',
  'api_key',
  'org_id',
  'project_id',
  'secret',
  'balance',
  'expires_at',
];

export const PRESETS: Preset[] = [
  {
    name: 'OpenAI',
    type: 'OpenAI-compatible',
    url: 'https://api.openai.com/v1',
    website: 'https://platform.openai.com',
  },
  {
    name: 'DeepSeek',
    type: 'OpenAI-compatible',
    url: 'https://api.deepseek.com/v1',
    website: 'https://platform.deepseek.com',
  },
  {
    name: 'OpenRouter',
    type: 'OpenAI-compatible',
    url: 'https://openrouter.ai/api/v1',
    website: 'https://openrouter.ai',
  },
  {
    name: 'Anthropic',
    type: 'Anthropic',
    url: 'https://api.anthropic.com/v1',
    website: 'https://console.anthropic.com',
  },
  {
    name: 'Google Gemini',
    type: 'Google Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta',
    website: 'https://aistudio.google.com',
  },
];

export const CHAT_TYPES = [
  'OpenAI-compatible',
  'Anthropic',
  'Google Gemini',
  'Azure OpenAI',
  'Ollama / local',
  'Custom',
];

export const FIELDS: Record<SectionId, FieldDef[]> = {
  provider: [
    {
      key: 'endpoint_path',
      label: 'Chat endpoint path',
      placeholder: '/chat/completions',
      types: CHAT_TYPES,
    },
    {
      key: 'api_version',
      label: 'API version',
      placeholder: '2024-02-01',
      types: ['Anthropic', 'Google Gemini', 'Azure OpenAI', 'Custom'],
    },
    {
      key: 'region',
      label: 'Region',
      placeholder: 'us-east-1',
      types: ['Azure OpenAI', 'AWS Bedrock', 'Custom'],
    },
  ],
  credentials: [
    { key: 'label', label: 'Email / account label', placeholder: 'you@example.com' },
    {
      key: 'org_id',
      label: 'Organization ID',
      placeholder: 'org-...',
      types: ['OpenAI-compatible', 'Custom'],
    },
    { key: 'api_key', label: 'API key', placeholder: 'sk-...', kind: 'secret', full: true },
    {
      key: 'auth_scheme',
      label: 'Auth scheme',
      kind: 'select',
      options: ['Bearer token', 'x-api-key header', 'api-key header', 'Query param', 'None'],
      types: ['OpenAI-compatible', 'Google Gemini', 'Azure OpenAI', 'Ollama / local', 'Custom'],
    },
    {
      key: 'auth_header',
      label: 'Auth header name',
      placeholder: 'Authorization',
      types: ['OpenAI-compatible', 'Azure OpenAI', 'Custom'],
    },
    {
      key: 'project_id',
      label: 'Project ID',
      placeholder: 'proj_...',
      types: ['OpenAI-compatible', 'Google Gemini', 'Custom'],
    },
    {
      key: 'secret',
      label: 'Secret / signing key',
      placeholder: 'Optional',
      kind: 'secret',
      types: ['AWS Bedrock', 'Custom'],
    },
    {
      key: 'custom_headers',
      label: 'Custom headers',
      kind: 'area',
      placeholder: 'X-Header: value',
      hint: 'One header per line',
      full: true,
    },
  ],
  models: [
    { key: 'default_model', label: 'Default model', placeholder: 'gpt-4o' },
    { key: 'context_window', label: 'Context window (tokens)', placeholder: '128000' },
    { key: 'max_output', label: 'Max output tokens', placeholder: '4096' },
    { key: 'temperature', label: 'Default temperature', placeholder: '0.7' },
    {
      key: 'cap_streaming',
      label: 'Streaming',
      kind: 'toggle',
      icon: Zap,
      color: '#f59e0b',
      defaultOn: true,
      groupLabel: 'Capabilities',
      hint: 'Click to turn a capability on or off',
    },
    {
      key: 'cap_tools',
      label: 'Tool / function calling',
      kind: 'toggle',
      icon: Wrench,
      color: '#3b82f6',
      defaultOn: true,
    },
    { key: 'cap_vision', label: 'Vision', kind: 'toggle', icon: Eye, color: '#10b981' },
    { key: 'cap_json', label: 'JSON mode', kind: 'toggle', icon: Braces, color: '#ec4899' },
    { key: 'cap_reasoning', label: 'Reasoning', kind: 'toggle', icon: Brain, color: '#8b5cf6' },
  ],
  quota: [
    { key: 'expires_at', label: 'Expiry date', kind: 'date' },
    {
      key: 'quota_type',
      label: 'Quota type',
      kind: 'select',
      options: ['Tokens', 'Requests', 'USD credit', 'Unlimited'],
    },
    { key: 'quota_limit', label: 'Quota limit', placeholder: '1000000' },
    { key: 'balance', label: 'Remaining balance', placeholder: '5.00' },
    { key: 'rpm', label: 'Requests per minute (RPM)', placeholder: '60' },
    { key: 'tpm', label: 'Tokens per minute (TPM)', placeholder: '90000' },
    {
      key: 'reset_period',
      label: 'Reset period',
      kind: 'select',
      options: ['Monthly', 'Daily', 'Weekly', 'Never'],
    },
    { key: 'monthly_budget', label: 'Monthly budget (USD)', placeholder: '20' },
    { key: 'price_in', label: 'Input price / 1M tokens', placeholder: '2.50' },
    { key: 'price_out', label: 'Output price / 1M tokens', placeholder: '10.00' },
  ],
  format: [
    {
      key: 'request_format',
      label: 'Request format',
      kind: 'select',
      options: [
        'OpenAI chat',
        'OpenAI responses',
        'Anthropic messages',
        'Gemini generateContent',
        'Custom template',
      ],
    },
    {
      key: 'response_format',
      label: 'Response format',
      kind: 'select',
      options: [
        'OpenAI chat',
        'OpenAI responses',
        'Anthropic messages',
        'Gemini',
        'Custom mapping',
      ],
    },
    {
      key: 'stream_protocol',
      label: 'Stream protocol',
      kind: 'select',
      options: ['SSE', 'NDJSON', 'WebSocket', 'None'],
    },
    { key: 'content_type', label: 'Content type', placeholder: 'application/json' },
    {
      key: 'body_template',
      label: 'Request body template',
      kind: 'area',
      full: true,
      placeholder: '{ model: {{model}}, messages: {{messages}}, stream: {{stream}} }',
    },
    {
      key: 'response_mapping',
      label: 'Response mapping',
      kind: 'area',
      full: true,
      hint: 'Path to content, usage, finish reason',
      placeholder: 'content: choices[0].message.content',
    },
  ],
  network: [
    { key: 'timeout', label: 'Timeout (s)', placeholder: '60' },
    { key: 'max_retries', label: 'Max retries', placeholder: '3' },
    { key: 'proxy', label: 'Proxy URL', placeholder: 'http://127.0.0.1:7890' },
    { key: 'priority', label: 'Priority', placeholder: '1' },
    { key: 'verify_tls', label: 'Verify TLS certificate', kind: 'toggle', defaultOn: true },
  ],
  notes: [
    { key: 'tags', label: 'Tags', placeholder: 'work, free-tier, backup', full: true },
    {
      key: 'description',
      label: 'Description',
      kind: 'area',
      full: true,
      placeholder: 'Notes about this API account',
    },
  ],
};
