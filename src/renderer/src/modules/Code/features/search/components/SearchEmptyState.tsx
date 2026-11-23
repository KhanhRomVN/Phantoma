import { Search as SearchIcon, Folder, X, AlertCircle } from 'lucide-react';

export type EmptyVariant = 'no-project' | 'idle' | 'no-results' | 'error';

const CONFIG = {
  'no-project': {
    icon: Folder,
    title: 'No project selected',
    hint: 'Open a project to search its files.',
  },
  idle: {
    icon: SearchIcon,
    title: 'Ready to search',
    hint: 'Type a keyword above to find matches in your project files.',
  },
  'no-results': {
    icon: X,
    title: 'No results found',
    hint: 'Try adjusting your query or removing filters.',
  },
  error: {
    icon: AlertCircle,
    title: 'Search failed',
    hint: 'Something went wrong while searching.',
  },
} as const;

interface SearchEmptyStateProps {
  variant: EmptyVariant;
  message?: string | null;
}

export function SearchEmptyState({ variant, message }: SearchEmptyStateProps) {
  const { icon: Icon, title, hint } = CONFIG[variant];
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3 opacity-70">
      <div className="w-12 h-12 rounded-xl bg-card-hover border border-border grid place-items-center text-text-secondary">
        <Icon className="w-6 h-6" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary mb-1">{title}</p>
        <p className="text-xs text-text-secondary max-w-[200px] mx-auto leading-relaxed break-words">
          {message || hint}
        </p>
      </div>
    </div>
  );
}