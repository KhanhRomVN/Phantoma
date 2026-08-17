/**
 * Team Member Card Component
 */

interface TeamMemberProps {
  emoji: string;
  name: string;
  role: string;
  description: string;
  tone: 'cyan' | 'violet';
}

export function TeamMember({ emoji, name, role, description, tone }: TeamMemberProps) {
  const roleColor = tone === 'cyan' ? 'text-cyan-600 dark:text-cyan-400' : 'text-violet-600 dark:text-violet-400';
  const avatarBg =
    tone === 'cyan'
      ? 'from-cyan-500/20 to-cyan-500/5'
      : 'from-violet-500/20 to-violet-500/5';

  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-white dark:bg-zinc-900/60 overflow-hidden hover:border-cyan-500/30 dark:hover:border-cyan-500/30 transition-colors duration-200">
      <div className={`w-full aspect-square bg-gradient-to-br ${avatarBg} flex items-center justify-center text-6xl`}>
        {emoji}
      </div>
      <div className="p-6">
        <h3 className="font-[Space_Grotesk] text-lg font-bold text-zinc-900 dark:text-white mb-1">
          {name}
        </h3>
        <p className={`text-xs font-mono uppercase tracking-wider mb-3 ${roleColor}`}>{role}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
