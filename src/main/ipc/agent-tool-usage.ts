import { execFile } from 'child_process'
import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import * as os from 'os'
import * as path from 'path'
import type {
  AgentKind,
  PlanUsage,
  PlanUsageResult,
  PlanUsageWindow
} from '../../shared/types/agent-tool'

const CLAUDE_USAGE_URL = 'https://api.anthropic.com/api/oauth/usage'
const CODEX_USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage'
const USAGE_TIMEOUT_MS = 10000
const DAY_SECONDS = 86400

const fail = (error: string): PlanUsageResult => ({ ok: false, error })

const readJson = async (file: string): Promise<any | null> => {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    return null
  }
}

const strField = (value: any, key: string): string | undefined =>
  typeof value?.[key] === 'string' && value[key] ? value[key] : undefined

const parseWhen = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value * 1000
  if (typeof value === 'string') {
    const time = Date.parse(value)
    return Number.isNaN(time) ? undefined : time
  }
  return undefined
}

const getJson = async (
  url: string,
  headers: Record<string, string>
): Promise<{ body: any } | { error: string }> => {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(USAGE_TIMEOUT_MS) })
    if (response.status === 401 || response.status === 403) {
      return { error: 'Sign in again to see usage' }
    }
    if (response.status === 429) return { error: 'Usage is rate limited, try again soon' }
    if (!response.ok) return { error: `Usage unavailable (HTTP ${response.status})` }
    return { body: await response.json() }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

const readClaudeCredentials = async (): Promise<any | null> => {
  const configDir = process.env.CLAUDE_CONFIG_DIR || ''
  if (process.platform === 'darwin') {
    const suffix = configDir
      ? '-' + createHash('sha256').update(configDir).digest('hex').slice(0, 8)
      : ''
    const stdout = await new Promise<string>((resolve) =>
      execFile(
        '/usr/bin/security',
        ['find-generic-password', '-s', 'Claude Code-credentials' + suffix, '-w'],
        { timeout: 15000 },
        (error, out) => resolve(error ? '' : out)
      )
    )
    try {
      if (stdout.trim()) return JSON.parse(stdout.trim())
    } catch {
      // rơi xuống file credentials
    }
  }
  return readJson(path.join(configDir || path.join(os.homedir(), '.claude'), '.credentials.json'))
}

const claudePlan = (subscriptionType?: string, tier?: string): string | undefined => {
  const base: Record<string, string> = { max: 'Max', pro: 'Pro', team: 'Team', enterprise: 'Enterprise' }
  const name = subscriptionType ? base[subscriptionType] : undefined
  if (!name) return undefined
  const multiplier = tier?.match(/_(\d+)x$/)?.[1]
  return multiplier ? `${name} ${multiplier}×` : name
}

const claudeUsage = async (): Promise<PlanUsageResult> => {
  const credentials = await readClaudeCredentials()
  if (!credentials) return fail('Sign in to Claude Code to see usage')
  const oauth = credentials.claudeAiOauth
  if (!oauth) return fail('Usage is only reported for Claude subscriptions')
  const accessToken = strField(oauth, 'accessToken')
  if (!accessToken) return fail('Sign in to Claude Code to see usage')
  const response = await getJson(CLAUDE_USAGE_URL, {
    Authorization: `Bearer ${accessToken}`,
    'anthropic-beta': 'oauth-2025-04-20',
    'Content-Type': 'application/json'
  })
  if ('error' in response) return fail(response.error)
  const windows: PlanUsageWindow[] = []
  for (const [key, label] of [
    ['five_hour', 'Session'],
    ['seven_day', 'Week']
  ] as const) {
    const utilization = response.body?.[key]?.utilization
    if (typeof utilization === 'number') {
      windows.push({
        label,
        usedFraction: utilization / 100,
        resetsAt: parseWhen(response.body[key].resets_at)
      })
    }
  }
  if (windows.length === 0) return fail('Usage unavailable')
  const usage: PlanUsage = {
    windows,
    planLabel: claudePlan(
      strField(oauth, 'subscriptionType'),
      strField(oauth, 'rateLimitTier')
    )
  }
  return { ok: true, usage }
}

const codexWindowLabel = (spanSeconds: number): string =>
  spanSeconds >= 28 * DAY_SECONDS ? 'Month' : spanSeconds >= 5 * DAY_SECONDS ? 'Week' : 'Session'

const codexUsage = async (): Promise<PlanUsageResult> => {
  const auth = await readJson(
    path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'auth.json')
  )
  if (!auth) return fail('Sign in to Codex to see usage')
  if (!auth.tokens) {
    return fail(
      strField(auth, 'OPENAI_API_KEY')
        ? 'Usage isn\'t reported for API keys'
        : 'Sign in to Codex to see usage'
    )
  }
  const accessToken = strField(auth.tokens, 'access_token')
  if (!accessToken) return fail('Sign in to Codex to see usage')
  const response = await getJson(CODEX_USAGE_URL, {
    Authorization: `Bearer ${accessToken}`,
    'chatgpt-account-id': strField(auth.tokens, 'account_id') ?? ''
  })
  if ('error' in response) return fail(response.error)
  const windows: PlanUsageWindow[] = []
  for (const key of ['primary_window', 'secondary_window']) {
    const window = response.body?.rate_limit?.[key]
    if (typeof window?.used_percent === 'number') {
      windows.push({
        label: codexWindowLabel(Number(window.limit_window_seconds) || 0),
        usedFraction: window.used_percent / 100,
        resetsAt: parseWhen(window.reset_at)
      })
    }
  }
  if (windows.length === 0) return fail('Usage unavailable')
  const plan = strField(response.body, 'plan_type')
  const usage: PlanUsage = {
    windows,
    planLabel: plan ? `ChatGPT ${plan[0].toUpperCase()}${plan.slice(1)}` : undefined
  }
  return { ok: true, usage }
}

export function fetchPlanUsage(kind: AgentKind): Promise<PlanUsageResult> {
  if (kind === 'claude') return claudeUsage()
  if (kind === 'codex') return codexUsage()
  return Promise.resolve(fail("OpenCode doesn't report plan usage"))
}