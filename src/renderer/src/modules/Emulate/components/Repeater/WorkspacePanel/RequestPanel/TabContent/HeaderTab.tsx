import { ParamTab } from './ParamTab';
import type { ParamItem, PayloadItem } from '../types';

interface HeaderTabProps {
  headers: ParamItem[];
  onChange: (headers: ParamItem[]) => void;
  payloads?: PayloadItem[];
  onSwitchToPayload?: () => void;
  readOnly?: boolean;
}

export function HeaderTab({
  headers,
  onChange,
  payloads,
  onSwitchToPayload,
  readOnly = false,
}: HeaderTabProps) {
  return (
    <ParamTab
      params={headers}
      onChange={onChange}
      placeholderKey="Header name"
      placeholderValue="Header value"
      payloads={payloads}
      onSwitchToPayload={onSwitchToPayload}
      readOnly={readOnly}
    />
  );
}