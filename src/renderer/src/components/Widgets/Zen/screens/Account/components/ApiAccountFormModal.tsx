import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  X,
  Eye,
  EyeOff,
  Plus,
  ChevronDown,
  Globe,
  Server,
  ShieldCheck,
  Boxes,
  Gauge,
  ArrowLeftRight,
  Network,
  StickyNote,
  Check,
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
import { $ } from '@renderer/utils/color';
import { Favicon, getFaviconUrl } from '@renderer/utils/favicon';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { useDbFetch } from '../../../services/useDbFetch';
import type { FlatAccount } from '../types';
import { sharedBackdrop, sharedSheet } from './AddAccountShared';

type SectionId = 'provider' | 'credentials' | 'models' | 'quota' | 'format' | 'network' | 'notes';
type Values = Record<string, string>;

interface SectionMeta {
  name: string;
  shortDesc: string;
  icon: LucideIcon;
  color: string;
}

interface ProviderState {
  name: string;
  type: string;
  url: string;
  website: string;
}

interface Preset extends ProviderState {
  config?: Values;
  models?: string;
}

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  kind?: 'text' | 'secret' | 'select' | 'date' | 'area' | 'toggle';
  options?: string[];
  hint?: string;
  full?: boolean;
  types?: string[];
  icon?: LucideIcon;
  color?: string;
  defaultOn?: boolean;
  groupLabel?: string;
}

const SECTIONS: Record<SectionId, SectionMeta> = {
  provider: { name: 'Provider', shortDesc: 'Where requests are sent', icon: Server, color: '#3b82f6' },
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
  network: { name: 'Network', shortDesc: 'Timeout, retries and proxy', icon: Network, color: '#06b6d4' },
  notes: { name: 'Notes', shortDesc: 'Tags and description', icon: StickyNote, color: '#94a3b8' },
};

const CORE_IDS: SectionId[] = ['provider', 'credentials', 'models'];
const OPTIONAL_IDS: SectionId[] = ['quota', 'format', 'network', 'notes'];

const API_TYPES = [
  'OpenAI-compatible',
  'Anthropic',
  'Google Gemini',
  'Azure OpenAI',
  'AWS Bedrock',
  'Ollama / local',
  'Custom',
];

const TYPE_ICONS: Record<string, LucideIcon> = {
  'OpenAI-compatible': Bot,
  Anthropic: Sparkles,
  'Google Gemini': Gem,
  'Azure OpenAI': Cloud,
  'AWS Bedrock': Server,
  'Ollama / local': Cpu,
  Custom: Settings,
};

const TYPE_ICON_NODES: Record<string, React.ReactNode> = Object.fromEntries(
  API_TYPES.map((t) => {
    const Icon = TYPE_ICONS[t] ?? Settings;
    return [t, <Icon key={t} size={14} />];
  }),
);

const TYPE_DEFAULTS: Record<string, Values> = {
  'OpenAI-compatible': { endpoint_path: '/chat/completions' },
  Anthropic: { endpoint_path: '/messages', api_version: '2023-06-01' },
  'Google Gemini': { api_version: 'v1beta' },
  'Azure OpenAI': { endpoint_path: '/chat/completions', api_version: '2024-02-01' },
  'Ollama / local': { endpoint_path: '/api/chat' },
};

// Các field khác nhau giữa các account: không tự điền từ provider đã lưu
const SENSITIVE_KEYS = ['label', 'api_key', 'org_id', 'project_id', 'secret', 'balance', 'expires_at'];

const PRESETS: Preset[] = [
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

const presetKey = (p: { name: string; url: string }): string => `${p.name}|${p.url}`;

const CHAT_TYPES = [
  'OpenAI-compatible',
  'Anthropic',
  'Google Gemini',
  'Azure OpenAI',
  'Ollama / local',
  'Custom',
];

const FIELDS: Record<SectionId, FieldDef[]> = {
  provider: [
    { key: 'endpoint_path', label: 'Chat endpoint path', placeholder: '/chat/completions', types: CHAT_TYPES },
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
      options: ['OpenAI chat', 'OpenAI responses', 'Anthropic messages', 'Gemini', 'Custom mapping'],
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

const faviconSrc = (value: string): string | undefined => {
  try {
    new URL(value);
    return getFaviconUrl(value, 32);
  } catch {
    return undefined;
  }
};

const inputStyle = (): React.CSSProperties => ({
  width: '100%',
  height: '34px',
  borderRadius: '8px',
  border: 'none',
  outline: 'none',
  padding: '0 10px',
  fontSize: '13px',
  backgroundColor: $('--input-background'),
  color: $('--text-primary'),
});

const areaStyle = (): React.CSSProperties => ({
  ...inputStyle(),
  height: 'auto',
  minHeight: '84px',
  padding: '8px 10px',
  fontFamily: 'monospace',
  fontSize: '12px',
  resize: 'vertical',
});

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '10px',
};

const BadgeIcon: React.FC<{ icon: LucideIcon; color: string }> = ({ icon: Icon, color }) => (
  <div
    style={{
      width: '30px',
      height: '30px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      backgroundColor: `${color}26`,
      color,
    }}
  >
    <Icon size={16} />
  </div>
);

const SoftButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  style,
  ...props
}) => (
  <button
    type='button'
    {...props}
    className='cursor-pointer text-text-primary'
    style={{ backgroundColor: $('--input-background'), border: 'none', ...style }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = $('--dropdown-item-hover');
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = $('--input-background');
    }}
  />
);

const Section: React.FC<{
  meta: SectionMeta;
  onRemove?: () => void;
  children: React.ReactNode;
}> = ({ meta, onRemove, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <BadgeIcon icon={meta.icon} color={meta.color} />
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: $('--text-primary') }}>
          {meta.name}
        </span>
        <span style={{ fontSize: '11px', color: $('--text-secondary') }}>{meta.shortDesc}</span>
      </div>
      {onRemove && (
        <button
          type='button'
          onClick={onRemove}
          title='Remove section'
          className='cursor-pointer text-text-secondary'
          style={{ background: 'none', border: 'none' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
    {children}
  </div>
);

const Field: React.FC<{
  label: string;
  hint?: string;
  full?: boolean;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, hint, full, required, children }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      gridColumn: full ? '1 / -1' : undefined,
    }}
  >
    <span style={{ fontSize: '12px', fontWeight: 600, color: $('--text-primary') }}>
      {label}
      {required && <span style={{ color: $('--error'), marginLeft: '3px' }}>*</span>}
    </span>
    {children}
    {hint && <span style={{ fontSize: '11px', color: $('--text-secondary') }}>{hint}</span>}
  </div>
);

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { lead?: React.ReactNode }> = ({
  lead,
  style,
  ...props
}) => (
  <div style={{ position: 'relative' }}>
    {lead && (
      <span
        style={{
          position: 'absolute',
          left: '10px',
          top: 0,
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          color: $('--text-secondary'),
        }}
      >
        {lead}
      </span>
    )}
    <input {...props} style={{ ...inputStyle(), paddingLeft: lead ? '32px' : '10px', ...style }} />
  </div>
);

const SecretInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        style={{ ...inputStyle(), paddingRight: '36px', fontFamily: 'monospace' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button
        type='button'
        onClick={() => setShow((v) => !v)}
        className='cursor-pointer text-text-secondary'
        style={{ position: 'absolute', right: '8px', top: '8px', background: 'none', border: 'none' }}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
};

const Select: React.FC<{
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
  icons?: Record<string, React.ReactNode>;
}> = ({ options, value, onChange, icons }) => {
  const [inner, setInner] = useState(options[0]);
  const current = value ?? inner;
  return (
    <Dropdown className='w-full' align='start'>
      <DropdownTrigger asChild>
        <button
          type='button'
          className='cursor-pointer'
          style={{
            ...inputStyle(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {icons?.[current]}
            {current}
          </span>
          <ChevronDown size={14} style={{ flexShrink: 0 }} />
        </button>
      </DropdownTrigger>
      <DropdownContent className='max-h-[220px] overflow-y-auto'>
        {options.map((o) => (
          <DropdownItem
            key={o}
            icon={icons?.[o]}
            className={o === current ? 'bg-dropdown-item-hover' : undefined}
            onClick={() => {
              setInner(o);
              onChange?.(o);
            }}
          >
            {o}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
};

const Toggle: React.FC<{
  label: string;
  on: boolean;
  onToggle: () => void;
  icon?: LucideIcon;
  color?: string;
}> = ({ label, on, onToggle, icon: Icon = Check, color = '#3b82f6' }) => (
  <button
    type='button'
    role='switch'
    aria-checked={on}
    onClick={onToggle}
    className='h-7 cursor-pointer rounded-md px-2.5 flex items-center gap-1.5 text-[11px] font-medium transition-colors'
    style={{
      backgroundColor: on ? `${color}26` : $('--input-background'),
      color: on ? color : $('--text-secondary'),
      border: `1px solid ${on ? `${color}66` : 'transparent'}`,
    }}
  >
    <Icon size={12} style={{ color, opacity: on ? 1 : 0.7 }} />
    {label}
  </button>
);

const FieldGrid: React.FC<{
  defs: FieldDef[];
  type: string;
  values: Values;
  required: Set<string>;
  onChange: (key: string, value: string) => void;
}> = ({ defs, type, values, required, onChange }) => {
  const shown = defs.filter((d) => !d.types || d.types.includes(type));
  const inputs = shown.filter((d) => d.kind !== 'toggle');
  const toggles = shown.filter((d) => d.kind === 'toggle');
  const row = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {toggles.map((t) => (
        <Toggle
          key={t.key}
          label={t.label}
          icon={t.icon}
          color={t.color}
          on={(values[t.key] ?? (t.defaultOn ? 'true' : 'false')) === 'true'}
          onToggle={() => {
            const cur = (values[t.key] ?? (t.defaultOn ? 'true' : 'false')) === 'true';
            onChange(t.key, cur ? 'false' : 'true');
          }}
        />
      ))}
    </div>
  );
  return (
    <>
      {inputs.length > 0 && (
        <div style={gridStyle}>
          {inputs.map((d) => {
            const value = values[d.key] ?? '';
            const set = (v: string) => onChange(d.key, v);
            let control: React.ReactNode;
            if (d.kind === 'select') {
              control = (
                <Select options={d.options ?? []} value={values[d.key]} onChange={set} />
              );
            } else if (d.kind === 'area') {
              control = (
                <textarea
                  style={areaStyle()}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={d.placeholder}
                />
              );
            } else if (d.kind === 'secret') {
              control = <SecretInput value={value} onChange={set} placeholder={d.placeholder} />;
            } else {
              control = (
                <TextInput
                  type={d.kind === 'date' ? 'date' : 'text'}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={d.placeholder}
                />
              );
            }
            return (
              <Field
                key={d.key}
                label={d.label}
                hint={d.hint}
                full={d.full}
                required={required.has(d.key)}
              >
                {control}
              </Field>
            );
          })}
        </div>
      )}
      {toggles.length > 0 &&
        (toggles[0].groupLabel ? (
          <Field label={toggles[0].groupLabel} hint={toggles[0].hint}>
            {row}
          </Field>
        ) : (
          row
        ))}
    </>
  );
};

const ProviderPicker: React.FC<{
  provider: ProviderState;
  presets: Preset[];
  onPick: (preset: Preset) => void;
  onCustom: () => void;
}> = ({ provider, presets, onPick, onCustom }) => {
  const selected = presets.find((p) => presetKey(p) === presetKey(provider));
  return (
    <Field label='Provider preset' full>
      <Dropdown className='w-full' align='start'>
        <DropdownTrigger asChild>
          <button
            type='button'
            className='cursor-pointer'
            style={{
              ...inputStyle(),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              {selected ? (
                <Favicon
                  url={faviconSrc(selected.website)}
                  size={16}
                  fallbackIcon={<Globe size={14} />}
                />
              ) : (
                <Plus size={14} />
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected ? selected.name : 'Custom'}
              </span>
            </span>
            <ChevronDown size={14} style={{ flexShrink: 0 }} />
          </button>
        </DropdownTrigger>
        <DropdownContent className='max-h-[220px] overflow-y-auto'>
          <DropdownItem
            icon={<Plus size={14} />}
            className={!selected ? 'bg-dropdown-item-hover' : undefined}
            onClick={onCustom}
          >
            Custom
          </DropdownItem>
          {presets.map((p) => (
            <DropdownItem
              key={presetKey(p)}
              icon={
                <Favicon
                  url={faviconSrc(p.website || p.url)}
                  size={14}
                  fallbackIcon={<Globe size={13} />}
                />
              }
              className={
                selected && presetKey(selected) === presetKey(p) ? 'bg-dropdown-item-hover' : undefined
              }
              onClick={() => onPick(p)}
            >
              {p.name}
            </DropdownItem>
          ))}
        </DropdownContent>
      </Dropdown>
    </Field>
  );
};

interface ModelsFetcher {
  loading: boolean;
  error: string | null;
  models: string[] | null;
  run: () => void;
}

const ModelsPicker: React.FC<{
  fetcher: ModelsFetcher;
  manual: string;
  onManual: (value: string) => void;
}> = ({ fetcher, manual, onManual }) => (
  <div style={gridStyle}>
    <Field
      label='Models'
      full
      hint={
        fetcher.models
          ? 'Fetched from the provider, no need to enter models manually'
          : fetcher.error
            ? `Could not fetch models (${fetcher.error}). Enter them manually, comma separated`
            : 'Fetch from the provider, or enter manually (comma separated)'
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <SoftButton
          onClick={fetcher.run}
          disabled={fetcher.loading}
          style={{
            height: '30px',
            borderRadius: '8px',
            padding: '0 12px',
            fontSize: '12px',
            width: 'fit-content',
          }}
        >
          {fetcher.loading ? 'Fetching...' : 'Fetch models from provider'}
        </SoftButton>
        {fetcher.models ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              maxHeight: '140px',
              overflowY: 'auto',
            }}
          >
            {fetcher.models.map((m) => (
              <span
                key={m}
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: $('--input-background'),
                  color: $('--text-primary'),
                }}
              >
                {m}
              </span>
            ))}
          </div>
        ) : (
          <textarea
            style={areaStyle()}
            value={manual}
            onChange={(e) => onManual(e.target.value)}
            placeholder='gpt-4o, gpt-4o-mini, o3-mini'
          />
        )}
      </div>
    </Field>
  </div>
);

const toValues = (config: Record<string, any> | null | undefined): Values => {
  const out: Values = {};
  for (const [k, v] of Object.entries(config ?? {})) {
    if (k === 'website' || k === 'models') continue;
    if (v !== null && v !== undefined && typeof v !== 'object') out[k] = String(v);
  }
  return out;
};

const withoutSensitive = (values: Values): Values => {
  const out: Values = {};
  for (const [k, v] of Object.entries(values)) if (!SENSITIVE_KEYS.includes(k)) out[k] = v;
  return out;
};

const onlySensitive = (values: Values): Values => {
  const out: Values = {};
  for (const [k, v] of Object.entries(values)) if (SENSITIVE_KEYS.includes(k)) out[k] = v;
  return out;
};

export const ApiAccountFormModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  account?: FlatAccount | null;
}> = ({ open, onClose, onSaved, account }) => {
  const dbFetch = useDbFetch();
  const [provider, setProvider] = useState<ProviderState>({
    name: account ? account.provider_id.replace(/^api:/, '') : '',
    type: account?.api_type || API_TYPES[0],
    url: account?.base_url || '',
    website: account?.website || '',
  });
  const [values, setValues] = useState<Values>(() => ({
    label: account?.label || '',
    api_key: account?.credential || '',
    ...(account?.expires_at ? { expires_at: account.expires_at } : {}),
    ...toValues(account?.config),
  }));
  const [extra, setExtra] = useState<SectionId[]>([]);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchedError, setFetchedError] = useState<string | null>(null);
  const [fetchedModels, setFetchedModels] = useState<string[] | null>(null);
  const [manualModels, setManualModels] = useState(
    Array.isArray(account?.config?.models) ? account.config.models.join(', ') : '',
  );
  const [savedAll, setSavedAll] = useState<Preset[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await dbFetch('/v1/api-accounts?page=1&limit=10000', {
          method: 'GET',
          cache: 'no-store',
        });
        const json = await res.json();
        if (cancelled || !json.success) return;
        const seen = new Set<string>();
        const list: Preset[] = [];
        for (const a of json.data?.accounts ?? []) {
          const item: Preset = {
            name: a.provider_name,
            type: a.api_type,
            url: a.base_url,
            website: a.config?.website || '',
            config: withoutSensitive(toValues(a.config)),
            models: Array.isArray(a.config?.models) ? a.config.models.join(', ') : '',
          };
          const key = presetKey(item);
          if (seen.has(key)) continue;
          seen.add(key);
          list.push(item);
        }
        setSavedAll(list);
      } catch (err) {
        console.error('Failed to load saved providers:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const presetKeys = new Set(PRESETS.map(presetKey));
  const presets: Preset[] = [...PRESETS, ...savedAll.filter((s) => !presetKeys.has(presetKey(s)))];

  const setValue = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  const patchProvider = (patch: Partial<ProviderState>) => setProvider((p) => ({ ...p, ...patch }));

  const pickPreset = (p: Preset) => {
    const saved = savedAll.find((s) => presetKey(s) === presetKey(p));
    setProvider({ name: p.name, type: p.type, url: p.url, website: p.website || saved?.website || '' });
    setValues((prev) => ({
      ...onlySensitive(prev),
      ...(TYPE_DEFAULTS[p.type] ?? {}),
      ...(saved?.config ?? {}),
    }));
    setManualModels(saved?.models ?? '');
    setFetchedModels(null);
    setFetchedError(null);
  };

  const pickCustom = () => {
    setProvider({ name: '', type: API_TYPES[0], url: '', website: '' });
    setValues((prev) => ({ ...onlySensitive(prev), ...TYPE_DEFAULTS[API_TYPES[0]] }));
    setManualModels('');
    setFetchedModels(null);
    setFetchedError(null);
  };

  const changeType = (type: string) => {
    const oldDefaults = TYPE_DEFAULTS[provider.type] ?? {};
    const newDefaults = TYPE_DEFAULTS[type] ?? {};
    setValues((prev) => {
      const next = { ...prev };
      for (const k of new Set([...Object.keys(oldDefaults), ...Object.keys(newDefaults)])) {
        if (!prev[k] || prev[k] === oldDefaults[k]) {
          if (newDefaults[k]) next[k] = newDefaults[k];
          else delete next[k];
        }
      }
      return next;
    });
    patchProvider({ type });
  };

  const needsKey = provider.type !== 'Ollama / local';
  const requiredKeys = new Set<string>(needsKey ? ['api_key'] : []);
  const canSave =
    !saving && !!provider.name.trim() && !!provider.url.trim() && (!needsKey || !!values.api_key);

  const runFetchModels = async () => {
    if (!provider.url) {
      setFetchedError('Provider URL is required');
      return;
    }
    setFetching(true);
    setFetchedError(null);
    try {
      const res = await dbFetch('/v1/api-accounts/fetch-models', {
        method: 'POST',
        cache: 'no-store',
        body: JSON.stringify({
          base_url: provider.url,
          api_type: provider.type,
          api_key: values.api_key,
        }),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setFetchedModels(json.data.map((m: { id: string }) => m.id));
      } else {
        setFetchedModels(null);
        setFetchedError(json.message || 'No models returned');
      }
    } catch (err: any) {
      setFetchedModels(null);
      setFetchedError(err?.message || 'Network error');
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const visibleKeys = new Set<string>(
        Object.values(FIELDS)
          .flat()
          .filter((d) => !d.types || d.types.includes(provider.type))
          .map((d) => d.key),
      );
      const config: Record<string, unknown> = {
        website: provider.website,
        models: fetchedModels
          ? []
          : manualModels
              .split(',')
              .map((m) => m.trim())
              .filter(Boolean),
      };
      for (const [k, v] of Object.entries(values)) {
        if (k === 'label' || k === 'api_key' || k === 'expires_at') continue;
        if (v !== '' && visibleKeys.has(k)) config[k] = v;
      }
      const res = await dbFetch(account ? `/v1/api-accounts/${account.id}` : '/v1/api-accounts', {
        method: account ? 'PUT' : 'POST',
        cache: 'no-store',
        body: JSON.stringify({
          provider_name: provider.name.trim(),
          api_type: provider.type,
          base_url: provider.url.trim(),
          label: values.label || null,
          api_key: values.api_key || '',
          expires_at: values.expires_at || null,
          config,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onSaved?.();
        onClose();
      }
    } catch (err) {
      console.error('Failed to save API account:', err);
    } finally {
      setSaving(false);
    }
  };

  const removeSection = (id: SectionId) => setExtra((prev) => prev.filter((x) => x !== id));
  const available = OPTIONAL_IDS.filter((id) => !extra.includes(id));
  const visible = [...CORE_IDS, ...OPTIONAL_IDS.filter((id) => extra.includes(id))];

  const grid = (id: SectionId) => (
    <FieldGrid
      defs={FIELDS[id]}
      type={provider.type}
      values={values}
      required={requiredKeys}
      onChange={setValue}
    />
  );

  const bodies: Record<SectionId, React.ReactNode> = {
    provider: (
      <>
        <div style={gridStyle}>
          <ProviderPicker
            provider={provider}
            presets={presets}
            onPick={pickPreset}
            onCustom={pickCustom}
          />
          <Field label='Provider name' required>
            <TextInput
              value={provider.name}
              onChange={(e) => patchProvider({ name: e.target.value })}
              placeholder='OpenAI, DeepSeek, OpenRouter...'
            />
          </Field>
          <Field label='API type' required>
            <Select
              options={API_TYPES}
              value={provider.type}
              onChange={changeType}
              icons={TYPE_ICON_NODES}
            />
          </Field>
          <Field label='Provider URL (base URL)' full required>
            <TextInput
              value={provider.url}
              onChange={(e) => patchProvider({ url: e.target.value })}
              placeholder='https://api.openai.com/v1'
              lead={
                <Favicon
                  url={faviconSrc(provider.url)}
                  size={16}
                  fallbackIcon={<Globe size={14} />}
                />
              }
            />
          </Field>
          <Field label='Website'>
            <TextInput
              value={provider.website}
              onChange={(e) => patchProvider({ website: e.target.value })}
              placeholder='https://platform.openai.com'
              lead={
                <Favicon
                  url={faviconSrc(provider.website)}
                  size={16}
                  fallbackIcon={<Globe size={14} />}
                />
              }
            />
          </Field>
        </div>
        {grid('provider')}
      </>
    ),
    credentials: grid('credentials'),
    models: (
      <>
        <ModelsPicker
          fetcher={{
            loading: fetching,
            error: fetchedError,
            models: fetchedModels,
            run: runFetchModels,
          }}
          manual={manualModels}
          onManual={setManualModels}
        />
        {grid('models')}
      </>
    ),
    quota: grid('quota'),
    format: grid('format'),
    network: grid('network'),
    notes: grid('notes'),
  };

  const content = (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: '15px', fontWeight: 600 }}>
            {account ? 'Edit API account' : 'Add API account'}
          </span>
          <span style={{ fontSize: '12px', color: $('--text-secondary') }}>
            Connect a provider with your own API key
          </span>
        </div>
        <button
          onClick={onClose}
          className='cursor-pointer rounded-lg border-none p-1.5 bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary active:bg-text-secondary/20'
        >
          <X size={16} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '0 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
        }}
      >
        {visible.map((id) => (
          <Section
            key={id}
            meta={SECTIONS[id]}
            onRemove={CORE_IDS.includes(id) ? undefined : () => removeSection(id)}
          >
            {bodies[id]}
          </Section>
        ))}

        {available.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: $('--text-secondary'),
              }}
            >
              Add more sections
            </div>
            <div style={gridStyle}>
              {available.map((id) => {
                const meta = SECTIONS[id];
                return (
                  <SoftButton
                    key={id}
                    onClick={() => setExtra((prev) => [...prev, id])}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      minWidth: 0,
                      borderRadius: '8px',
                      textAlign: 'left',
                    }}
                  >
                    <BadgeIcon icon={meta.icon} color={meta.color} />
                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {meta.name}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: $('--text-secondary'),
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {meta.shortDesc}
                      </span>
                    </span>
                    <Plus size={14} />
                  </SoftButton>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          padding: '12px 16px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          className='h-9 cursor-pointer rounded-lg border-none px-4 text-[13px] font-medium bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30'
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className='h-9 cursor-pointer rounded-lg border-none px-4 text-[13px] font-medium bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-50'
        >
          {account ? 'Save changes' : 'Save API account'}
        </button>
      </div>
    </>
  );

  return (
    <>
      {sharedBackdrop(onClose)}
      {sharedSheet(content, '92%')}
    </>
  );
};

export const ApiAccountFormButton: React.FC<{ onSaved?: () => void }> = ({ onSaved }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className='w-[34px] h-[34px] rounded-lg flex items-center justify-center shrink-0 cursor-pointer text-text-secondary'
        style={{ backgroundColor: $('--input-background'), border: 'none' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = $('--dropdown-item-hover');
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = $('--input-background');
        }}
        title='Add API account'
      >
        <KeyRound size={16} />
      </button>
      <ApiAccountFormModal open={open} onClose={() => setOpen(false)} onSaved={onSaved} />
    </>
  );
};