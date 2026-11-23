import { Folder } from 'lucide-react';

interface NoSessionEmptyProps {
  label: string;
}

export function NoSessionEmpty({ label }: NoSessionEmptyProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3 opacity-70">
      <div className="w-12 h-12 rounded-xl bg-card-hover border border-border grid place-items-center text-text-secondary">
        <Folder className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary mb-1">No session selected</p>
        <p className="text-xs text-text-secondary max-w-[200px] mx-auto leading-relaxed">
          Select a session of a branch from the sidebar to use {label}.
        </p>
      </div>
    </div>
  );
}