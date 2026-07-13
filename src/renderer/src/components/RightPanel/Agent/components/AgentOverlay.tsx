import React from 'react';
import { Bot, ShieldAlert } from 'lucide-react';

interface AgentOverlayProps {
  featureName?: string;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  showEmulateHint?: boolean;
}

const AgentOverlay: React.FC<AgentOverlayProps> = ({
  featureName,
  title,
  description,
  icon,
  showEmulateHint = true,
}) => {
  const defaultTitle = featureName
    ? `Module "${featureName}" does not support the Agent feature.`
    : 'Agent Not Available';

  const defaultDescription = featureName
    ? `Module "${featureName}" does not support the Agent feature.`
    : 'This module does not support the Agent feature.';

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-[8px] z-50 gap-4 p-8">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-error/15 border-2 border-error/30">
        {icon || <ShieldAlert className="w-8 h-8 text-error opacity-80" />}
      </div>

      <div className="text-center flex flex-col gap-2">
        <h3 className="text-base font-semibold text-primary m-0">{title || defaultTitle}</h3>
        <p className="text-[13px] text-secondary m-0 leading-relaxed max-w-[320px]">
          {description || defaultDescription}
        </p>
        {showEmulateHint && (
          <p className="text-xs text-secondary m-0 leading-relaxed max-w-[320px]">
            Switch to <strong>Emulate</strong> to enable AI-powered HTTP traffic analysis with the
            Agent.
          </p>
        )}
      </div>

      {showEmulateHint && (
        <div className="flex items-center gap-1.5 py-1.5 px-3 rounded-md mt-2 bg-primary/10 border border-primary/20">
          <Bot className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] text-primary font-medium">Available in: Emulate</span>
        </div>
      )}
    </div>
  );
};

export default AgentOverlay;
