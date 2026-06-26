import { TableData } from '../types/database';

export const exportToJson = (data: Record<string, any>[], tableName: string) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tableName}_export.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToCsv = (tableData: TableData, filteredData: Record<string, any>[], tableName: string) => {
  if (!tableData || filteredData.length === 0) return;
  const headers = tableData.columns.join(',');
  const rows = filteredData.map((row) =>
    tableData.columns
      .map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val);
      })
      .join(','),
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tableName}_export.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToXlsx = (tableData: TableData, filteredData: Record<string, any>[], tableName: string) => {
  if (!tableData || filteredData.length === 0) return;
  let html = '<html><head><meta charset="UTF-8"><title>Export</title></head><body><table>';
  html += '<tr>' + tableData.columns.map((col) => `<th>${col}</th>`).join('') + '</tr>';
  filteredData.forEach((row) => {
    html +=
      '<tr>' +
      tableData.columns
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return '<td></td>';
          return `<td>${String(val)}</td>`;
        })
        .join('') +
      '</tr>';
  });
  html += '</table></body></html>';

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tableName}_export.xls`;
  a.click();
  URL.revokeObjectURL(url);
};