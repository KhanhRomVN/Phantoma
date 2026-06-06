import { SectionHeader, KV } from '../../shared-ui';

export function IPServerOSDetection({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#f5a623">Operating System Detection</SectionHeader>
        <div>TODO: Operating system, kernel version, architecture, hostname, uptime</div>
      </div>
    </div>
  );
}