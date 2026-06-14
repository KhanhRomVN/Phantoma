import React from 'react';
import { NetworkRequest } from '../../../../types/inspector';
import { cn } from '../../../../../../shared/lib/utils';
import { ShieldCheck, ShieldX, Info, AlertTriangle, ShieldAlert, Navigation } from 'lucide-react';

// Custom ContextMenu components
interface ContextMenuProps {
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

const ContextMenu = ({ children, onOpenChange }: ContextMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) {
      onOpenChange?.(false);
      return;
    }
    onOpenChange?.(true);

    const handleClickOutside = (e: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onOpenChange]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setOpen(true);
  };

  const childrenArray = React.Children.toArray(children);
  const trigger = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as any) === ContextMenuTrigger,
  );
  const content = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as any) === ContextMenuContent,
  );

  return (
    <>
      <div ref={triggerRef} onContextMenu={handleContextMenu}>
        {trigger}
      </div>
      {open && content && (
        <div
          ref={contentRef}
          style={{
            position: 'fixed',
            top: position.y,
            left: position.x,
            zIndex: 9999,
          }}
        >
          {content}
        </div>
      )}
    </>
  );
};

const ContextMenuTrigger = ({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) => {
  if (asChild) return <>{children}</>;
  return <div>{children}</div>;
};

const ContextMenuContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'bg-zinc-900 border border-zinc-700 rounded-md shadow-lg py-1 min-w-[160px]',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
};

const ContextMenuItem = ({
  children,
  onClick,
  className,
  onSelect,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  onSelect?: () => void;
}) => {
  const handleClick = () => {
    if (onSelect) onSelect();
    if (onClick) onClick();
  };
  return (
    <div
      className={cn(
        'px-3 py-1.5 text-sm hover:bg-zinc-800 cursor-pointer flex items-center',
        className,
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};

const SEV: Record<SecuritySeverity, { label: string; badge: string; icon: React.ElementType }> = {
  high: { label: 'High', badge: 'bg-red-500/15 text-red-400 border-red-500/30', icon: ShieldX },
  medium: {
    label: 'Medium',
    badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    icon: AlertTriangle,
  },
  low: {
    label: 'Low',
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    icon: ShieldAlert,
  },
  info: { label: 'Info', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Info },
};

const SEV_ORDER: SecuritySeverity[] = ['high', 'medium', 'low', 'info'];

const ISSUE_TAB: Record<string, 'headers' | 'body'> = {
  'missing-hsts': 'headers',
  'hsts-no-maxage': 'headers',
  'hsts-short-maxage': 'headers',
  'missing-xcto': 'headers',
  'missing-xfo': 'headers',
  'missing-csp': 'headers',
  'csp-unsafe-inline': 'headers',
  'csp-unsafe-eval': 'headers',
  'csp-wildcard': 'headers',
  'missing-referrer-policy': 'headers',
  'weak-referrer-policy': 'headers',
  'missing-permissions-policy': 'headers',
  'missing-xxp': 'headers',
  'xxp-disabled': 'headers',
  'cookie-no-secure': 'headers',
  'cookie-no-httponly': 'headers',
  'cookie-no-samesite': 'headers',
  'cookie-samesite-none-no-secure': 'headers',
  'cookie-long-expiry': 'headers',
  'basic-auth': 'headers',
  'cors-wildcard': 'headers',
  'cors-wildcard-credentials': 'headers',
  'cors-reflect-origin': 'headers',
  'server-version': 'headers',
  'x-powered-by': 'headers',
  'aspnet-version': 'headers',
  'sensitive-cacheable': 'headers',
  'missing-corp': 'headers',
  'missing-coop': 'headers',
  'missing-coep': 'headers',
  'hpkp-deprecated': 'headers',
  'trace-in-cors-methods': 'headers',
  'dangerous-methods-exposed': 'headers',
  'sensitive-in-url': 'headers',
  'no-auth': 'headers',
  'stack-trace': 'body',
  'sql-error': 'body',
  'mixed-content': 'body',
  'missing-sri': 'body',
};

const COL = { sev: 90, issue: 200, evidence: 180 };

function IssueRow({
  issue,
  onJump,
}: {
  issue: SecurityIssue;
  onJump?: (tab: 'headers' | 'body', term: string) => void;
}) {
  const cfg = SEV[issue.severity];
  const Icon = cfg.icon;
  const tab = ISSUE_TAB[issue.id];
  const canJump = !!tab && !!issue.evidence && !!onJump;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex items-center border-b border-divider/20 hover:bg-secondary/30 transition-colors text-xs cursor-default">
          <div className="shrink-0 px-3 py-2" style={{ width: COL.sev }}>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border',
                cfg.badge,
              )}
            >
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
          </div>
          <div
            className="shrink-0 px-3 py-2 font-medium text-text-primary"
            style={{ width: COL.issue }}
          >
            {issue.title}
          </div>
          <div className="flex-1 px-3 py-2 text-text-secondary">{issue.description}</div>
          <div className="shrink-0 px-3 py-2" style={{ width: COL.evidence }}>
            {issue.evidence ? (
              <code className="text-[10px] font-mono text-text-secondary truncate block">
                {issue.evidence}
              </code>
            ) : (
              <span className="text-[10px] text-text-secondary/30">—</span>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      {canJump && (
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={() => onJump!(tab!, issue.evidence!)}>
            <Navigation className="mr-2 h-3.5 w-3.5 text-primary" />
            Go to {tab === 'headers' ? 'Headers' : 'Body'}
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}

export function SecurityDetails({
  request,
  onJumpToEvidence,
}: {
  request: NetworkRequest;
  onJumpToEvidence?: (tab: 'headers' | 'body', term: string) => void;
}) {
  const issues = request.securityIssues || [];

  if (issues.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-text-secondary">
        <ShieldCheck className="w-7 h-7 text-success" />
        <span className="text-xs">No security issues detected</span>
      </div>
    );
  }

  const sorted = SEV_ORDER.flatMap((sev) => issues.filter((i) => i.severity === sev));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex shrink-0 border-b border-divider/30 bg-table-headerBg text-[10px] uppercase text-text-secondary font-semibold">
        <div className="shrink-0 px-3 py-2" style={{ width: COL.sev }}>
          Severity
        </div>
        <div className="shrink-0 px-3 py-2" style={{ width: COL.issue }}>
          Issue
        </div>
        <div className="flex-1 px-3 py-2">Description</div>
        <div className="shrink-0 px-3 py-2" style={{ width: COL.evidence }}>
          Evidence
        </div>
      </div>
      {/* Rows */}
      <div className="flex-1 overflow-auto">
        {sorted.map((issue) => (
          <IssueRow key={issue.id} issue={issue} onJump={onJumpToEvidence} />
        ))}
      </div>
    </div>
  );
}
