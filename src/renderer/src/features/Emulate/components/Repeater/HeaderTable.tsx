import { ParamTable } from './ParamTable';

interface HeaderItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface HeaderTableProps {
  headers: HeaderItem[];
  onChange: (headers: HeaderItem[]) => void;
}

export function HeaderTable({ headers, onChange }: HeaderTableProps) {
  return (
    <ParamTable
      params={headers}
      onChange={onChange}
      placeholderKey="Header name"
      placeholderValue="Header value"
    />
  );
}