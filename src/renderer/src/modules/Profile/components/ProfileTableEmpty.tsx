import { Plus, Search, Users, X } from 'lucide-react';
import { Button } from '@renderer/components/ui/Button';

interface ProfileTableEmptyProps {
  filteredOut: boolean;
  onClearFilters?: () => void;
  onAddProfile?: () => void;
}

const SOFT_BTN =
  'rounded-md bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary active:bg-text-secondary/20';

export function ProfileTableEmpty({ filteredOut, onClearFilters, onAddProfile }: ProfileTableEmptyProps) {
  const Icon = filteredOut ? Search : Users;
  return (
    <div className="animate-in fade-in-0 zoom-in-95 duration-300 flex flex-col items-center justify-center gap-4 py-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-border bg-text-secondary/10 text-text-secondary">
        <Icon className="h-7 w-7" />
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-text-primary">
          {filteredOut ? 'No profiles match' : 'No profiles yet'}
        </span>
        <span className="max-w-[280px] text-xs text-text-secondary">
          {filteredOut
            ? 'Try changing the search, quick filters or the active query.'
            : 'Add a profile or import a list to get started.'}
        </span>
      </div>
      {filteredOut && onClearFilters && (
        <Button className={SOFT_BTN} onClick={onClearFilters}>
          <X className="h-3.5 w-3.5" />
          Clear filters
        </Button>
      )}
      {!filteredOut && onAddProfile && (
        <Button className={SOFT_BTN} onClick={onAddProfile}>
          <Plus className="h-3.5 w-3.5" />
          Add profile
        </Button>
      )}
    </div>
  );
}

export default ProfileTableEmpty;