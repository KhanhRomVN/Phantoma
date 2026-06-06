import type { ReconData } from '../types/recon-data';
import React from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

// UI Components
function SectionHeader({ accent = '#0af', children }: { accent?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

function KV({ k, v, vc = 'text-[#6a7a9a]' }: { k: string; v: string | number | React.ReactNode; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[11px] font-mono', vc)}>{v}</span>
    </div>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-widest font-mono text-[#3a4558]">{label}</span>
      <span className="text-[15px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[8px] font-mono text-[#2a3548]">{sub}</span>}
    </div>
  );
}

export function DomainWebSurface({ data }: { data: ReconData }) {
  // @ts-ignore - webSurface is added in JSON but not in type yet
  const web = data.webSurface || {};
  
  const endpoints = web.apiEndpoints || [];
  const hiddenDirs = web.hiddenDirectories || [];
  const jsFiles = web.jsFiles || [];
  const fileListings = web.fileListing || [];
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="API Endpoints" value={endpoints.length} sub="discovered" accent="#0af" />
          <StatBox label="Hidden Dirs" value={hiddenDirs.length} sub="exposed" accent="#ff6b35" />
          <StatBox label="JS Files" value={jsFiles.length} sub="client-side" accent="#f5a623" />
          <StatBox label="File Listings" value={fileListings.length} sub="directory listing" accent="#ff2d55" />
        </div>
        
        {/* Main Website Card */}
        {web.website && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#0af">Main Website</SectionHeader>
            <KV k="URL" v={web.website} vc="text-[#0af]" />
            {web.redirect && <KV k="Redirect" v={web.redirect} />}
            {web.errorPage && <KV k="Error Page" v={web.errorPage} />}
          </div>
        )}
        
        {/* Authentication Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Authentication Surface</SectionHeader>
          {web.loginPage && <KV k="Login" v={web.loginPage} vc="text-[#0af]" />}
          {web.adminPanel && <KV k="Admin Panel" v={web.adminPanel} vc="text-[#ff2d55]" />}
        </div>
        
        {/* API Endpoints Card */}
        {endpoints.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#f5a623">API Endpoints</SectionHeader>
            {endpoints.map((ep: string, i: number) => (
              <KV key={i} k={`Endpoint ${i + 1}`} v={ep} vc="text-[#8da0c0]" />
            ))}
            {web.graphQLEndpoint && <KV k="GraphQL" v={web.graphQLEndpoint} vc="text-[#bf5af2]" />}
            {web.swaggerOpenAPI && <KV k="Swagger" v={web.swaggerOpenAPI} vc="text-[#30d158]" />}
            {web.websocket && <KV k="WebSocket" v={web.websocket} vc="text-[#f5a623]" />}
            {web.uploadEndpoint && <KV k="Upload" v={web.uploadEndpoint} vc="text-[#ff6b35]" />}
          </div>
        )}
        
        {/* Hidden Directories Card */}
        {hiddenDirs.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff6b35">Hidden Directories</SectionHeader>
            <div className="flex flex-wrap gap-1">
              {hiddenDirs.map((dir: string, i: number) => (
                <span key={i} className="text-[9px] font-mono text-[#ff6b35] bg-[#ff6b3510] px-2 py-0.5 rounded border border-[#ff6b3530]">
                  {dir}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Discovery Files Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#5e5ce6">Discovery Files</SectionHeader>
          {web.robotsTxt && <KV k="robots.txt" v={web.robotsTxt} vc="text-[#0af]" />}
          {web.sitemapXml && <KV k="sitemap.xml" v={web.sitemapXml} vc="text-[#0af]" />}
        </div>
        
        {/* JS Files Card */}
        {jsFiles.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#bf5af2">JavaScript Files</SectionHeader>
            {jsFiles.map((file: string, i: number) => (
              <KV key={i} k={`JS[${i}]`} v={file} vc="text-[#8da0c0]" />
            ))}
            {web.sourceMap && <KV k="Source Map" v={web.sourceMap} vc="text-[#ff9f4a]" />}
          </div>
        )}
        
        {/* File Listing Card */}
        {fileListings.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff2d55">File Listing Exposures</SectionHeader>
            {fileListings.map((listing: string, i: number) => (
              <KV key={i} k={`Listing ${i + 1}`} v={listing} vc="text-[#ff2d55]" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}