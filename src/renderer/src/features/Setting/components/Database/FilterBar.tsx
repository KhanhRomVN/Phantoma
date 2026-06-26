import React, { useState } from 'react';
import { Badge } from '../../../../components/ui/Badge/Badge';
import { Button } from '../../../../components/ui/Button';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '../../../../components/ui/Dropdown';
import { Input } from '../../../../components/ui/Input';
import { X, ChevronDown } from 'lucide-react';
import { OPERATORS } from '../../constants/database';
import { FilterCondition, Operator } from '../../types/database';

interface FilterBarProps {
  filters: FilterCondition[];
  availableColumns: string[];
  onAddFilter: (column: string, operator: Operator, value: string) => void;
  onRemoveFilter: (id: string) => void;
  onClearFilters: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  availableColumns,
  onAddFilter,
  onRemoveFilter,
  onClearFilters,
}) => {
  const [newFilterColumn, setNewFilterColumn] = useState<string>('');
  const [newFilterOperator, setNewFilterOperator] = useState<Operator>('equals');
  const [newFilterValue, setNewFilterValue] = useState('');

  const handleAddFilter = () => {
    // Cho phép thêm filter với giá trị trống, user có thể edit sau
    onAddFilter(newFilterColumn || '', newFilterOperator, newFilterValue || '');
    setNewFilterColumn('');
    setNewFilterValue('');
    setNewFilterOperator('equals');
  };

  return (
    <div className="px-4 py-2 border-b border-border bg-card-background/50 shrink-0">
      {/* Row 1: Add Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge count={filters.length} className="bg-primary/20 text-primary" />
        <div className="flex items-center gap-2 flex-1">
          <Dropdown>
            <DropdownTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 justify-between min-w-[120px]"
              >
                <span>{newFilterColumn || 'Select column'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </DropdownTrigger>
            <DropdownContent className="min-w-[150px] max-h-[200px] overflow-y-auto">
              {availableColumns.map((col) => (
                <DropdownItem
                  key={col}
                  onClick={() => setNewFilterColumn(col)}
                  className="text-xs"
                >
                  {col}
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>

          <Dropdown>
            <DropdownTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 justify-between min-w-[100px]"
              >
                <span>{OPERATORS.find((o) => o.value === newFilterOperator)?.label || 'Operator'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </DropdownTrigger>
            <DropdownContent className="min-w-[120px]">
              {OPERATORS.map((op) => (
                <DropdownItem
                  key={op.value}
                  onClick={() => setNewFilterOperator(op.value)}
                  className="text-xs"
                >
                  {op.label}
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>

          <Input
            value={newFilterValue}
            onChange={(e) => setNewFilterValue(e.target.value)}
            placeholder="Value..."
            className="h-7 text-xs w-32"
            onKeyDown={(e) => e.key === 'Enter' && handleAddFilter()}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddFilter}
            className="h-7 text-xs"
          >
            Add filter
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="h-7 text-xs"
          >
            Clear filters
          </Button>
        </div>
      </div>

      {/* Active filters - each as a row */}
      {filters.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {filters.map((f, index) => (
            <div key={f.id} className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium w-10 shrink-0">
                {index === 0 ? 'where' : 'and'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveFilter(f.id)}
                className="h-6 w-6 p-0 shrink-0 text-text-secondary hover:text-error"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs text-text-primary font-mono px-2 py-0.5 bg-input-background rounded border border-border">
                {f.column}
              </span>
              <span className="text-xs text-text-secondary">{f.operator}</span>
              <span className="text-xs text-text-primary font-mono px-2 py-0.5 bg-input-background rounded border border-border">
                "{f.value}"
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
