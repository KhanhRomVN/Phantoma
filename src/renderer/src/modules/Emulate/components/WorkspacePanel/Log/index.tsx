import { ScrollText } from 'lucide-react';

export function LogViewer() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-text-secondary">
      <ScrollText className="w-8 h-8 stroke-[1.4]" />
      <p className="text-sm font-medium text-text-primary">Under development</p>
      <p className="text-xs">Log viewer is coming soon.</p>
    </div>
  );
}

export default LogViewer;