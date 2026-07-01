import React from 'react';
import { Bot, ShieldAlert } from 'lucide-react';

interface AgentOverlayProps {
  featureName?: string;
}

const AgentOverlay: React.FC<AgentOverlayProps> = ({ featureName }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--secondary-bg)] backdrop-blur-[8px] z-50 gap-4 p-8">
      <div
        className="flex items-center justify-center w-16 h-16 rounded-full"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--error, #f87171) 15%, transparent)',
          border: '2px solid color-mix(in srgb, var(--error, #f87171) 30%, transparent)',
        }}
      >
        <ShieldAlert className="w-8 h-8 text-error opacity-80" />
      </div>

      <div className="text-center flex flex-col gap-2">
        <h3 className="text-base font-semibold text-primary m-0">
          Agent Not Available
        </h3>
        <p className="text-[13px] text-secondary m-0 leading-relaxed max-w-[320px]">
          {featureName
            ? `Module "${featureName}" does not support the Agent feature.`
            : 'This module does not support the Agent feature.'}
        </p>
        <p className="text-xs text-secondary m-0 leading-relaxed max-w-[320px]">
          Switch to <strong>Emulate</strong> to enable AI-powered HTTP traffic
          analysis with the Agent.
        </p>
      </div>

      <div
        className="flex items-center gap-1.5 py-1.5 px-3 rounded-md mt-2"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--primary, #3b82f6) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--primary, #3b82f6) 20%, transparent)',
        }}
      >
        <Bot className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] text-primary font-medium">
          Available in: Emulate
        </span>
      </div>
    </div>
  );
};

export default AgentOverlay;