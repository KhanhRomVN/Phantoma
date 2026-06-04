// src/renderer/src/features/Tool/components/WorkspaceSection/Phishing/index.tsx
import { useState } from 'react';
import { cn } from '../../../../../shared/lib/utils';
import {
  Badge,
  KVRow,
  ModuleTabBar,
  ToolbarButton,
  ProgressBar,
  ActionButton,
  SeverityPill,
} from '../../../../../core/components/ui';

// ============================================================================
// 1. MOCK DATA (CHI TIẾT CHO PHISHING / SOCIAL ENGINEERING)
// ============================================================================

interface Campaign {
  id: string;
  name: string;
  target: string;
  sent: number;
  opened: number;
  clicked: number;
  creds: number;
  status: 'active' | 'paused' | 'completed';
  startDate: string;
  endDate?: string;
  template: string;
  landingPage: string;
}

const campaigns: Campaign[] = [
  {
    id: 'c1',
    name: 'Corp IT Alert',
    target: 'All employees',
    sent: 248,
    opened: 187,
    clicked: 94,
    creds: 31,
    status: 'active',
    startDate: '2025-05-28',
    template: 'it_alert',
    landingPage: 'office365_login',
  },
  {
    id: 'c2',
    name: 'HR Policy 2024',
    target: 'Finance dept',
    sent: 42,
    opened: 38,
    clicked: 29,
    creds: 12,
    status: 'active',
    startDate: '2025-05-30',
    template: 'hr_policy',
    landingPage: 'sharepoint_fake',
  },
  {
    id: 'c3',
    name: 'VPN Renewal',
    target: 'IT admins',
    sent: 15,
    opened: 14,
    clicked: 11,
    creds: 7,
    status: 'paused',
    startDate: '2025-06-01',
    template: 'vpn_renewal',
    landingPage: 'vpn_portal',
  },
  {
    id: 'c4',
    name: 'Salary Survey',
    target: 'All staff',
    sent: 512,
    opened: 401,
    clicked: 178,
    creds: 45,
    status: 'completed',
    startDate: '2025-05-20',
    endDate: '2025-05-27',
    template: 'salary_survey',
    landingPage: 'microsoft_forms',
  },
];

interface Credential {
  time: string;
  email: string;
  password: string;
  ip: string;
  userAgent: string;
  country: string;
  campaignId: string;
  highValue: boolean;
}

const harvestedCreds: Credential[] = [
  {
    time: '09:12:34',
    email: 'alice@corp.local',
    password: 'Spring2024!',
    ip: '10.0.0.45',
    userAgent: 'Chrome/120.0',
    country: 'US',
    campaignId: 'c1',
    highValue: false,
  },
  {
    time: '09:15:22',
    email: 'bob@corp.local',
    password: 'Corp@1234',
    ip: '10.0.0.82',
    userAgent: 'Edge/118.0',
    country: 'US',
    campaignId: 'c1',
    highValue: false,
  },
  {
    time: '09:22:01',
    email: 'ceo@corp.local',
    password: 'Secr3t!Pass',
    ip: '10.0.0.11',
    userAgent: 'Safari/17.0',
    country: 'US',
    campaignId: 'c1',
    highValue: true,
  },
  {
    time: '09:31:45',
    email: 'it.admin@corp.local',
    password: 'ADm1n#2024',
    ip: '10.0.0.5',
    userAgent: 'Firefox/122.0',
    country: 'US',
    campaignId: 'c2',
    highValue: true,
  },
  {
    time: '09:44:12',
    email: 'finance@corp.local',
    password: 'Money$$123',
    ip: '10.0.0.92',
    userAgent: 'Chrome/121.0',
    country: 'US',
    campaignId: 'c2',
    highValue: false,
  },
  {
    time: '09:58:33',
    email: 'hr@corp.local',
    password: 'HRpass2024',
    ip: '10.0.0.77',
    userAgent: 'Edge/119.0',
    country: 'US',
    campaignId: 'c3',
    highValue: false,
  },
  {
    time: '10:05:12',
    email: 'admin@corp.local',
    password: 'P@ssw0rd!',
    ip: '10.0.0.3',
    userAgent: 'Chrome/122.0',
    country: 'US',
    campaignId: 'c4',
    highValue: true,
  },
];

interface EmailTemplate {
  id: string;
  name: string;
  from: string;
  subject: string;
  bodyPreview: string;
  attachments: boolean;
  usedIn: string[];
}

const emailTemplates: EmailTemplate[] = [
  {
    id: 'it_alert',
    name: 'IT Security Alert',
    from: 'it-security@corp-alerts.com',
    subject: '⚠ Urgent: Account Verification Required',
    bodyPreview: 'Verify credentials within 24 hours.',
    attachments: false,
    usedIn: ['c1'],
  },
  {
    id: 'hr_policy',
    name: 'HR Policy Update',
    from: 'hr@corp.com',
    subject: 'Important: New HR Policy 2024',
    bodyPreview: 'Please review the updated policy document.',
    attachments: true,
    usedIn: ['c2'],
  },
  {
    id: 'vpn_renewal',
    name: 'VPN Renewal Notice',
    from: 'vpn@corp.com',
    subject: 'Action Required: VPN Certificate Renewal',
    bodyPreview: 'Click to renew your VPN certificate.',
    attachments: false,
    usedIn: ['c3'],
  },
  {
    id: 'salary_survey',
    name: 'Salary Survey',
    from: 'survey@corp.com',
    subject: 'Anonymous Salary Survey 2024',
    bodyPreview: 'Help us improve compensation planning.',
    attachments: false,
    usedIn: ['c4'],
  },
];

interface LandingPage {
  id: string;
  name: string;
  url: string;
  cloneOf: string;
  capturesCredentials: boolean;
  capturesMFA: boolean;
  visits: number;
  submissions: number;
}

const landingPages: LandingPage[] = [
  {
    id: 'office365_login',
    name: 'Office 365 Login',
    url: 'https://office365-login.xyz',
    cloneOf: 'Office 365',
    capturesCredentials: true,
    capturesMFA: true,
    visits: 421,
    submissions: 187,
  },
  {
    id: 'sharepoint_fake',
    name: 'SharePoint Fake',
    url: 'https://sharepoint-verify.com',
    cloneOf: 'SharePoint',
    capturesCredentials: true,
    capturesMFA: false,
    visits: 89,
    submissions: 38,
  },
  {
    id: 'vpn_portal',
    name: 'VPN Portal',
    url: 'https://vpn-corp.com',
    cloneOf: 'Cisco VPN',
    capturesCredentials: true,
    capturesMFA: true,
    visits: 45,
    submissions: 29,
  },
  {
    id: 'microsoft_forms',
    name: 'Microsoft Forms',
    url: 'https://forms-official.com',
    cloneOf: 'Microsoft Forms',
    capturesCredentials: false,
    capturesMFA: false,
    visits: 512,
    submissions: 178,
  },
];

interface TrackingEvent {
  id: string;
  campaignId: string;
  email: string;
  eventType: 'sent' | 'opened' | 'clicked' | 'submitted';
  timestamp: string;
  ip: string;
  userAgent: string;
  geo: string;
}

const trackingEvents: TrackingEvent[] = [
  {
    id: 't1',
    campaignId: 'c1',
    email: 'alice@corp.local',
    eventType: 'sent',
    timestamp: '2025-06-01 09:00:00',
    ip: '10.0.0.45',
    userAgent: 'Chrome/120.0',
    geo: 'US',
  },
  {
    id: 't2',
    campaignId: 'c1',
    email: 'alice@corp.local',
    eventType: 'opened',
    timestamp: '2025-06-01 09:12:30',
    ip: '10.0.0.45',
    userAgent: 'Chrome/120.0',
    geo: 'US',
  },
  {
    id: 't3',
    campaignId: 'c1',
    email: 'alice@corp.local',
    eventType: 'clicked',
    timestamp: '2025-06-01 09:12:34',
    ip: '10.0.0.45',
    userAgent: 'Chrome/120.0',
    geo: 'US',
  },
  {
    id: 't4',
    campaignId: 'c1',
    email: 'alice@corp.local',
    eventType: 'submitted',
    timestamp: '2025-06-01 09:12:34',
    ip: '10.0.0.45',
    userAgent: 'Chrome/120.0',
    geo: 'US',
  },
  {
    id: 't5',
    campaignId: 'c1',
    email: 'bob@corp.local',
    eventType: 'sent',
    timestamp: '2025-06-01 09:00:01',
    ip: '10.0.0.82',
    userAgent: 'Edge/118.0',
    geo: 'US',
  },
  {
    id: 't6',
    campaignId: 'c1',
    email: 'bob@corp.local',
    eventType: 'opened',
    timestamp: '2025-06-01 09:15:20',
    ip: '10.0.0.82',
    userAgent: 'Edge/118.0',
    geo: 'US',
  },
];

// Evilginx setup mock
const evilginxConfig = {
  enabled: true,
  phishingDomain: 'office365-login.xyz',
  redirectUrl: 'https://login.microsoftonline.com',
  lureName: 'office365',
  captures: ['email', 'password', 'mfa_code', 'session_cookie'],
  sessions: [
    {
      id: 'sess1',
      token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
      capturedAt: '2025-06-01 09:12:35',
      ip: '10.0.0.45',
    },
    {
      id: 'sess2',
      token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
      capturedAt: '2025-06-01 09:31:47',
      ip: '10.0.0.5',
    },
  ],
};

// Settings mock
const phishingSettings = {
  smtp: {
    server: 'smtp.corp.com',
    port: 587,
    encryption: 'STARTTLS',
    from: 'noreply@corp-alerts.com',
  },
  domains: ['office365-login.xyz', 'sharepoint-verify.com', 'vpn-corp.com', 'forms-official.com'],
  trackingPixel: 'https://tracker.corp.com/pixel.gif',
  redirectAfterSubmit: 'https://corp.com/success',
  blockRobots: true,
  captureHeaders: ['User-Agent', 'Accept-Language', 'X-Forwarded-For'],
};

// ============================================================================
// 2. UI COMPONENTS
// ============================================================================

const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
    {children}
  </div>
);
const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />;
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-2">
    {children}
  </div>
);

function CampaignCard({
  campaign,
  selected,
  onClick,
}: {
  campaign: Campaign;
  selected?: boolean;
  onClick?: () => void;
}) {
  const openRate = Math.round((campaign.opened / campaign.sent) * 100);
  const clickRate = Math.round((campaign.clicked / campaign.sent) * 100);
  const credRate = Math.round((campaign.creds / campaign.sent) * 100);
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[#111520] border rounded-md p-3 cursor-pointer transition-all hover:border-[#252e42]',
        campaign.status === 'active' ? 'border-green-500/20' : 'border-[#1e2535]',
        selected && 'border-cyan-500/30 bg-cyan-500/4',
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[12px] font-semibold text-[#c5cfe0]">{campaign.name}</span>
        <span
          className={cn(
            'ml-auto text-[9px] font-bold px-1.5 py-0 rounded',
            campaign.status === 'active'
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : campaign.status === 'paused'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-white/5 text-[#6b7a96] border border-[#252e42]',
          )}
        >
          {campaign.status.toUpperCase()}
        </span>
      </div>
      <div className="text-[10px] text-[#6b7a96] mb-2">{campaign.target}</div>
      <div className="grid grid-cols-4 gap-2 text-center mb-2">
        <div className="bg-[#141924] rounded p-1">
          <div className="text-[12px] font-bold text-[#c5cfe0]">{campaign.sent}</div>
          <div className="text-[9px] text-[#3d4a61]">Sent</div>
        </div>
        <div className="bg-[#141924] rounded p-1">
          <div className="text-[12px] font-bold text-cyan-400">{openRate}%</div>
          <div className="text-[9px] text-[#3d4a61]">Opened</div>
        </div>
        <div className="bg-[#141924] rounded p-1">
          <div className="text-[12px] font-bold text-amber-400">{clickRate}%</div>
          <div className="text-[9px] text-[#3d4a61]">Clicked</div>
        </div>
        <div className="bg-[#141924] rounded p-1">
          <div className="text-[12px] font-bold text-red-400">{credRate}%</div>
          <div className="text-[9px] text-[#3d4a61]">Creds</div>
        </div>
      </div>
      <div className="text-[9px] text-[#3d4a61]">Started: {campaign.startDate}</div>
    </div>
  );
}

// ============================================================================
// 3. TAB COMPONENTS
// ============================================================================

function TabCampaigns() {
  const [selectedCampaign, setSelectedCampaign] = useState(campaigns[0]);
  return (
    <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
      <div className="flex flex-col bg-[#141924] overflow-hidden w-1/2">
        <div className="flex items-center gap-2 px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
          <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em] flex-1">
            Active Campaigns
          </span>
          <Badge color="green">
            {campaigns.filter((c) => c.status === 'active').length} active
          </Badge>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              selected={selectedCampaign.id === c.id}
              onClick={() => setSelectedCampaign(c)}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col bg-[#141924] overflow-hidden w-1/2">
        <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
          <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em]">
            Campaign Stats
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SectionTitle>Performance</SectionTitle>
          <KVRow label="Sent" value={selectedCampaign.sent.toString()} />
          <KVRow
            label="Opened"
            value={`${selectedCampaign.opened} (${Math.round((selectedCampaign.opened / selectedCampaign.sent) * 100)}%)`}
            valueColor="text-cyan-400"
          />
          <KVRow
            label="Clicked"
            value={`${selectedCampaign.clicked} (${Math.round((selectedCampaign.clicked / selectedCampaign.sent) * 100)}%)`}
            valueColor="text-amber-400"
          />
          <KVRow
            label="Credentials"
            value={`${selectedCampaign.creds} (${Math.round((selectedCampaign.creds / selectedCampaign.sent) * 100)}%)`}
            valueColor="text-red-400"
          />
          <div className="mt-3">
            <SectionTitle>Actions</SectionTitle>
            <div className="flex gap-2">
              <ActionButton size="sm" variant="green">
                Edit Campaign
              </ActionButton>
              <ActionButton size="sm" variant="red">
                Pause
              </ActionButton>
              <ActionButton size="sm">Clone</ActionButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabHarvestedCreds() {
  const [filterHigh, setFilterHigh] = useState(false);
  const filtered = filterHigh ? harvestedCreds.filter((c) => c.highValue) : harvestedCreds;
  return (
    <div className="flex-1 overflow-hidden bg-[#080a0e] flex flex-col">
      <div className="flex items-center justify-between px-3 py-1 bg-[#0f1319] border-b border-[#1e2535] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#6b7a96]">Filter:</span>
          <button
            onClick={() => setFilterHigh(!filterHigh)}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-semibold',
              filterHigh
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-[#6b7a96]',
            )}
          >
            Show high-value only
          </button>
        </div>
        <Badge color="green">{harvestedCreds.length} total</Badge>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-[10.5px]">
          <thead className="sticky top-0 bg-[#0f1319] border-b border-[#1e2535]">
            <tr>
              <th className="text-left p-2 text-[#3d4a61]">Time</th>
              <th className="text-left p-2 text-[#3d4a61]">Email</th>
              <th className="text-left p-2 text-[#3d4a61]">Password</th>
              <th className="text-left p-2 text-[#3d4a61]">IP</th>
              <th className="text-left p-2 text-[#3d4a61]">UA</th>
              <th className="text-left p-2 text-[#3d4a61]">Campaign</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={i} className="border-b border-[#1e2535]/50 hover:bg-white/[0.02]">
                <td className="p-2 text-[#6b7a96]">{c.time}</td>
                <td className="p-2 text-green-400">{c.email}</td>
                <td
                  className={cn('p-2 font-mono', c.highValue ? 'text-red-400' : 'text-green-400')}
                >
                  {c.password}
                </td>
                <td className="p-2 text-[#6b7a96] font-mono">{c.ip}</td>
                <td className="p-2 text-[#6b7a96] text-[9px]">{c.userAgent}</td>
                <td className="p-2">
                  <Badge color="gray">{c.campaignId}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-2 border-t border-[#1e2535] shrink-0">
        <button className="w-full px-2.5 py-1.5 rounded border border-cyan-500/30 bg-cyan-500/7 text-cyan-400 text-[10.5px] font-semibold hover:bg-cyan-500/12">
          → Sync to Credential Vault
        </button>
      </div>
    </div>
  );
}

function TabEmailTemplates() {
  const [selected, setSelected] = useState(emailTemplates[0]);
  return (
    <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
      <div className="flex flex-col bg-[#141924] overflow-hidden w-1/3">
        <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
          <span className="text-[10.5px] font-bold text-[#6b7a96]">Templates</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {emailTemplates.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelected(t)}
              className={cn(
                'p-2 mb-1 rounded cursor-pointer',
                selected.id === t.id
                  ? 'bg-cyan-500/10 border border-cyan-500/30'
                  : 'hover:bg-[#0f1319]',
              )}
            >
              <div className="text-[11px] font-semibold text-cyan-400">{t.name}</div>
              <div className="text-[9px] text-[#6b7a96] truncate">{t.subject}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col bg-[#141924] overflow-hidden w-2/3">
        <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
          <span className="text-[10.5px] font-bold text-[#6b7a96]">Preview</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="bg-[#141924] border border-[#252e42] rounded p-3 text-[10.5px]">
            <div className="text-[#6b7a96]">
              From: <span className="text-[#c5cfe0]">{selected.from}</span>
            </div>
            <div className="text-[#6b7a96] mb-2">
              Subject: <span className="text-[#c5cfe0] font-semibold">{selected.subject}</span>
            </div>
            <div className="border-t border-[#1e2535] pt-2 text-[#6b7a96] leading-relaxed">
              {selected.bodyPreview}
              <br />
              <span className="text-cyan-400 underline cursor-pointer">→ Click here to verify</span>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <ActionButton size="sm" variant="cyan">
              Edit HTML
            </ActionButton>
            <ActionButton size="sm">Send Test</ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabLandingPages() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3">
        {landingPages.map((lp) => (
          <div key={lp.id} className="bg-[#111520] border border-[#1e2535] rounded p-3">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-semibold text-cyan-400">{lp.name}</span>
              <Badge color="gray">{lp.cloneOf}</Badge>
            </div>
            <div className="text-[9px] text-[#6b7a96] font-mono mt-1">{lp.url}</div>
            <div className="grid grid-cols-3 gap-1 mt-2 text-center">
              <div>
                <div className="text-[11px] font-bold text-cyan-400">{lp.visits}</div>
                <div className="text-[8px] text-[#3d4a61]">Visits</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-amber-400">{lp.submissions}</div>
                <div className="text-[8px] text-[#3d4a61]">Submissions</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-green-400">
                  {Math.round((lp.submissions / lp.visits) * 100)}%
                </div>
                <div className="text-[8px] text-[#3d4a61]">Conv.</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge color={lp.capturesCredentials ? 'green' : 'gray'}>Captures creds</Badge>
              <Badge color={lp.capturesMFA ? 'amber' : 'gray'}>MFA</Badge>
            </div>
            <ActionButton size="sm" variant="cyan" className="mt-2">
              Clone Site
            </ActionButton>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabTracking() {
  return (
    <div className="flex-1 overflow-auto bg-[#080a0e]">
      <table className="w-full border-collapse text-[10px]">
        <thead className="sticky top-0 bg-[#0f1319] border-b border-[#1e2535]">
          <tr>
            <th className="p-2">Time</th>
            <th className="p-2">Email</th>
            <th className="p-2">Event</th>
            <th className="p-2">IP</th>
            <th className="p-2">User-Agent</th>
            <th className="p-2">Geo</th>
          </tr>
        </thead>
        <tbody>
          {trackingEvents.map((e) => (
            <tr key={e.id} className="border-b border-[#1e2535]/50 hover:bg-white/[0.02]">
              <td className="p-2 text-[#6b7a96]">{e.timestamp.split(' ')[1]}</td>
              <td className="p-2 text-green-400">{e.email}</td>
              <td className="p-2">
                <Badge
                  color={
                    e.eventType === 'opened' ? 'cyan' : e.eventType === 'clicked' ? 'amber' : 'red'
                  }
                >
                  {e.eventType}
                </Badge>
              </td>
              <td className="p-2 font-mono text-[#6b7a96]">{e.ip}</td>
              <td className="p-2 text-[9px] text-[#6b7a96]">{e.userAgent.split('/')[0]}</td>
              <td className="p-2">{e.geo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabSettings() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>SMTP Configuration</SectionTitle>
          <KVRow label="Server" value={phishingSettings.smtp.server} />
          <KVRow label="Port" value={phishingSettings.smtp.port.toString()} />
          <KVRow label="Encryption" value={phishingSettings.smtp.encryption} />
          <KVRow label="From" value={phishingSettings.smtp.from} />
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Phishing Domains</SectionTitle>
          {phishingSettings.domains.map((d) => (
            <div key={d} className="text-[10px] text-cyan-400 font-mono">
              {d}
            </div>
          ))}
          <ActionButton size="sm" variant="cyan" className="mt-2">
            Add Domain
          </ActionButton>
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Evilginx</SectionTitle>
          <KVRow label="Enabled" value={evilginxConfig.enabled ? 'Yes' : 'No'} />
          <KVRow label="Phishing domain" value={evilginxConfig.phishingDomain} />
          <KVRow label="Redirect URL" value={evilginxConfig.redirectUrl} />
          <KVRow label="Captures" value={evilginxConfig.captures.join(', ')} />
          <ActionButton size="sm" variant="amber">
            Evilginx Dashboard
          </ActionButton>
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-3">
          <SectionTitle>Captured Sessions</SectionTitle>
          {evilginxConfig.sessions.map((s) => (
            <KVRow key={s.id} label={s.capturedAt} value={`${s.ip} - ${s.token.slice(0, 20)}…`} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. MAIN EXPORT
// ============================================================================

const TABS = [
  'Campaigns',
  'Harvested Creds',
  'Email Templates',
  'Landing Pages',
  'Tracking',
  'Settings',
] as const;

export function Phishing() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ModuleTabBar
        tabs={TABS}
        active={activeTab}
        onTabChange={setActiveTab}
        activeColor="text-red-400 border-red-400 bg-red-500/5"
      />
      <Toolbar>
        <ToolbarButton variant="red">▶ Launch Campaign</ToolbarButton>
        <ToolbarButton>Clone Site</ToolbarButton>
        <ToolbarButton>Email Template</ToolbarButton>
        <ToolbarButton variant="amber">Evilginx Setup</ToolbarButton>
        <ToolbarButton>Macro Generator</ToolbarButton>
        <ToolbarButton className="ml-auto">Export Results</ToolbarButton>
      </Toolbar>
      {activeTab === 'Campaigns' && <TabCampaigns />}
      {activeTab === 'Harvested Creds' && <TabHarvestedCreds />}
      {activeTab === 'Email Templates' && <TabEmailTemplates />}
      {activeTab === 'Landing Pages' && <TabLandingPages />}
      {activeTab === 'Tracking' && <TabTracking />}
      {activeTab === 'Settings' && <TabSettings />}
    </div>
  );
}
