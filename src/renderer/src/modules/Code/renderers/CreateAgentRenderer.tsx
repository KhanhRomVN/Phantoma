import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { ChevronRight, ClipboardList, Cpu, Hammer, ScanSearch, UserRound } from 'lucide-react';

import { cn } from '@renderer/shared/utils/cn';

// ── Constants ──
import { getToolLabel } from '@renderer/components/RightPanel/Zen/feature/Chat/constants/tag-registry';

// ── Utils ──
import { getNextUserMessage } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/renderer-utils';
import { getFaviconUrl } from '@renderer/shared/utils/faviconUtils';

// ── Context ──
import { useAgentRoot } from '@renderer/components/RightPanel/Zen/context/AgentRootContext';
import { useSettings } from '@renderer/components/RightPanel/Zen/context/SettingsContext';
import { useAgentFeature } from '@renderer/components/RightPanel/Zen/context/FeatureContext';

// ── Components ──
import { Button } from '@renderer/components/ui/Button';
import SelectModelAccountModal from '@renderer/components/RightPanel/Zen/components/MessageInput/SelectModelAccountModal';
import { splitModelAndEffort } from '@renderer/components/RightPanel/Zen/components/MessageInput/EffortDropdown';
import {
  accountsKey,
  cacheGet,
  cacheSet,
  providersKey,
} from '@renderer/components/RightPanel/Zen/components/MessageInput/providerModelCache';
import { TagHeader } from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/TagHeader';
import ErrorBlock from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/ErrorBlock';
import type { BaseRendererProps } from '@renderer/components/RightPanel/Zen/feature/Chat/types/renderer-types';

import { AGENT_TYPE_COLORS, type AgentType } from '../types/agents';

interface ModelSelection {
  providerId: string;
  modelId: string;
  accountId: string;
  email?: string;
  website?: string;
}

const AGENT_TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  executor: Hammer,
  planner: ClipboardList,
  reviewer: ScanSearch,
};

const LAST_MODEL_KEY = 'zen-create-agent-last-model';

type LastModel = ModelSelection;

const readLastModel = (key: string): LastModel | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as LastModel) : null;
  } catch {
    return null;
  }
};

const writeLastModel = (key: string, model: LastModel) => {
  try {
    localStorage.setItem(key, JSON.stringify(model));
  } catch {
    return;
  }
};

const CreateAgentRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
  allMessages,
  onToolClick,
}) => {
  const {
    agent_type: agentType = '',
    agent_name: agentName = '',
    _validationError: validationError,
  } = action.params || {};

  const actionId = `${messageId}-action-${actionIndex}`;
  const outputEntry = toolOutputs?.[actionId];
  const output = outputEntry?.output || '';
  const isError = !!outputEntry?.isError || !!validationError;
  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);
  const isCompleted = !!outputEntry || isActionClicked || isError || !!nextUserMessage;
  const isCreating = isActionClicked && !outputEntry;

  const [showModelDrawer, setShowModelDrawer] = useState(false);
  const [selection, setSelection] = useState<ModelSelection | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const { codeState } = useAgentFeature();
  const storageKey = `${LAST_MODEL_KEY}:${codeState.currentProjectId ?? 'default'}:${agentType || 'agent'}`;
  const lastUsed = useMemo(() => readLastModel(storageKey), [storageKey]);
  const [resolvedLast, setResolvedLast] = useState<ModelSelection | null>(null);
  const preferred = selection ?? resolvedLast ?? lastUsed;
  const effective: ModelSelection | null = selection ?? resolvedLast ?? lastUsed;
  const rootEl = useAgentRoot();
  const { apiUrl } = useSettings();

  useEffect(() => {
    if (!lastUsed || isCompleted || !apiUrl) return;
    if (lastUsed.email && lastUsed.website) {
      setResolvedLast(lastUsed);
      return;
    }
    let alive = true;
    const resolve = async () => {
      let website = lastUsed.website;
      let email = lastUsed.email;
      try {
        if (!website) {
          let list = cacheGet<any[]>(providersKey('default'));
          if (!list) {
            const res = await (await fetch(`${apiUrl}/v1/providers`)).json();
            if (res.success) {
              list = res.data.filter((p: any) => p.is_enabled);
              cacheSet(providersKey('default'), list);
            }
          }
          website = list?.find((p) => p.provider_id === lastUsed.providerId)?.website;
        }
        if (!email) {
          const key = accountsKey('default', lastUsed.providerId);
          let accounts = cacheGet<any[]>(key);
          if (!accounts) {
            const res = await (
              await fetch(
                `${apiUrl}/v1/accounts?page=1&limit=50&provider_id=${encodeURIComponent(lastUsed.providerId)}`,
              )
            ).json();
            if (res.success && res.data?.accounts) {
              accounts = res.data.accounts;
              cacheSet(key, accounts);
            }
          }
          email = accounts?.find((a) => a.id === lastUsed.accountId)?.email;
        }
      } catch (err) {
        console.error('[CreateAgentRenderer] Failed to resolve last used model:', err);
      }
      if (alive) setResolvedLast({ ...lastUsed, website, email });
    };
    resolve();
    return () => {
      alive = false;
    };
  }, [lastUsed, isCompleted, apiUrl]);

  const agentTypeLabel = agentType ? agentType.charAt(0).toUpperCase() + agentType.slice(1) : '';
  const typeColor = AGENT_TYPE_COLORS[agentType as AgentType] || 'rgb(106, 122, 154)';
  const TypeIcon = AGENT_TYPE_ICONS[agentType] || UserRound;
  const canConfirm = !isCompleted && !!agentType && !!agentName && !!effective;
  const canPickModel = !isCompleted && !isLoadingProviders;

  const handleOpenModelDrawer = async () => {
    if (!canPickModel) return;
    const cacheKey = providersKey('default');
    const cached = cacheGet<any[]>(cacheKey);
    if (cached) setProviders(cached);
    else setIsLoadingProviders(true);
    setShowModelDrawer(true);
    try {
      const response = await fetch(`${apiUrl}/v1/providers`);
      const result = await response.json();
      if (result.success) {
        const enabled = result.data.filter((p: any) => p.is_enabled);
        cacheSet(cacheKey, enabled);
        setProviders(enabled);
      }
    } catch (err) {
      console.error('[CreateAgentRenderer] Failed to fetch providers:', err);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const handleSelectModel = (model: {
    providerId: string;
    modelId: string;
    accountId?: string;
    email?: string;
  }) => {
    if (!model.accountId) {
      console.warn('[DEBUG][CreateAgentRenderer] selected model has no accountId, ignoring');
      return;
    }
    const provider = providers.find((p) => p.provider_id === model.providerId);
    setSelection({
      providerId: model.providerId,
      modelId: model.modelId,
      accountId: model.accountId,
      email: model.email,
      website: provider?.website,
    });
    setShowModelDrawer(false);
  };

  const handleConfirm = () => {
    if (!canConfirm || !effective) {
      console.warn('[DEBUG][CreateAgentRenderer] confirm blocked: model/account not selected');
      return;
    }
    const updatedAction = {
      ...action,
      params: {
        ...action.params,
        provider_id: effective.providerId,
        model_id: effective.modelId,
        account_id: effective.accountId,
        account_email: effective.email,
      },
    };
    const used: LastModel = {
      providerId: effective.providerId,
      modelId: effective.modelId,
      accountId: effective.accountId,
      email: effective.email,
      website: effective.website,
    };
    writeLastModel(storageKey, used);
    onToolClick?.(updatedAction, messageId, actionIndex, 'accept');
  };

  const handleCancel = () => {
    onToolClick?.(action, messageId, actionIndex, 'reject');
  };

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span className="font-semibold opacity-80 shrink-0">
              {getToolLabel('create_agent')}
            </span>
            {isCreating && (
              <span className="text-[10px] opacity-55 flex items-center gap-1 shrink-0 ml-auto">
                <span className="codicon codicon-loading codicon-modifier-spin text-[10px]" />
                Creating...
              </span>
            )}
          </div>
        }
        statusColor={
          isError ? 'rgb(255, 45, 85)' : isCompleted ? 'rgb(48, 209, 88)' : 'rgb(106, 122, 154)'
        }
        isError={isError}
        isPartial={isCreating}
        isWaitingApproval={!!isActiveGroup && !isCompleted}
        toolType="create_agent"
        compactPath
      />

      {isError ? (
        <ErrorBlock
          content={output || validationError || 'Create agent failed'}
          compact={true}
          maxHeight="300px"
        />
      ) : (
        <button
          type="button"
          disabled={!canPickModel}
          onClick={handleOpenModelDrawer}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 mt-0.5 text-left bg-background border rounded-[6px] transition-colors duration-100',
            canPickModel ? 'cursor-pointer hover:bg-text-secondary/5' : 'cursor-default',
          )}
        >
          <div
            className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: `color-mix(in srgb, ${typeColor} 16%, transparent)` }}
          >
            <TypeIcon size={18} color={typeColor} />
          </div>

          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0 text-[12px] leading-[1.3]">
              <span className="font-semibold shrink-0" style={{ color: typeColor }}>
                {agentTypeLabel || 'Agent'}
              </span>
              <span className="text-text-secondary opacity-50 shrink-0">·</span>
              <span className="font-semibold text-text-primary truncate">{agentName || '—'}</span>
            </div>

            {effective ? (
              <div className="flex items-center gap-1.5 min-w-0 text-[11px] leading-[1.3]">
                {effective.website ? (
                  <img
                    src={getFaviconUrl(effective.website, 32)}
                    alt=""
                    className="w-3.5 h-3.5 shrink-0 rounded-[2px]"
                  />
                ) : (
                  <Cpu size={12} className="shrink-0 text-text-secondary opacity-70" />
                )}
                <span className="font-mono text-text-primary truncate">
                  {effective.providerId}/{effective.modelId}
                </span>
                {effective.email && (
                  <span className="font-mono text-text-secondary opacity-60 truncate">
                    {effective.email}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-[11px] leading-[1.3] text-text-secondary opacity-70">
                {isLoadingProviders ? 'Loading models...' : 'Choose model & account'}
              </div>
            )}
          </div>

          {canPickModel && (
            <ChevronRight size={14} className="shrink-0 text-text-secondary opacity-60" />
          )}
        </button>
      )}

      {!isCompleted && !isError && (
        <div className="flex justify-end gap-2 pt-0.5">
          <Button
            size="sm"
            className="bg-button-soft-background text-text-secondary hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70 disabled:hover:bg-button-soft-background"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button variant="soft" size="sm" onClick={handleConfirm} disabled={!canConfirm}>
            Create agent
          </Button>
        </div>
      )}

      {showModelDrawer &&
        rootEl &&
        ReactDOM.createPortal(
          <SelectModelAccountModal
            isOpen={showModelDrawer}
            onClose={() => setShowModelDrawer(false)}
            providers={providers}
            isLoadingProviders={isLoadingProviders}
            apiUrl={apiUrl}
            currentProviderId={preferred?.providerId}
            currentModelId={preferred?.modelId}
            currentAccountId={preferred?.accountId}
            currentEffort={
              preferred ? (splitModelAndEffort(preferred.modelId).effort ?? undefined) : undefined
            }
            showEffort
            onSelect={handleSelectModel}
          />,
          rootEl,
        )}
    </div>
  );
};

export default CreateAgentRenderer;
