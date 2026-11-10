import { memo } from 'react';
import { Zap } from 'lucide-react';
import { getFaviconUrl } from '@renderer/utils/favicon';
import type { AgentSessionItem } from '../../../services/agentApi';

interface HistoryCardProps {
  item: AgentSessionItem;
  onSelect?: (item: AgentSessionItem) => void;
}

const CARD_CLASS =
  'group relative flex w-full items-center gap-2 box-border py-1.5 pl-2.5 pr-2 rounded-lg border border-transparent bg-transparent text-left cursor-pointer overflow-hidden outline-none transition hover:bg-card-hover hover:border-border/70 focus-visible:bg-card-hover focus-visible:border-primary active:scale-[0.994]';
const ACCENT_CLASS =
  'absolute left-0 top-1/2 h-0 w-[3px] rounded-r-[3px] bg-primary -translate-y-1/2 transition-[height] duration-200 group-hover:h-[56%] group-focus-visible:h-[56%]';

const pad2 = (n: number): string => n.toString().padStart(2, '0');

const formatTimeAgo = (timestamp: number): string => {
  if (!timestamp) return '';
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const d = new Date(timestamp);
  const hhmm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if (days === 0) {
    if (hours === 0) return minutes <= 0 ? 'Just now' : `${minutes}m ago`;
    return `${hours}h ago`;
  }
  if (days === 1) return `Yesterday ${hhmm}`;
  if (days < 7) return `${days}d ago`;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${hhmm}`;
};

const formatTokens = (n: number): string => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};

const getTokenChip = (n: number): string => {
  if (n >= 500000) return 'text-error bg-error/15';
  if (n >= 50000) return 'text-warn bg-warn/15';
  if (n >= 10000) return 'text-success bg-success/15';
  return 'text-primary bg-primary/15';
};

export const HistoryCard = memo<HistoryCardProps>(({ item, onSelect }) => {
  const tokens = item.totalTokens ?? 0;

  return (
    <button
      type="button"
      onClick={() => {
        onSelect?.(item);
      }}
      className={CARD_CLASS}
    >
      <span className={ACCENT_CLASS} />

      <div className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center bg-text-primary/10 border border-border/60 text-text-secondary overflow-hidden">
        <img
          src={getFaviconUrl(item.url, 32)}
          alt=""
          className="w-3.5 h-3.5 rounded-[3px] object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-1 min-w-0 text-xs font-semibold leading-tight text-text-primary overflow-hidden whitespace-nowrap text-ellipsis">
            {item.title}
          </span>
          <span className="shrink-0 text-[10px] font-medium text-text-secondary">
            {formatTimeAgo(item.updatedAt)}
          </span>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          {item.modelId && (
            <span className="max-w-[50%] px-1.5 py-px rounded bg-text-primary/10 text-text-secondary text-[10px] font-medium leading-[15px] overflow-hidden whitespace-nowrap text-ellipsis">
              {item.modelId}
            </span>
          )}
          {item.messageCount != null && (
            <span className="shrink-0 text-[10px] font-medium text-text-secondary">
              {item.messageCount} msg
            </span>
          )}
          <span className="flex-1" />
          {tokens > 0 && (
            <span
              className={`inline-flex items-center gap-[3px] px-[7px] py-px rounded text-[10px] font-bold shrink-0 ${getTokenChip(tokens)}`}
              title={`${tokens.toLocaleString()} tokens`}
            >
              <Zap size={9} />
              {formatTokens(tokens)} tok
            </span>
          )}
        </div>
      </div>
    </button>
  );
});

HistoryCard.displayName = 'HistoryCard';
