import type { Profile } from '../../../../shared/types';
import type { QuickFilters } from '../../../queries';

export interface GroupOption {
  name: string;
  purpose: string;
  count: number;
}

export interface ProfileToolPanelProps {
  filters: QuickFilters;
  groups: GroupOption[];
  onChange: (next: QuickFilters) => void;
  profiles: Profile[];
  onImport: () => void;
  onAddProfile: () => void;
}
