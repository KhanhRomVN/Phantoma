import React from 'react';
import { flexRender, Table as TanStackTable } from '@tanstack/react-table';

interface DataTableProps {
  table: TanStackTable<any>;
  dataLength: number;
}

export const DataTable: React.FC<DataTableProps> = ({ table, dataLength }) => {
  return (
    <div className="flex-1 overflow-auto">
      <div className="w-full h-full overflow-auto">
        <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border">
                {headerGroup.headers.map((header) => {
                  if (header.column.getIsVisible() === false) return null;
                  const canResize = header.column.getCanResize();
                  const isResizing = header.column.getIsResizing();
                  return (
                    <th
                      key={header.id}
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
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {dataLength === 0 ? (
              <tr>
                <td
                  colSpan={table.getAllColumns().filter((c) => c.getIsVisible()).length}
                  className="px-4 py-8 text-center text-text-secondary text-sm"
                >
                  No data found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-dropdown-item-hover/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-3 py-1.5 border-r border-border last:border-r-0"
                      style={{
                        maxWidth: cell.column.getSize(),
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};