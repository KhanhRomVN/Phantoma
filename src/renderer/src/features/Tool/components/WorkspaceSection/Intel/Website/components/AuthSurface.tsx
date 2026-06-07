import type { WebsiteData } from '../types/website-data';
import React from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

function SectionHeader({ accent = '#0af', children }: { accent?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

function KV({ k, v, vc = 'text-[#c8d6f0]' }: { k: string; v: string | number | React.ReactNode; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[12px] font-mono', vc)}>{v}</span>
    </div>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-mono text-[#c8d6f0]">{label}</span>
      <span className="text-[16px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[9px] font-mono text-[#c8d6f0]">{sub}</span>}
    </div>
  );
}

export function AuthSurface({ data }: { data: WebsiteData }) {
  const { authSurface } = data;
  const oauthCount = authSurface.oauth?.length || 0;
  
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Login Page" value={authSurface.loginPage ? '✓' : '—'} sub="exposed" accent="#0af" />
          <StatBox label="Register" value={authSurface.registerPage ? '✓' : '—'} sub="enabled" accent="#30d158" />
          <StatBox label="Password Reset" value={authSurface.passwordReset ? '✓' : '—'} sub="available" accent="#f5a623" />
          <StatBox label="MFA" value={authSurface.mfa ? '✓' : '—'} sub="2FA" accent={authSurface.mfa ? '#30d158' : '#3a4558'} />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Authentication Endpoints</SectionHeader>
          {authSurface.loginPage && <KV k="Login" v={authSurface.loginPage} vc="text-[#0af]" />}
          {authSurface.registerPage && <KV k="Register" v={authSurface.registerPage} vc="text-[#30d158]" />}
          {authSurface.passwordReset && <KV k="Reset Password" v={authSurface.passwordReset} vc="text-[#f5a623]" />}
          {authSurface.sso && <KV k="SSO" v={authSurface.sso} vc="text-[#bf5af2]" />}
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#f5a623">Security Features</SectionHeader>
          {authSurface.sessionCookie && (
            <KV k="Session Cookie" v={authSurface.sessionCookie.name} vc={authSurface.sessionCookie.httpOnly ? 'text-[#30d158]' : 'text-[#ff6b35]'} />
          )}
          <KV k="JWT Used" v={authSurface.jwt ? 'Yes' : 'No'} vc={authSurface.jwt ? 'text-[#30d158]' : 'text-[#c8d6f0]'} />
          <KV k="MFA" v={authSurface.mfa ? 'Enabled' : 'Disabled'} vc={authSurface.mfa ? 'text-[#30d158]' : 'text-[#ff6b35]'} />
        </div>
        
        {oauthCount > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#0af">OAuth Providers</SectionHeader>
            <div className="flex flex-wrap gap-2">
              {authSurface.oauth?.map((oauth, idx) => (
                <div key={idx} className="p-2 bg-[#0a0e14] rounded">
                  <div className="text-[12px] font-mono text-[#0af]">{oauth.provider}</div>
                  <div className="text-[10px] text-[#c8d6f0]">{oauth.url}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}