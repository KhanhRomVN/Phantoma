import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';

import { AgentPanel as ZenAgentPanel } from '@renderer/components/Widgets/Zen';
import { MarkdownRenderer } from '@renderer/components/Widgets/Zen/feature/Chat/components/ChatBody/AIMessageBox/renderers/MarkdownRenderer';
import { TagHeader } from '@renderer/components/Widgets/Zen/feature/Chat/components/ChatBody/AIMessageBox/TagHeader';
import { SettingsProvider } from '@renderer/components/Widgets/Zen/context/SettingsContext';
import {
  AccountAgentsContext,
  WorkflowAgentContext,
  parseAgentMessage,
  type WorkflowAgentSync,
} from '@renderer/components/Widgets/Zen/context/WorkflowAgentContext';
import {
  MultiAgentContext,
  type MultiAgentControl,
} from '@renderer/components/Widgets/Zen/context/MultiAgentContext';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { cn } from '@renderer/utils/cn';

import {
  EMPTY_EMULATE_AGENT_CONFIG,
  ORCHESTRATOR_ID,
  useEmulateWorkflowStore,
  type EmulateTab,
} from '../../stores/emulate-workflow.store';

const zenLogoUrl = `${(window as any).__zenImagesUri || '/images'}/zen-logo.png`;

const IncomingMessage = ({ message }: { message: { id: string; content: string } }) => {
  const parsed = parseAgentMessage(message.content);
  const [collapsed, setCollapsed] = useState(true);
  const sender = useEmulateWorkflowStore((s) => s.agents.find((a) => a.id === parsed?.from));
  if (!parsed) return null;

  return (
    <div className="flex flex-col gap-1.5 mb-2">
      <TagHeader
        title={
          <div className="flex items-center gap-1.5 text-xs text-text-primary">
            <span className="font-semibold opacity-80 shrink-0">RECEIVE MESSAGE</span>
            <span className="opacity-40 shrink-0">·</span>
            <span className="font-semibold truncate" style={{ color: sender?.color }}>
              {sender?.name ?? parsed.from}
            </span>
          </div>
        }
        statusColor="rgb(48, 209, 88)"
        onClick={() => setCollapsed((v) => !v)}
        compactPath
        path=""
      />
      {!collapsed && (
        <div className="max-h-[360px] overflow-y-auto pl-3 pr-2.5 py-1.5 bg-card-background rounded-r-[4px] rounded-l-[1px]">
          <MarkdownRenderer content={parsed.body} />
        </div>
      )}
    </div>
  );
};

const renderIncomingMessage: WorkflowAgentSync['renderIncomingMessage'] = (message) =>
  parseAgentMessage(message.content) ? <IncomingMessage message={message} /> : null;

interface EmulateAgentTabProps {
  tab: EmulateTab;
}

const EmulateAgentTab = memo(function EmulateAgentTab({ tab }: EmulateAgentTabProps) {
  const agentId = tab.agentId;
  const agent = useEmulateWorkflowStore((s) =>
    agentId ? s.agents.find((a) => a.id === agentId) : undefined,
  );
  const config =
    useEmulateWorkflowStore((s) => (agentId ? s.configs[agentId] : undefined)) ??
    EMPTY_EMULATE_AGENT_CONFIG;
  const inbox = useEmulateWorkflowStore((s) => (agentId ? s.inbox[agentId] : undefined));
  const allAgents = useEmulateWorkflowStore((s) => s.agents);
  const allConfigs = useEmulateWorkflowStore((s) => s.configs);
  const orchestratorTaken = useEmulateWorkflowStore((s) =>
    s.tabs.some((t) => t.agentId === ORCHESTRATOR_ID),
  );

  const accountAgents = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const a of allAgents) {
      const acc = allConfigs[a.id]?.account;
      const accId = acc?.id ?? acc?.accountId ?? acc?.account_id;
      if (!accId) continue;
      (map[accId] ??= []).push(a.type);
    }
    return map;
  }, [allConfigs, allAgents]);

  const shiftInbox = useCallback(() => {
    if (agentId) useEmulateWorkflowStore.getState().shiftInbox(agentId);
  }, [agentId]);

  const notifyUserMessage = useCallback(
    (content: string) => {
      if (!agentId || agentId === ORCHESTRATOR_ID) return;
      useEmulateWorkflowStore.getState().enqueueInbox(ORCHESTRATOR_ID, { from: agentId, content });
    },
    [agentId],
  );

  const setSyncModel = useCallback(
    (model: any) => {
      if (agentId) useEmulateWorkflowStore.getState().setModel(agentId, model);
    },
    [agentId],
  );
  const setSyncAccount = useCallback(
    (account: any) => {
      if (agentId) useEmulateWorkflowStore.getState().setAccount(agentId, account);
    },
    [agentId],
  );

  const normalizedModel = useMemo(() => {
    const m = config.model;
    if (!m || m.id) return m;
    const id = m.modelId ?? m.model_id;
    return id ? { ...m, id, name: m.name ?? id } : m;
  }, [config.model]);
  const normalizedAccount = useMemo(() => {
    const a = config.account;
    if (!a || a.id) return a;
    const id = a.accountId ?? a.account_id;
    return id ? { ...a, id } : a;
  }, [config.account]);

  const workflowSync = useMemo<WorkflowAgentSync | null>(
    () =>
      agentId
        ? {
            agentId,
            agentType: agent?.type,
            model: normalizedModel,
            account: normalizedAccount,
            accountAgents,
            setModel: setSyncModel,
            setAccount: setSyncAccount,
            inbox,
            shiftInbox,
            notifyUserMessage,
            renderIncomingMessage,
          }
        : null,
    [
      agentId,
      agent?.type,
      normalizedModel,
      normalizedAccount,
      accountAgents,
      setSyncModel,
      setSyncAccount,
      inbox,
      shiftInbox,
      notifyUserMessage,
    ],
  );

  const multiAgent = useMemo<MultiAgentControl | null>(() => {
    if (agentId && agentId !== ORCHESTRATOR_ID) return null;
    const enabled = agentId === ORCHESTRATOR_ID;
    return {
      enabled,
      blocked: !enabled && orchestratorTaken,
      toggle: () => useEmulateWorkflowStore.getState().toggleOrchestrator(tab.id),
    };
  }, [agentId, orchestratorTaken, tab.id]);

  return (
    <MultiAgentContext.Provider value={multiAgent}>
      <AccountAgentsContext.Provider value={accountAgents}>
        <WorkflowAgentContext.Provider value={workflowSync}>
          <ZenAgentPanel feature="emulate" />
        </WorkflowAgentContext.Provider>
      </AccountAgentsContext.Provider>
    </MultiAgentContext.Provider>
  );
});

interface AgentPanelProps {
  disabled?: boolean;
}

export function AgentPanel({ disabled = false }: AgentPanelProps) {
  const tabs = useEmulateWorkflowStore((s) => s.tabs);
  const activeId = useEmulateWorkflowStore((s) => s.activeTabId);
  const agents = useEmulateWorkflowStore((s) => s.agents);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [overflowIds, setOverflowIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const colorOf = (agentId?: string) => agents.find((a) => a.id === agentId)?.color;

  const measureOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const viewLeft = el.scrollLeft;
    const viewRight = viewLeft + el.clientWidth;
    const ids: string[] = [];
    el.querySelectorAll<HTMLElement>('[data-tab-id]').forEach((node) => {
      const left = node.offsetLeft;
      const right = left + node.offsetWidth;
      if (left < viewLeft - 1 || right > viewRight + 1) ids.push(node.dataset.tabId as string);
    });
    setOverflowIds((prev) =>
      prev.length === ids.length && prev.every((v, i) => v === ids[i]) ? prev : ids,
    );
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    measureOverflow();
    const observer = new ResizeObserver(measureOverflow);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    el.addEventListener('scroll', measureOverflow);
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', measureOverflow);
    };
  }, [tabs, measureOverflow]);

  useEffect(() => {
    scrollRef.current
      ?.querySelector<HTMLElement>(`[data-tab-id="${activeId}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeId]);

  const overflowTabs = tabs.filter((t) => overflowIds.includes(t.id));
  const { setActiveTab, closeTab, addPlainTab } = useEmulateWorkflowStore.getState();

  return (
    <SettingsProvider>
      <div className="flex h-full flex-col">
        <div className="h-9 w-full shrink-0 flex items-end bg-panel-background border-b border-border">
          <div
            ref={scrollRef}
            onWheel={(e) => {
              if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY || e.deltaX;
            }}
            className="relative flex items-end min-w-0 overflow-x-hidden"
          >
            {tabs.map((tab) => (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'group/tab h-9 px-3 flex items-center gap-2 shrink-0 transition-colors text-[13px] relative cursor-pointer select-none',
                  'border-r border-border',
                  activeId === tab.id
                    ? 'bg-card-background text-text-primary border-b-2 border-b-primary/80'
                    : 'bg-panel-background text-text-secondary hover:bg-white/[0.03]',
                )}
              >
                <img
                  src={zenLogoUrl}
                  alt="Zen"
                  className="w-3.5 h-3.5 shrink-0 object-contain"
                  style={{ pointerEvents: 'none' }}
                  draggable={false}
                />
                <span className="whitespace-nowrap" style={{ color: colorOf(tab.agentId) }}>
                  {tab.title}
                </span>
                {tabs.length > 1 && (
                  <button
                    disabled={disabled}
                    className="w-4 h-4 flex items-center justify-center rounded hover:bg-white/[0.1] text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:pointer-events-none"
                    aria-label="Close tab"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {overflowTabs.length > 0 && (
            <Dropdown
              open={overflowOpen}
              onOpenChange={setOverflowOpen}
              align="end"
              side="bottom"
              sideOffset={4}
              width={200}
              className="shrink-0"
            >
              <DropdownTrigger asChild>
                <button
                  className="h-9 min-w-9 px-2 flex items-center justify-center border border-dashed border-primary/50 text-primary text-[11px] font-semibold hover:bg-white/[0.05] transition-colors"
                  aria-label={`${overflowTabs.length} hidden tabs`}
                >
                  {overflowTabs.length}
                </button>
              </DropdownTrigger>
              <DropdownContent>
                {overflowTabs.map((tab) => (
                  <DropdownItem
                    key={tab.id}
                    icon={
                      <img
                        src={zenLogoUrl}
                        alt=""
                        className="w-4 h-4 object-contain"
                        draggable={false}
                      />
                    }
                    className={cn(tab.id === activeId && 'bg-white/[0.06]')}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="truncate">{tab.title}</span>
                  </DropdownItem>
                ))}
              </DropdownContent>
            </Dropdown>
          )}

          <button
            disabled={disabled}
            className="h-9 w-9 flex items-center justify-center hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Add tab"
            onClick={addPlainTab}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {tabs.map((tab) => (
            <div key={tab.id} className={cn('h-full', activeId === tab.id ? 'block' : 'hidden')}>
              <EmulateAgentTab tab={tab} />
            </div>
          ))}
        </div>
      </div>
    </SettingsProvider>
  );
}

export default AgentPanel;
