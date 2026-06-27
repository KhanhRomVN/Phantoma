import React, { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '../../../../components/ui/Dropdown';

import { Tooltip } from '../../../../components/ui/Tooltip';
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

interface FilterRowProps {
  filter: FilterCondition;
  availableColumns: string[];
  onRemove: (id: string) => void;
  onUpdate: (id: string, column: string, operator: Operator, value: string) => void;
}

const FilterRow: React.FC<FilterRowProps> = ({ filter, availableColumns, onRemove, onUpdate }) => {
  // Tự động chọn column đầu tiên nếu chưa có
  const initialColumn = filter.column || (availableColumns.length > 0 ? availableColumns[0] : '');
  const [editColumn, setEditColumn] = useState(initialColumn);
  const [editOperator, setEditOperator] = useState<Operator>(
    (filter.operator as Operator) || 'equals',
  );
  const [editValue, setEditValue] = useState(filter.value || '');
  const [hasRowChanges, setHasRowChanges] = useState(false);
  const [searchColumn, setSearchColumn] = useState('');

  const handleUpdate = () => {
    if (hasRowChanges) {
      onUpdate(filter.id, editColumn || '', editOperator, editValue || '');
      setHasRowChanges(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onRemove(filter.id)}
        className="h-7 w-7 p-0 shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
      <span className="text-xs text-text-secondary font-medium w-10 shrink-0">and</span>
      <div className="flex items-center gap-2 flex-1">
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 justify-between min-w-[120px]">
              <span>{editColumn || 'Select column'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </DropdownTrigger>
          <DropdownContent className="min-w-[150px] max-h-[200px] overflow-y-auto">
            <div className="px-2 py-1.5 border-b border-border">
              <Input
                placeholder="Search columns..."
                className="h-6 text-xs"
                value={searchColumn}
                onChange={(e) => setSearchColumn(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {availableColumns
              .filter((col) => col.toLowerCase().includes(searchColumn.toLowerCase()))
              .map((col) => (
                <DropdownItem
                  key={col}
                  onClick={() => {
                    setEditColumn(col);
                    setSearchColumn('');
                  }}
                  className="text-xs"
                >
                  {col}
                </DropdownItem>
              ))}
          </DropdownContent>
        </Dropdown>

        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 justify-between min-w-[100px]">
              <span>{OPERATORS.find((o) => o.value === editOperator)?.label || 'Operator'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </DropdownTrigger>
          <DropdownContent className="min-w-[120px]">
            {OPERATORS.map((op) => {
              const descriptions: Record<string, string> = {
                equals: 'So sánh giá trị bằng với giá trị tìm kiếm. Ví dụ: column = "value"',
                not_equal: 'So sánh giá trị khác với giá trị tìm kiếm. Ví dụ: column != "value"',
                greater: 'Lọc các bản ghi có giá trị lớn hơn giá trị tìm kiếm. Ví dụ: column > 100',
                less: 'Lọc các bản ghi có giá trị nhỏ hơn giá trị tìm kiếm. Ví dụ: column < 100',
                contains: 'Tìm các bản ghi chứa chuỗi tìm kiếm trong giá trị cột. Ví dụ: column LIKE "%value%"',
                starts_with: 'Tìm các bản ghi bắt đầu bằng chuỗi tìm kiếm. Ví dụ: column LIKE "value%"',
                ends_with: 'Tìm các bản ghi kết thúc bằng chuỗi tìm kiếm. Ví dụ: column LIKE "%value"',
              };
              return (
                <Tooltip key={op.value} content={descriptions[op.value] || op.label} side="right" align="center">
                  <DropdownItem
                    onClick={() => setEditOperator(op.value)}
                    className="text-xs"
                  >
                    {op.label}
                  </DropdownItem>
                </Tooltip>
              );
            })}
          </DropdownContent>
        </Dropdown>

        <Input
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            setHasRowChanges(true);
          }}
          placeholder="Value..."
          className="h-7 text-xs min-w-[120px] flex-1"
        />

        {hasRowChanges && (
          <Button variant="solid" size="sm" onClick={handleUpdate} className="h-7 text-xs">
            Apply
          </Button>
        )}
        
      </div>
    </div>
  );
};

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  availableColumns,
  onAddFilter,
  onRemoveFilter,
  onClearFilters,
}) => {
  console.log('[FilterBar] Rendered with filters:', filters.length);
  // Tự động chọn column đầu tiên nếu có
  const defaultColumn = availableColumns.length > 0 ? availableColumns[0] : '';
  const [newFilterColumn, setNewFilterColumn] = useState<string>(defaultColumn);
  const [newFilterOperator, setNewFilterOperator] = useState<Operator>('equals');
  const [newFilterValue, setNewFilterValue] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [searchColumn, setSearchColumn] = useState('');

  // Cập nhật default column khi availableColumns thay đổi
  React.useEffect(() => {
    if (availableColumns.length > 0 && !newFilterColumn) {
      setNewFilterColumn(availableColumns[0]);
    }
  }, [availableColumns, newFilterColumn]);

  const handleNewFilterChange = (column: string, operator: Operator, value: string) => {
    setNewFilterColumn(column);
    setNewFilterOperator(operator);
    setNewFilterValue(value);
    setHasChanges(true);
  };

  const handleApplyFilter = () => {
    handleAddFilter();
    setHasChanges(false);
  };

  const handleAddFilter = () => {
    console.log('[FilterBar] handleAddFilter called', {
      newFilterColumn,
      newFilterOperator,
      newFilterValue,
    });
    // Cho phép thêm filter với giá trị trống, user có thể edit sau
    console.log('[FilterBar] Calling onAddFilter with:', {
      column: newFilterColumn || '',
      operator: newFilterOperator,
      value: newFilterValue || '',
    });
    onAddFilter(newFilterColumn || '', newFilterOperator, newFilterValue || '');
    console.log('[FilterBar] onAddFilter called, current filters count:', filters.length);
    setNewFilterColumn('');
    setNewFilterValue('');
    setNewFilterOperator('equals');
    console.log('[FilterBar] State reset');
  };

  return (
    <div className="px-4 py-2 border-b border-border bg-card-background/50 shrink-0">
      {/* Row 1: where + dropdowns + input + buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.length >= 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="h-7 w-7 p-0 shrink-0"
            aria-label="Clear all filters"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
        <span className="text-xs text-text-secondary font-medium w-10 shrink-0">where</span>
        <div className="flex items-center gap-2 flex-1">
          <Dropdown>
            <DropdownTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 justify-between min-w-[120px]">
                <span>{newFilterColumn || 'Select column'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </DropdownTrigger>
            <DropdownContent className="min-w-[150px] max-h-[200px] overflow-y-auto">
              <div className="px-2 py-1.5 border-b border-border">
                <Input
                  placeholder="Search columns..."
                  className="h-6 text-xs"
                  value={searchColumn}
                  onChange={(e) => setSearchColumn(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              {availableColumns
                .filter((col) => col.toLowerCase().includes(searchColumn.toLowerCase()))
                .map((col) => (
                  <DropdownItem
                    key={col}
                    onClick={() => {
                      setNewFilterColumn(col);
                      setSearchColumn('');
                    }}
                    className="text-xs"
                  >
                    {col}
                  </DropdownItem>
                ))}
            </DropdownContent>
          </Dropdown>

          <Dropdown>
            <DropdownTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 justify-between min-w-[100px]">
                <span>
                  {OPERATORS.find((o) => o.value === newFilterOperator)?.label || 'Operator'}
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </DropdownTrigger>
            <DropdownContent className="min-w-[120px]">
              {OPERATORS.map((op) => {
                const descriptions: Record<string, string> = {
                  equals: 'So sánh giá trị bằng với giá trị tìm kiếm. Ví dụ: column = "value"',
                  not_equal: 'So sánh giá trị khác với giá trị tìm kiếm. Ví dụ: column != "value"',
                  greater: 'Lọc các bản ghi có giá trị lớn hơn giá trị tìm kiếm. Ví dụ: column > 100',
                  less: 'Lọc các bản ghi có giá trị nhỏ hơn giá trị tìm kiếm. Ví dụ: column < 100',
                  contains: 'Tìm các bản ghi chứa chuỗi tìm kiếm trong giá trị cột. Ví dụ: column LIKE "%value%"',
                  starts_with: 'Tìm các bản ghi bắt đầu bằng chuỗi tìm kiếm. Ví dụ: column LIKE "value%"',
                  ends_with: 'Tìm các bản ghi kết thúc bằng chuỗi tìm kiếm. Ví dụ: column LIKE "%value"',
                };
                return (
                  <Tooltip key={op.value} content={descriptions[op.value] || op.label} side="right" align="center">
                    <DropdownItem
                      onClick={() => setNewFilterOperator(op.value)}
                      className="text-xs"
                    >
                      {op.label}
                    </DropdownItem>
                  </Tooltip>
                );
              })}
            </DropdownContent>
          </Dropdown>

          <Input
            value={newFilterValue}
            onChange={(e) => {
              setNewFilterValue(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Value..."
            className="h-7 text-xs min-w-[120px] flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
          />

          {hasChanges && (
            <Button variant="solid" size="sm" onClick={handleApplyFilter} className="h-7 text-xs">
              Apply
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handleAddFilter} className="h-7 text-xs">
            Add filter
          </Button>

          <Button variant="outline" size="sm" onClick={onClearFilters} className="h-7 text-xs">
            Clear filters
          </Button>
        </div>
      </div>

      {/* Active filters - each as a row with dropdowns */}
      {filters.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {filters.map((f) => (
            <FilterRow
              key={f.id}
              filter={f}
              availableColumns={availableColumns}
              onRemove={onRemoveFilter}
              onUpdate={(id, column, operator, value) => {
                // Remove old filter and add updated one
                onRemoveFilter(id);
                onAddFilter(column, operator, value);
              }}
            />
          ))}
        </div>
      )}
      
    </div>
  );
};

export default FilterBar;
