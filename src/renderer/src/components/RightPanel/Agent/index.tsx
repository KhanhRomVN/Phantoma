// ─── Agent Panel (Main Export) ────────────────────────────────────────────
import HomePanel from './feature/Home';

// ─── AgentPanel ────────────────────────────────────────────────────────────

export function AgentPanel() {
  return (
    <div className="flex flex-col bg-background rounded-xl overflow-hidden shadow-2xl h-full font-sans text-text-primary">
      <div className="flex-1 overflow-hidden bg-background flex flex-col">
        <HomePanel onSendMessage={() => {}} onLoadConversation={() => {}} />
      </div>
    </div>
  );
}
