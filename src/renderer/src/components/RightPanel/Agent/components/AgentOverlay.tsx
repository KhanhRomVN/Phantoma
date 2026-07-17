import React, { useEffect, useState } from 'react';
import { Bot, ShieldAlert } from 'lucide-react';

interface AgentOverlayProps {
  featureName?: string;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

const AgentOverlay: React.FC<AgentOverlayProps> = ({ featureName, title, description, icon }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const defaultTitle = featureName
    ? `Module "${featureName}" does not support the Agent feature.`
    : 'Agent Not Available';

  const defaultDescription = featureName
    ? `Module "${featureName}" does not support the Agent feature.`
    : 'This module does not support the Agent feature.';

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-[12px] bg-background/40 z-50 p-8">
      <div
        className={`flex flex-col items-center gap-5 max-w-[400px] w-full transition-all duration-500 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Icon Container */}
        <div className="relative">
          <div className="flex items-center justify-center w-20 h-20 rounded-md bg-primary/10 border-2 border-dashed border-primary/30 shadow-lg shadow-primary/5">
            {icon || <ShieldAlert className="w-10 h-10 text-primary/90" />}
          </div>
        </div>
        {/* Text Content */}
        <div className="text-center flex flex-col gap-2.5">
          <h3 className="text-[17px] font-semibold tracking-tight text-primary m-0 leading-snug">
            {title || defaultTitle}
          </h3>
          <p className="text-sm text-secondary/80 m-0 leading-relaxed max-w-[340px]">
            {description || defaultDescription}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentOverlay;
