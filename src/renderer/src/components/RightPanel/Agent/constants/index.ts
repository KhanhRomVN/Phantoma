// ─── Agent Constants ─────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are Phantoma AI Agent, a specialized assistant for network traffic analysis, penetration testing, and security auditing.

Your capabilities include:
- Inspecting intercepted HTTP/HTTPS requests and responses
- Filtering and searching through network traffic
- Analyzing security headers and payloads
- Detecting vulnerabilities in web applications
- Providing actionable security recommendations

When responding:
1. Be concise and technical
2. Use markdown for structure (code blocks, tables, lists)
3. Show your reasoning process in a "thinking" block
4. Use tool calls when you need to interact with the system

Available tools:
- list_requests: List captured network requests
- get_request_detail: Get detailed info about a specific request
- filter_requests: Filter requests by criteria (status, domain, method)
- delete_request: Remove a request from the capture
- analyze_headers: Analyze security headers of a request/response
- scan_vulnerability: Scan for common vulnerabilities

Format your response with:
1. THINKING: Your reasoning process (optional but recommended)
2. DISPLAY: The visible response content (markdown)
3. ACTIONS: Tool calls wrapped in XML tags

Example:
I need to list all requests from github.com

<list_requests>
{"domain": "github.com"}
</list_requests>`;

export const TABS = [
  { id: 'chat' as const, icon: 'MessageSquare', label: 'Chat' },
  { id: 'models' as const, icon: 'Cpu', label: 'Models' },
  { id: 'accounts' as const, icon: 'Users', label: 'Accounts' },
  { id: 'settings' as const, icon: 'Settings', label: 'Settings' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export const DEFAULT_SETTINGS = {
  apiUrl: 'http://localhost:8888',
  language: 'en',
  aiLanguage: 'English',
  activeModelId: null as string | null,
  activeAccountId: null as string | null,
};

export const WELCOME_SUGGESTIONS = [
  {
    title: 'List Network Traffic',
    description: '"List all captured HTTP/HTTPS requests"',
    prompt: 'List all captured HTTP/HTTPS requests',
  },
  {
    title: 'Filter Traffic',
    description: '"Find all requests with status 200 from github.com"',
    prompt: 'Find all requests with status 200 from github.com',
  },
  {
    title: 'Analyze Security',
    description: '"Show request details for the first request and analyze its security headers"',
    prompt: 'Show request details for the first request and analyze its security headers',
  },
];

export const PROVIDER_FAVICON_CACHE: Record<string, string> = {};

// Mock data for development
export const MOCK_PROVIDERS: any[] = [
  {
    provider_id: 'openai',
    provider_name: 'OpenAI',
    website_url: 'https://openai.com',
    is_enabled: true,
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Most capable OpenAI model with vision and text',
        max_context_length: 128000,
        is_thinking: true,
        success_rate: 97.5,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Fast, cost-effective GPT-4 variant',
        max_context_length: 128000,
        success_rate: 96.2,
      },
    ],
  },
  {
    provider_id: 'anthropic',
    provider_name: 'Anthropic',
    website_url: 'https://anthropic.com',
    is_enabled: true,
    models: [
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        description: 'Balanced performance and speed',
        max_context_length: 200000,
        is_thinking: true,
        success_rate: 95.8,
      },
    ],
  },
  {
    provider_id: 'google',
    provider_name: 'Google AI',
    website_url: 'https://ai.google.dev',
    is_enabled: true,
    models: [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        description: 'Fast, efficient Gemini model',
        max_context_length: 1000000,
        is_search: true,
        success_rate: 94.3,
      },
    ],
  },
];

export const MOCK_ACCOUNTS: any[] = [
  {
    id: 'acc-1',
    provider_id: 'openai',
    email: 'user@example.com',
    total_requests: 1247,
    total_tokens: 2850000,
    daily_requests: 45,
    is_active: true,
  },
  {
    id: 'acc-2',
    provider_id: 'anthropic',
    email: 'team@example.com',
    total_requests: 892,
    total_tokens: 1620000,
    daily_requests: 28,
    is_active: false,
  },
];
