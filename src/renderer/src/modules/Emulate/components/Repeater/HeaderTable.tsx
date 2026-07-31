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
  payloads?: Array<{ id: string; name: string; values: string[]; enabled: boolean }>;
  onSwitchToPayload?: () => void;
}

export function HeaderTable({ headers, onChange, payloads, onSwitchToPayload }: HeaderTableProps) {
  return (
    <ParamTable
      params={headers}
      onChange={onChange}
      placeholderKey="Header name"
      placeholderValue="Header value"
      payloads={payloads}
      onSwitchToPayload={onSwitchToPayload}
    />
  );
}