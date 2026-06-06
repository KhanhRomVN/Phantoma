import { SectionHeader, KV } from '../../shared-ui';

export function IPServerNetworkInfo({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#0af">Network Information</SectionHeader>
        <div>TODO: IP address, reverse DNS, ASN, CIDR, GeoIP, ISP, latency, packet loss</div>
      </div>
    </div>
  );
}