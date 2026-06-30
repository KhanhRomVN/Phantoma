import React, { useState } from 'react';
import { flexRender, Table as TanStackTable } from '@tanstack/react-table';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '../../../../components/ui/Table';

import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSub,
  DropdownSubTrigger,
  DropdownSubContent,
} from '../../../../components/ui/Dropdown';
import { Copy, Trash2, FileJson, FileText, ChevronDown } from 'lucide-react';

interface DataTableProps {
  table: TanStackTable<any>;
  dataLength: number;
  onDeleteRecord?: (rowId: number) => void;
  onCopyAsJson?: (row: any) => void;
  onCopyAsMarkdown?: (row: any) => void;
  selectedCount?: number;
  onBulkDelete?: () => void;
  onBulkCopyAsJson?: (rows: any[]) => void;
  onBulkCopyAsMarkdown?: (rows: any[]) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  table,
  dataLength,
  onDeleteRecord,
  onCopyAsJson,
  onCopyAsMarkdown,
  selectedCount = 0,
  onBulkDelete,
  onBulkCopyAsJson,
  onBulkCopyAsMarkdown,
}) => {
  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    row: any;
    rowId: number;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, row: any) => {
    e.preventDefault();
    const rowId = row.original?.rowid ?? parseInt(row.id);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      row: row.original,
      rowId,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="w-full h-full overflow-auto">
        <Table style={{ tableLayout: 'fixed' }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-border">
                {headerGroup.headers.map((header) => {
                  if (header.column.getIsVisible() === false) return null;
                  const canResize = header.column.getCanResize();
                  const isResizing = header.column.getIsResizing();
                  return (
                    <TableCell
                      key={header.id}
                      as="th"
                      className="px-3 py-2 text-left border-r border-border last:border-r-0 whitespace-nowrap relative"
                      style={{
                        width: header.getSize(),
                        minWidth: header.column.columnDef.minSize,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {canResize && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none ${
                            isResizing ? 'bg-primary/60' : 'opacity-0 hover:opacity-100'
                          } hover:bg-primary/30 transition-opacity`}
                          style={{
                            transform: 'translateX(50%)',
                            pointerEvents: 'auto',
                            zIndex: 10,
                          }}
                        />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {dataLength === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().filter((c) => c.getIsVisible()).length}
                  className="px-4 py-8 text-center text-text-secondary text-sm"
                >
                  No data found
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-border hover:bg-dropdown-item-hover/50 transition-colors cursor-context-menu"
                  onContextMenu={(e) => handleContextMenu(e, row)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      as="td"
                      className="px-3 py-1.5 border-r border-border last:border-r-0"
                      style={{
                        maxWidth: cell.column.getSize(),
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
          }}
        >
          <Dropdown
            open={true}
            onOpenChange={(open) => !open && handleCloseContextMenu()}
            strategy="fixed"
            side="bottom"
            align="start"
          >
            <DropdownTrigger>
              <div style={{ width: 1, height: 1 }} />
            </DropdownTrigger>
            <DropdownContent className="min-w-[180px]">
              <DropdownItem
                variant="error"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  onDeleteRecord?.(contextMenu.rowId);
                  handleCloseContextMenu();
                }}
              >
                Delete record
              </DropdownItem>
              <DropdownSub>
                <DropdownSubTrigger icon={<Copy className="w-3.5 h-3.5" />}>
                  Copy
                </DropdownSubTrigger>
                <DropdownSubContent>
                  <DropdownItem
                    icon={<FileJson className="w-3.5 h-3.5" />}
                    onClick={() => {
                      onCopyAsJson?.(contextMenu.row);
                      handleCloseContextMenu();
                    }}
                  >
                    Copy as JSON
                  </DropdownItem>
                  <DropdownItem
                    icon={<FileText className="w-3.5 h-3.5" />}
                    onClick={() => {
                      onCopyAsMarkdown?.(contextMenu.row);
                      handleCloseContextMenu();
                    }}
                  >
                    Copy as Markdown
                  </DropdownItem>
                </DropdownSubContent>
              </DropdownSub>
            </DropdownContent>
          </Dropdown>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 bg-background border border-border rounded-lg shadow-lg px-4 py-2 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-xs text-text-secondary">
            {selectedCount} record{selectedCount > 1 ? 's' : ''} selected
          </span>
          <div className="w-px h-5 bg-border" />
          <Dropdown side="top" strategy="relative">
            <DropdownTrigger asChild>
              <button className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-primary hover:text-primary hover:bg-primary/10 rounded transition-colors">
                <Copy className="w-3.5 h-3.5" />
                Copy
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownTrigger>
            <DropdownContent className="w-auto min-w-max">
              <DropdownItem onClick={() => onBulkCopyAsJson?.(selectedRows)}>
                <FileJson className="w-3.5 h-3.5" />
                Copy as JSON
              </DropdownItem>
              <DropdownItem onClick={() => onBulkCopyAsMarkdown?.(selectedRows)}>
                <FileText className="w-3.5 h-3.5" />
                Copy as Markdown
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
          <div className="w-px h-5 bg-border" />
          <button
            onClick={onBulkDelete}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-error hover:bg-error/10 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};
