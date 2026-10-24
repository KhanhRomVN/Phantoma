import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { $ } from '@renderer/utils/color';
import { useAgentRoot } from '@renderer/components/RightPanel/Zen/context/AgentRootContext';
import SelectModelAccountModal from '@renderer/components/RightPanel/Zen/components/MessageInput/SelectModelAccountModal';
import { useSettings } from '@renderer/components/RightPanel/Zen/context/SettingsContext';
import type { BaseRendererProps } from '@renderer/components/RightPanel/Zen/feature/Chat/types/renderer-types';

const CreateAgentRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  toolOutputs,
  onToolClick,
}) => {
  const { agent_type: agentType, agent_name: agentName, provider_id: providerId, model_id: modelId, account_id: accountId } = action.params;
  const actionId = `${messageId}-action-${actionIndex}`;
  const outputRaw = toolOutputs?.[actionId];
  const output = typeof outputRaw === 'string' ? outputRaw : JSON.stringify(outputRaw) || '';
  const error = output.includes('Error') ? output : undefined;
  const [showModelDrawer, setShowModelDrawer] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(providerId);
  const [selectedModel, setSelectedModel] = useState(modelId);
  const [selectedAccount, setSelectedAccount] = useState(accountId);
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const rootEl = useAgentRoot();
  const { apiUrl } = useSettings();

  const handleOpenModelDrawer = async () => {
    if (isActionClicked) return; // Don't allow changes after confirmation
    setIsLoadingProviders(true);
    try {
      const response = await fetch(`${apiUrl}/v1/providers`);
      const result = await response.json();
      if (result.success) {
        const enabled = result.data.filter((p: any) => p.is_enabled);
        setProviders(enabled);
      }
    } catch (err) {
      console.error('[CreateAgentRenderer] Failed to fetch providers:', err);
    } finally {
      setIsLoadingProviders(false);
    }
    setShowModelDrawer(true);
  };

  const handleSelectModel = (model: {
    providerId: string;
    modelId: string;
    accountId?: string;
  }) => {
    setSelectedProvider(model.providerId);
    setSelectedModel(model.modelId);
    if (model.accountId) setSelectedAccount(model.accountId);
    setShowModelDrawer(false);
  };

  const agentTypeLabel =
    agentType === 'executor'
      ? 'Executor'
      : agentType === 'planner'
        ? 'Planner'
        : agentType === 'reviewer'
          ? 'Reviewer'
          : agentType;

  const agentId = agentName
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '') || 'unknown';

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px',
          backgroundColor: $('--card-background'),
          borderRadius: '8px',
          border: `1px solid ${$('--border')}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: $('--primary'),
            }}
          >
            create_agent
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: $('--background'),
              borderRadius: '6px',
            }}
          >
            <span style={{ opacity: 0.7, minWidth: '80px' }}>Type:</span>
            <span style={{ fontWeight: 600, color: $('--text-primary') }}>{agentTypeLabel}</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: $('--background'),
              borderRadius: '6px',
            }}
          >
            <span style={{ opacity: 0.7, minWidth: '80px' }}>Name:</span>
            <span style={{ fontWeight: 600, color: $('--text-primary') }}>{agentName}</span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '11px',
                opacity: 0.6,
                fontFamily: 'monospace',
              }}
            >
              id: {agentId}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: $('--background'),
              borderRadius: '6px',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ opacity: 0.7, minWidth: '80px' }}>Provider:</span>
              <span style={{ color: $('--text-primary') }}>{selectedProvider}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ opacity: 0.7, minWidth: '80px' }}>Model:</span>
              <span style={{ color: $('--text-primary') }}>{selectedModel}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ opacity: 0.7, minWidth: '80px' }}>Account:</span>
              <span style={{ color: $('--text-primary') }}>{selectedAccount}</span>
            </div>
            <button
              onClick={handleOpenModelDrawer}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                color: $('--primary'),
                backgroundColor: 'transparent',
                border: `1px solid ${$('--primary')}`,
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--primary')} 10%, transparent)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Change
            </button>
          </div>
        </div>

        {error ? (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: `color-mix(in srgb, ${$('--error')} 10%, transparent)`,
              borderRadius: '6px',
              fontSize: '12px',
              color: $('--error'),
            }}
          >
            {error}
          </div>
        ) : (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: `color-mix(in srgb, ${$('--success')} 10%, transparent)`,
              borderRadius: '6px',
              fontSize: '12px',
              color: $('--success'),
            }}
          >
            {output}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end',
            paddingTop: '4px',
          }}
        >
          <button
            onClick={() => onToolClick?.(action, messageId, actionIndex, 'reject')}
            disabled={isActionClicked}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: $('--text-secondary'),
              backgroundColor: $('--button-soft-background'),
              border: 'none',
              borderRadius: '6px',
              cursor: isActionClicked ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isActionClicked ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isActionClicked) {
                e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--button-soft-background')} 80%, transparent)`;
                e.currentTarget.style.color = $('--text-primary');
              }
            }}
            onMouseLeave={(e) => {
              if (!isActionClicked) {
                e.currentTarget.style.backgroundColor = $('--button-soft-background');
                e.currentTarget.style.color = $('--text-secondary');
              }
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Update action params with selected model/account before executing
              const updatedAction = {
                ...action,
                params: {
                  ...action.params,
                  provider_id: selectedProvider,
                  model_id: selectedModel,
                  account_id: selectedAccount,
                },
              };
              onToolClick?.(updatedAction, messageId, actionIndex, 'accept');
            }}
            disabled={isActionClicked}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: $('--primary'),
              border: 'none',
              borderRadius: '6px',
              cursor: isActionClicked ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isActionClicked ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isActionClicked) {
                e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--primary')} 85%, #000)`;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActionClicked) {
                e.currentTarget.style.backgroundColor = $('--primary');
              }
            }}
          >
            {isActionClicked ? 'Creating...' : 'Confirm & Create'}
          </button>
        </div>
      </div>

      {showModelDrawer &&
        rootEl &&
        ReactDOM.createPortal(
          <SelectModelAccountModal
            isOpen={showModelDrawer}
            onClose={() => setShowModelDrawer(false)}
            providers={providers}
            isLoadingProviders={isLoadingProviders}
            apiUrl={apiUrl}
            currentProviderId={selectedProvider}
            currentModelId={selectedModel}
            currentAccountId={selectedAccount}
            onSelect={handleSelectModel}
          />,
          rootEl,
        )}
    </>
  );
};

export default CreateAgentRenderer;