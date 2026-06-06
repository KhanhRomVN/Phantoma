import { SectionHeader } from '../../shared-ui';

export function WebsiteClientSide({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#f5a623">Client-Side Analysis</SectionHeader>
        <div>TODO: JavaScript files, source map, API calls, local storage, session storage, WebSocket, CSP</div>
      </div>
    </div>
  );
}