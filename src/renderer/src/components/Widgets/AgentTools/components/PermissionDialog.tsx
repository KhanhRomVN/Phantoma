import { memo } from 'react';
import { useAgentToolStore } from '../hooks/useAgentToolStore';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@renderer/utils/cn';

interface PermissionDialogProps {
  className?: string;
}

export const PermissionDialog = memo<PermissionDialogProps>(({ className }) => {
  const { pendingPermissions, resolvePermission } = useAgentToolStore();

  if (pendingPermissions.length === 0) {
    return null;
  }

  // Show only the first pending permission
  const request = pendingPermissions[0];

  const handleResolve = (approved: boolean) => {
    resolvePermission(request.id, approved);
  };

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center', className)}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => handleResolve(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-background border border-border rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-background-subtle border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex-none w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <AlertTriangle size={20} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-text-primary">Permission Required</h2>
                {request.serverName && (
                  <p className="text-sm text-text-secondary">{request.serverName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <p className="text-sm text-text-primary whitespace-pre-wrap">{request.question}</p>

            {/* Queue indicator */}
            {pendingPermissions.length > 1 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-text-faint">
                  {pendingPermissions.length - 1} more permission
                  {pendingPermissions.length > 2 ? 's' : ''} pending
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-background-subtle border-t border-border px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={() => handleResolve(false)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                'bg-card-background text-text-secondary',
                'hover:bg-background hover:text-text-primary',
                'border border-border',
              )}
            >
              Deny
            </button>
            <button
              onClick={() => handleResolve(true)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                'bg-button-soft-background text-text-primary',
                'hover:bg-button-soft-background/80',
              )}
            >
              Allow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

PermissionDialog.displayName = 'PermissionDialog';
