import { ToolbarButton } from '../../../ui/ToolbarButton'

const MESSAGES = [
  { role: 'assistant', text: "Hello! I'm your AI security assistant. I have full context of the current engagement including 27 vulnerabilities, 3 active sessions, and all scan results. How can I help?" },
  { role: 'user',      text: "What's the best attack path to Domain Admin from our current foothold?" },
  { role: 'assistant', text: null, structured: [
    { color: 'text-cyan-400',   prefix: '1. Current Position:',  body: ' www-data shell on 192.168.1.20 (Session #2)' },
    { color: 'text-amber-400',  prefix: '2. Local PrivEsc:',     body: ' Log4Shell already gave root on .20. Use CVE-2021-4034 (PwnKit) as backup.' },
    { color: 'text-red-400',    prefix: '3. Lateral to DC:',     body: ' Use harvested hash admin:P@ssw0rd! via Pass-the-Hash to 192.168.1.10:445' },
    { color: 'text-purple-400', prefix: '4. DA via EternalBlue:',body: ' MS17-010 on DC01 gives SYSTEM = Domain Admin' },
    { color: 'text-green-400',  prefix: '5. Persistence:',       body: ' Golden Ticket via NTDS.dit dump → krbtgt hash' },
  ]},
  { role: 'user',      text: 'Generate the executive summary section for the report automatically' },
  { role: 'assistant', text: '✓ Generated and added to Report Builder\n\nSummary: The assessment revealed critical vulnerabilities enabling complete network compromise. Red Team successfully obtained Domain Administrator privileges within 2 hours of initial access, demonstrating significant risk. Immediate patching of CVE-2021-44228 and MS17-010 is strongly recommended.' },
]

const QUICK_PROMPTS = [
  'What CVEs affect this target?',
  'Suggest lateral movement paths',
  'Generate remediation steps',
  'Explain this vulnerability',
  'Draft executive summary',
  'What\'s the attack surface?',
]

export function ViewAI() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2 px-3 h-10 border-b border-zinc-800 bg-zinc-950 shrink-0 overflow-x-auto">
        <span className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider">Model:</span>
        <select className="h-6 bg-zinc-900 border border-zinc-700 rounded text-cyan-400 text-[11px] px-2 outline-none font-mono">
          <option>PHANTOM-AI (Security)</option>
          <option>GPT-4 Turbo</option>
          <option>Claude 3</option>
        </select>
        <div className="w-px h-4 bg-zinc-800" />
        <ToolbarButton>Context: Current Target</ToolbarButton>
        <ToolbarButton>Context: All Findings</ToolbarButton>
        <button className="h-6 px-2 rounded border border-purple-500/30 bg-purple-500/8 text-purple-400 text-[10px] font-semibold shrink-0">Auto Report Section</button>
        <ToolbarButton className="ml-auto">Clear Chat</ToolbarButton>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Chat */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {MESSAGES.map((m, i) => (
              <div key={i} className={m.role === 'user'
                ? 'bg-zinc-800 border border-zinc-700 rounded-lg p-3 ml-8'
                : 'bg-cyan-500/5 border border-cyan-500/15 rounded-lg p-3 mr-8'
              }>
                <div className={`text-[9.5px] font-bold uppercase tracking-wider mb-1.5 ${m.role === 'user' ? 'text-zinc-600' : 'text-cyan-400'}`}>
                  {m.role === 'user' ? 'Operator' : 'PHANTOM AI'}
                </div>
                {m.structured ? (
                  <div className="text-[11px] leading-7">
                    {m.structured.map((s, j) => (
                      <div key={j}>
                        <span className={`font-bold ${s.color}`}>{s.prefix}</span>
                        <span className="text-zinc-300">{s.body}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-zinc-300 leading-6 whitespace-pre-line">{m.text}</div>
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-950 shrink-0">
            <textarea
              readOnly
              className="w-full bg-zinc-900 border border-zinc-700 rounded text-zinc-300 text-[11px] p-2.5 outline-none resize-none h-12 font-mono focus:border-cyan-500/40"
              placeholder="Ask AI: 'How to exploit this CVE?', 'Generate remediation steps', 'What's the attack surface?'..."
            />
            <div className="flex justify-end gap-2 mt-2">
              <button className="h-6 px-2 rounded border border-purple-500/30 bg-purple-500/8 text-purple-400 text-[10px] font-semibold">⚡ Quick Prompts</button>
              <ToolbarButton variant="cyan">Send ↵</ToolbarButton>
            </div>
          </div>
        </div>

        {/* Quick prompts sidebar */}
        <div className="w-44 shrink-0 border-l border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden">
          <div className="px-3 h-8 flex items-center border-b border-zinc-800">
            <span className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider">Quick Prompts</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {QUICK_PROMPTS.map((p) => (
              <button key={p} className="w-full text-left text-[10px] text-zinc-400 px-2 py-1.5 rounded border border-transparent hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-700 transition-all leading-5">
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
