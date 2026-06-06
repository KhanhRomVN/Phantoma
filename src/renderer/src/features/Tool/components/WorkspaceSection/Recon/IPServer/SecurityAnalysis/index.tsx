import { SectionHeader } from '../../shared-ui';

export function IPServerSecurityAnalysis({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#ff2d55">Security Analysis</SectionHeader>
        <div>TODO: CVEs, weak cipher, weak SSH config, anonymous FTP, SMB exposure, RDP exposure, VNC exposure, Telnet exposure</div>
      </div>
    </div>
  );
}