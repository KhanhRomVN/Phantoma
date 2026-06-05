import { dnsRecords, SectionHeader, KV } from '../shared';

export function TabDNS() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">A / AAAA Records</SectionHeader>
          {dnsRecords.A.map((ip, i) => (
            <KV key={i} k={`A[${i}]`} v={ip} vc="text-[#0af]" />
          ))}
          {dnsRecords.AAAA.map((ip, i) => (
            <KV key={i} k={`AAAA[${i}]`} v={ip} vc="text-[#0af]" />
          ))}
        </div>
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">MX Records</SectionHeader>
          {dnsRecords.MX.map((mx, i) => (
            <KV key={i} k={`Priority ${mx.priority}`} v={mx.exchange} />
          ))}
          <div className="mt-2 pt-2 border-t border-[#1c2333]">
            <SectionHeader accent="#30d158">NS / SOA</SectionHeader>
            {dnsRecords.NS.map((ns, i) => (
              <KV key={i} k={`NS[${i}]`} v={ns} />
            ))}
            <KV k="SOA Primary" v={dnsRecords.SOA.mname} />
            <KV k="SOA rname" v={dnsRecords.SOA.rname} />
            <KV k="Serial" v={dnsRecords.SOA.serial.toString()} />
          </div>
        </div>
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#f5a623">TXT Records</SectionHeader>
          <div className="space-y-1">
            {dnsRecords.TXT.map((txt, i) => (
              <div
                key={i}
                className="font-mono text-[9.5px] text-[#6a7a9a] bg-[#060810] border border-[#111827] rounded p-1.5 break-all"
              >
                "{txt}"
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff2d55">DNS Security Posture</SectionHeader>
          <div className="grid grid-cols-4 gap-2">
            {[
              { k: 'DNSSEC', v: 'Not Signed', bad: true },
              { k: 'SPF', v: '~all (softfail)', bad: true },
              { k: 'DMARC', v: 'p=reject ✓', bad: false },
              { k: 'CAA', v: 'Not configured', bad: true },
              { k: 'Zone Transfer', v: 'Blocked ✓', bad: false },
              { k: 'DKIM', v: 'Not found', bad: true },
              { k: 'NSEC3', v: 'Disabled', bad: true },
              { k: 'MTA-STS', v: 'Not configured', bad: true },
            ].map((item) => (
              <div
                key={item.k}
                className="p-2 rounded border"
                style={{
                  borderColor: item.bad ? '#ff2d5525' : '#30d15825',
                  background: item.bad ? '#ff2d5508' : '#30d15808',
                }}
              >
                <div className="text-[8px] uppercase tracking-wider text-[#2a3548] font-mono">
                  {item.k}
                </div>
                <div
                  className="text-[10px] font-mono mt-0.5"
                  style={{ color: item.bad ? '#ff6b35' : '#30d158' }}
                >
                  {item.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
