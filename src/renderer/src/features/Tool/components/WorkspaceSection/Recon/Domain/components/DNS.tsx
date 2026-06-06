import type { ReconData } from '../types/recon-data';
import { ReactNode } from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

// UI Components
function SectionHeader({ accent = '#0af', children }: { accent?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

function KV({ k, v, vc = 'text-[#6a7a9a]' }: { k: string; v: string | number; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[11px] font-mono', vc)}>{v}</span>
    </div>
  );
}

// Helper to parse SPF from TXT records
function parseSPF(txtRecords: string[]): string | null {
  const spf = txtRecords.find(txt => txt.startsWith('v=spf1'));
  return spf || null;
}

// Helper to parse DMARC from TXT records
function parseDMARC(txtRecords: string[]): string | null {
  const dmarc = txtRecords.find(txt => txt.startsWith('v=DMARC1'));
  return dmarc || null;
}

// Helper to check if DKIM exists (usually as TXT with _domainkey)
function hasDKIM(txtRecords: string[]): boolean {
  return txtRecords.some(txt => txt.includes('dkim') || txt.includes('_domainkey'));
}

export function TabDNS({ data }: { data: ReconData }) {
  const dns = data.dnsRecords;
  
  // Parse security posture from actual DNS records
  const spf = parseSPF(dns.TXT);
  const dmarc = parseDMARC(dns.TXT);
  const hasDkim = hasDKIM(dns.TXT);
  const hasCAA = dns.CAA && dns.CAA.length > 0;
  
  // DNSSEC status (would come from DNS flags in real implementation)
  // TODO: Integrate with whoisData.dnssec or separate DNSSEC query
  const dnssecStatus = 'Not Signed'; // Placeholder — check whoisData.dnssec in actual implementation
  const dnssecBad = true; // 'Signed' would be false
  
  // SPF evaluation (rough)
  const spfBad = !spf || spf.includes('~all') || spf.includes('?all');
  const spfDisplay = spf ? (spf.includes('~all') ? '~all (softfail)' : spf.includes('-all') ? '-all (hardfail) ✓' : spf) : 'Not configured';
  
  // DMARC evaluation
  const dmarcBad = !dmarc || (!dmarc.includes('p=reject') && !dmarc.includes('p=quarantine'));
  const dmarcDisplay = dmarc ? (dmarc.includes('p=reject') ? 'p=reject ✓' : dmarc.includes('p=quarantine') ? 'p=quarantine ⚠️' : dmarc) : 'Not configured';
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        {/* A / AAAA Records */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">A / AAAA Records</SectionHeader>
          {dns.A.map((ip, i) => (
            <KV key={i} k={`A[${i}]`} v={ip} vc="text-[#0af]" />
          ))}
          {dns.AAAA.map((ip, i) => (
            <KV key={i} k={`AAAA[${i}]`} v={ip} vc="text-[#0af]" />
          ))}
        </div>
        
        {/* MX, NS, SOA */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">MX Records</SectionHeader>
          {dns.MX.map((mx, i) => (
            <KV key={i} k={`Priority ${mx.priority}`} v={mx.exchange} />
          ))}
          <div className="mt-2 pt-2 border-t border-[#1c2333]">
            <SectionHeader accent="#30d158">NS / SOA</SectionHeader>
            {dns.NS.map((ns, i) => (
              <KV key={i} k={`NS[${i}]`} v={ns} />
            ))}
            <KV k="SOA Primary" v={dns.SOA.mname} />
            <KV k="SOA rname" v={dns.SOA.rname} />
            <KV k="Serial" v={dns.SOA.serial.toString()} />
          </div>
        </div>
        
        {/* CNAME Records */}
        {dns.CNAME && Object.keys(dns.CNAME).length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#5e5ce6">CNAME Records</SectionHeader>
            {Object.entries(dns.CNAME).map(([name, target], i) => (
              <KV key={i} k={name} v={target} vc="text-[#5e5ce6]" />
            ))}
          </div>
        )}
        
        {/* SRV Records */}
        {dns.SRV && dns.SRV.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff9f4a">SRV Records</SectionHeader>
            {dns.SRV.map((srv, i) => (
              <div key={i} className="mb-2 pb-2 border-b border-[#111827] last:border-0">
                <div className="text-[11px] font-mono text-[#8da0c0]">{srv.service}</div>
                <div className="flex gap-3 mt-1 text-[10px] font-mono text-[#3a4558]">
                  <span>Priority: {srv.priority}</span>
                  <span>Weight: {srv.weight}</span>
                  <span>Port: {srv.port}</span>
                  <span>Target: {srv.target}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* PTR Records */}
        {dns.PTR && dns.PTR.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff69b4">PTR Records</SectionHeader>
            {dns.PTR.map((ptr, i) => (
              <KV key={i} k={`PTR[${i}]`} v={ptr} vc="text-[#ff69b4]" />
            ))}
          </div>
        )}
        
        {/* CAA Records */}
        {dns.CAA && dns.CAA.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff2d55">CAA Records</SectionHeader>
            {dns.CAA.map((caa, i) => (
              <KV key={i} k={`${caa.flag} ${caa.tag}`} v={caa.value} />
            ))}
          </div>
        )}
        
        {/* TXT Records */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#f5a623">TXT Records</SectionHeader>
          <div className="space-y-1">
            {dns.TXT.map((txt, i) => (
              <div
                key={i}
                className="font-mono text-[10.5px] text-[#6a7a9a] bg-[#060810] border border-[#111827] rounded p-1.5 break-all"
              >
                "{txt}"
              </div>
            ))}
          </div>
        </div>
        
        {/* DNS Security Posture — Dynamic */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff2d55">DNS Security Posture</SectionHeader>
          <div className="grid grid-cols-4 gap-2">
            {[
              { k: 'DNSSEC', v: dnssecStatus, bad: dnssecBad },
              { k: 'SPF', v: spfDisplay, bad: spfBad },
              { k: 'DMARC', v: dmarcDisplay, bad: dmarcBad },
              { k: 'CAA', v: hasCAA ? 'Configured ✓' : 'Not configured', bad: !hasCAA },
              { k: 'Zone Transfer', v: 'Blocked ✓', bad: false }, // Would require actual test
              { k: 'DKIM', v: hasDkim ? 'Found ✓' : 'Not found', bad: !hasDkim },
              { k: 'NSEC3', v: 'Disabled', bad: true }, // Would require actual DNSSEC check
              { k: 'MTA-STS', v: 'Not configured', bad: true }, // Would require separate DNS lookup
            ].map((item) => (
              <div
                key={item.k}
                className="p-2 rounded border"
                style={{
                  borderColor: item.bad ? '#ff2d5525' : '#30d15825',
                  background: item.bad ? '#ff2d5508' : '#30d15808',
                }}
              >
                <div className="text-[9px] uppercase tracking-wider text-[#2a3548] font-mono">
                  {item.k}
                </div>
                <div
                  className="text-[11px] font-mono mt-0.5"
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