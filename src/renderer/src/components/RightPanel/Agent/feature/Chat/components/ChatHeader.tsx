import React from 'react';

interface ChatHeaderProps {
  displayedModel: any;
  currentAccount: any;
  currentTaskName: string | null;
  contextUsage: { prompt: number; completion: number; total: number };
  isSearchOpen: boolean;
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  displayedModel,
  currentAccount,
  currentTaskName,
  contextUsage,
  isSearchOpen,
  setIsSearchOpen,
  setSearchQuery,
}) => {
  const formatTokens = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const providerId = displayedModel?.providerId || '';
  const faviconUrl = providerId
    ? `https://www.google.com/s2/favicons?domain=${(() => {
        const pid = providerId.toLowerCase();
        if (pid.includes('openai')) return 'openai.com';
        if (pid.includes('anthropic')) return 'anthropic.com';
        if (pid.includes('google') || pid.includes('gemini')) return 'google.com';
        if (pid.includes('openrouter')) return 'openrouter.ai';
        if (pid.includes('deepseek')) return 'deepseek.com';
        if (pid.includes('zenmux') || pid.includes('moonshotai')) return 'zenmux.ai';
        if (pid.includes('qwen')) return 'qwen.ai';
        if (pid.includes('groq')) return 'groq.com';
        if (pid.includes('mistral')) return 'mistral.ai';
        if (pid.includes('glm') || pid.includes('zai') || pid.includes('z-ai'))
          return 'bigmodel.cn';
        return 'deepseek.com';
      })()}&sz=64`
    : 'https://www.google.com/s2/favicons?domain=deepseek.com&sz=64';

  return (
    <div className="flex flex-col border border-b border-border">
      <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold overflow-hidden text-primary">
          <img src={faviconUrl} alt="provider" className="w-3.5 h-3.5 rounded-[2px]" />
          <span className="whitespace-nowrap">
            {displayedModel?.providerId || '?'}/{displayedModel?.id || 'chat'}
          </span>
          {currentAccount?.email && (
            <span
              className="opacity-70 italic font-normal text-[11px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]"
              title={currentAccount.email}
            >
              {currentAccount.email}
            </span>
          )}
          {currentTaskName && (
            <>
              <span className="opacity-30">|</span>
              <div className="flex items-center gap-1 text-[11px] font-medium overflow-hidden text-primary">
                <div
                  className="w-[5px] h-[5px] rounded-full shrink-0"
                  style={{ backgroundColor: 'currentColor' }}
                />
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                  {currentTaskName}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] opacity-80 text-secondary">
            {contextUsage ? formatTokens(contextUsage.total) : '0'}
          </span>
          <button
            onClick={() => {
              setIsSearchOpen((v) => !v);
              if (isSearchOpen) setSearchQuery('');
            }}
            title="Search in chat"
            className="cursor-pointer p-[3px_4px] flex items-center justify-center rounded transition-all duration-150"
            style={{
              background: isSearchOpen
                ? 'color-mix(in srgb, var(--primary, #0a84ff) 15%, transparent)'
                : 'transparent',
              border: isSearchOpen
                ? '1px solid color-mix(in srgb, var(--primary, #0a84ff) 40%, transparent)'
                : '1px solid transparent',
              color: isSearchOpen
                ? 'var(--primary, #0a84ff)'
                : 'var(--secondary-text)',
              opacity: isSearchOpen ? 1 : 0.65,
            }}
            onMouseEnter={(e) => {
              if (!isSearchOpen) e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              if (!isSearchOpen) e.currentTarget.style.opacity = '0.65';
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m13 13.5 2-2.5-2-2.5" />
              <path d="m21 21-4.3-4.3" />
              <path d="M9 8.5 7 11l2 2.5" />
              <circle cx="11" cy="11" r="8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
