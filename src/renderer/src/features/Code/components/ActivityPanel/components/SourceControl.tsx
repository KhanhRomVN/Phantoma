import { GitBranch, GitCommit, GitPullRequest } from "lucide-react";

export function SourceControl() {
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="text-xs font-medium text-text-secondary/60 mb-3">Source Control</div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 px-3 py-2 bg-input-background border border-border rounded-lg text-sm text-text-secondary">
          <GitBranch className="w-3.5 h-3.5 text-text-secondary/40" strokeWidth={1.5} />
          <span>main</span>
          <span className="ml-auto text-xs text-text-secondary/40">✓ up to date</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary/40">
          <GitCommit className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>No changes</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary/40">
          <GitPullRequest className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>No pull requests</span>
        </div>
      </div>
    </div>
  );
}