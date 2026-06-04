// src/renderer/src/features/Tool/components/WorkspaceSection/Cloud/index.tsx
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
// 1. MOCK DATA CHI TIẾT
// ============================================================================

// ---- AWS Resources ----
interface CloudResource {
  id: string;
  type: string;
  name: string;
  region: string;
  issue: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  detail?: string;
  remediation?: string;
}

const awsResources: CloudResource[] = [
  {
    id: 's3-1',
    type: 'S3',
    name: 'prod-backup-2024',
    region: 'us-east-1',
    issue: 'Publicly readable',
    severity: 'CRITICAL',
    detail: 'ACL: public-read — Contains backup files with PII',
    remediation: 'Make bucket private, enable Block Public Access',
  },
  {
    id: 'iam-1',
    type: 'IAM',
    name: 'legacy-admin-user',
    region: 'global',
    issue: 'AdminAccess policy attached',
    severity: 'CRITICAL',
    detail: 'No MFA, access keys 847 days old',
    remediation: 'Rotate keys, enforce MFA, remove excessive privileges',
  },
  {
    id: 'ec2-1',
    type: 'EC2',
    name: 'web-server-01',
    region: 'us-west-2',
    issue: 'SSH open to 0.0.0.0/0',
    severity: 'HIGH',
    detail: '',
    remediation: 'Restrict SSH to trusted IP ranges',
  },
  {
    id: 'sg-1',
    type: 'SG',
    name: 'default-sg',
    region: 'us-east-1',
    issue: 'All ports open (0.0.0.0/0)',
    severity: 'CRITICAL',
    detail: '',
    remediation: 'Remove overly permissive rules, apply least privilege',
  },
  {
    id: 'rds-1',
    type: 'RDS',
    name: 'prod-mysql',
    region: 'us-east-1',
    issue: 'Publicly accessible',
    severity: 'HIGH',
    detail: 'Database exposed to internet',
    remediation: 'Disable public accessibility, use VPC',
  },
  {
    id: 'lambda-1',
    type: 'Lambda',
    name: 'process-payments',
    region: 'us-east-1',
    issue: 'Environment variable contains plaintext secret',
    severity: 'HIGH',
    detail: 'AWS_SECRET_KEY=AKIA... in env',
    remediation: 'Use Secrets Manager or KMS',
  },
];

// ---- GCP Resources ----
const gcpResources: CloudResource[] = [
  {
    id: 'gcs-1',
    type: 'GCS',
    name: 'public-bucket-2024',
    region: 'us-central1',
    issue: 'Bucket allows allUsers read',
    severity: 'CRITICAL',
    detail: 'allUsers: READ access',
    remediation: 'Remove allUsers ACL, use IAM',
  },
  {
    id: 'gce-1',
    type: 'GCE',
    name: 'prod-instance-01',
    region: 'us-central1',
    issue: 'Default service account with Editor role',
    severity: 'HIGH',
    detail: '',
    remediation: 'Use least-privilege custom SA',
  },
  {
    id: 'sql-1',
    type: 'Cloud SQL',
    name: 'postgres-prod',
    region: 'us-central1',
    issue: 'Public IP enabled',
    severity: 'MEDIUM',
    detail: '',
    remediation: 'Use private IP, enable SSL',
  },
  {
    id: 'iam-2',
    type: 'IAM',
    name: 'legacy-editor',
    region: 'global',
    issue: 'User has Owner role',
    severity: 'CRITICAL',
    detail: 'Unused for 180 days',
    remediation: 'Remove or rotate credentials',
  },
];

// ---- Azure Resources ----
const azureResources: CloudResource[] = [
  {
    id: 'blob-1',
    type: 'Blob',
    name: 'prod-files',
    region: 'westus',
    issue: 'Public container',
    severity: 'CRITICAL',
    detail: 'Anonymous read access',
    remediation: 'Set container to private',
  },
  {
    id: 'vm-1',
    type: 'VM',
    name: 'win-prod',
    region: 'westus',
    issue: 'RDP open to internet',
    severity: 'HIGH',
    detail: '',
    remediation: 'Use Just-In-Time access',
  },
  {
    id: 'ad-1',
    type: 'Azure AD',
    name: 'guest-users',
    region: 'global',
    issue: 'Guest user has Global Admin',
    severity: 'CRITICAL',
    detail: 'guest@external.com',
    remediation: 'Review guest access, enforce MFA',
  },
];

// ---- Kubernetes Audit Data ----
interface K8sIssue {
  type: 'Cluster' | 'Pod' | 'Secret' | 'RBAC';
  name: string;
  issue: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  detail: string;
}

const k8sIssues: K8sIssue[] = [
  {
    type: 'Cluster',
    name: 'prod-k8s-01',
    issue: 'K8s version 1.24.0 (outdated)',
    severity: 'HIGH',
    detail: 'Multiple known CVEs, upgrade to 1.28+',
  },
  {
    type: 'Cluster',
    name: 'API Server',
    issue: 'Anonymous auth enabled',
    severity: 'CRITICAL',
    detail: '--anonymous-auth=true',
  },
  {
    type: 'Cluster',
    name: 'Dashboard',
    issue: 'Exposed publicly via LoadBalancer',
    severity: 'CRITICAL',
    detail: 'No authentication required',
  },
  {
    type: 'Pod',
    name: 'nginx-pod',
    issue: 'privileged: true',
    severity: 'CRITICAL',
    detail: 'Container escape possible',
  },
  {
    type: 'Pod',
    name: 'payment-processor',
    issue: 'Run as root (securityContext.runAsNonRoot=false)',
    severity: 'HIGH',
    detail: 'Should run as non-root',
  },
  {
    type: 'Secret',
    name: 'db-secret',
    issue: 'Stored in environment variables',
    severity: 'MEDIUM',
    detail: 'DB_PASSWORD exposed in pod env',
  },
  {
    type: 'RBAC',
    name: 'default ServiceAccount',
    issue: 'cluster-admin role binding',
    severity: 'CRITICAL',
    detail: 'Default SA has admin access',
  },
];

// ---- IAM Data ----
interface IAMRole {
  name: string;
  policies: string[];
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
  details: string;
  lastUsed?: string;
}

const iamRoles: IAMRole[] = [
  {
    name: 'AdministratorAccess',
    policies: ['AdministratorAccess'],
    risk: 'HIGH',
    details: 'Full admin permissions, no MFA enforced',
    lastUsed: '2025-06-01',
  },
  {
    name: 'legacy-admin-user',
    policies: ['AdministratorAccess'],
    risk: 'HIGH',
    details: 'Access keys 847 days old, no rotation',
    lastUsed: '2025-05-28',
  },
  {
    name: 'dev-role',
    policies: ['AmazonS3FullAccess', 'AmazonEC2FullAccess', 'AmazonRDSFullAccess'],
    risk: 'HIGH',
    details: 'Overly permissive for development',
    lastUsed: '2025-06-02',
  },
  {
    name: 'ci-cd-role',
    policies: ['IAMPassRole'],
    risk: 'HIGH',
    details: 'Can pass any role to EC2 → privilege escalation',
    lastUsed: '2025-06-03',
  },
  {
    name: 'readonly-role',
    policies: ['ReadOnlyAccess'],
    risk: 'LOW',
    details: 'Least privilege, okay',
    lastUsed: '2025-06-01',
  },
];

// ---- Compliance Frameworks ----
interface ComplianceFramework {
  name: string;
  score: number;
  color: 'red' | 'amber' | 'green';
  controls: { id: string; status: 'pass' | 'fail' | 'warning'; description: string }[];
}

const complianceData: ComplianceFramework[] = [
  {
    name: 'CIS AWS v1.5',
    score: 34,
    color: 'red',
    controls: [
      { id: '1.1', status: 'fail', description: 'Avoid root user usage' },
      { id: '1.2', status: 'fail', description: 'MFA enabled for root' },
      { id: '1.3', status: 'fail', description: 'Access keys rotated' },
      { id: '2.1', status: 'pass', description: 'CloudTrail enabled' },
    ],
  },
  {
    name: 'PCI DSS 3.2',
    score: 58,
    color: 'amber',
    controls: [
      { id: '2.2', status: 'fail', description: 'Default passwords changed' },
      { id: '3.4', status: 'pass', description: 'Cardholder data encrypted' },
    ],
  },
  { name: 'HIPAA', score: 62, color: 'amber', controls: [] },
];

// ---- Reports ----
const cloudReports = [
  {
    id: 'CLD-001',
    name: 'AWS Security Audit - June 2025',
    date: '2025-06-01',
    findings: 14,
    critical: 5,
    high: 6,
    medium: 3,
  },
  {
    id: 'CLD-002',
    name: 'K8s Hardening Assessment',
    date: '2025-05-25',
    findings: 7,
    critical: 3,
    high: 2,
    medium: 2,
  },
  {
    id: 'CLD-003',
    name: 'IAM Least Privilege Review',
    date: '2025-05-20',
    findings: 8,
    critical: 2,
    high: 4,
    medium: 2,
  },
];

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

function ResourceCard({ resource }: { resource: CloudResource }) {
  const severityColor = {
    CRITICAL: 'border-red-500/20 bg-red-500/5',
    HIGH: 'border-amber-500/20 bg-amber-500/5',
    MEDIUM: 'border-cyan-500/20 bg-cyan-500/5',
    LOW: 'border-green-500/20 bg-green-500/5',
  };
  return (
    <div className={cn('border rounded p-2.5 mb-2', severityColor[resource.severity])}>
      <div className="flex items-center gap-2 mb-1">
        <div
          className={cn(
            'w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center shrink-0',
            resource.type === 'S3'
              ? 'bg-amber-500/15 text-amber-400'
              : resource.type === 'IAM'
                ? 'bg-purple-500/12 text-purple-400'
                : resource.type === 'EC2'
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : resource.type === 'SG'
                    ? 'bg-red-500/12 text-red-400'
                    : resource.type === 'RDS'
                      ? 'bg-green-500/12 text-green-400'
                      : 'bg-gray-500/12 text-gray-400',
          )}
        >
          {resource.type}
        </div>
        <span className="flex-1 text-[11px] font-semibold text-[#c5cfe0] truncate">
          {resource.name}
        </span>
        <SeverityPill level={resource.severity} />
      </div>
      <div className="text-[10.5px] text-red-400 mb-1">{resource.issue}</div>
      {resource.detail && <div className="text-[10px] text-[#6b7a96] mb-1">{resource.detail}</div>}
      {resource.remediation && (
        <div className="text-[9px] text-green-400 mt-1">Fix: {resource.remediation}</div>
      )}
    </div>
  );
}

// ============================================================================
// 3. TAB COMPONENTS
// ============================================================================

// ---- AWS Tab ----
function TabAWS() {
  const [selectedProvider, setSelectedProvider] = useState('aws');
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-2">
        {awsResources.map((r) => (
          <ResourceCard key={r.id} resource={r} />
        ))}
      </div>
      <div className="mt-3 text-[10px] text-[#3d4a61] italic">
        * AWS Config & Security Hub integrated. 14 total issues found.
      </div>
    </div>
  );
}

// ---- GCP Tab ----
function TabGCP() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-2">
        {gcpResources.map((r) => (
          <ResourceCard key={r.id} resource={r} />
        ))}
      </div>
    </div>
  );
}

// ---- Azure Tab ----
function TabAzure() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-2">
        {azureResources.map((r) => (
          <ResourceCard key={r.id} resource={r} />
        ))}
      </div>
    </div>
  );
}

// ---- Kubernetes Tab ----
function TabKubernetes() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="mb-3">
        <SectionTitle>Cluster: prod-k8s-01 (v1.24.0)</SectionTitle>
        <KVRow label="API Server" value="Anonymous auth: ON" valueColor="text-red-400" />
        <KVRow
          label="Dashboard"
          value="Exposed via LoadBalancer (no auth)"
          valueColor="text-red-400"
        />
        <KVRow
          label="RBAC"
          value="default ServiceAccount → cluster-admin"
          valueColor="text-red-400"
        />
        <KVRow label="Network Policy" value="Not enforced" valueColor="text-amber-400" />
      </div>
      <div>
        <SectionTitle>K8s Security Issues</SectionTitle>
        {k8sIssues.map((issue, i) => (
          <div
            key={i}
            className={cn(
              'border rounded p-2 mb-2',
              issue.severity === 'CRITICAL'
                ? 'border-red-500/20 bg-red-500/5'
                : issue.severity === 'HIGH'
                  ? 'border-amber-500/20 bg-amber-500/5'
                  : 'border-cyan-500/20 bg-cyan-500/5',
            )}
          >
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold">
                {issue.type}: {issue.name}
              </span>
              <SeverityPill level={issue.severity} />
            </div>
            <div className="text-[10.5px] text-red-400">{issue.issue}</div>
            <div className="text-[10px] text-[#6b7a96] mt-1">{issue.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- IAM Tab ----
function TabIAM() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="mb-3">
        <SectionTitle>Over-Privileged Roles / Users</SectionTitle>
        <table className="w-full text-[11px]">
          <thead className="border-b border-[#1e2535]">
            <tr>
              <th className="text-left p-2 text-[#3d4a61]">Role/User</th>
              <th className="text-left p-2 text-[#3d4a61]">Policies</th>
              <th className="text-left p-2 text-[#3d4a61]">Risk</th>
              <th className="text-left p-2 text-[#3d4a61]">Last Used</th>
            </tr>
          </thead>
          <tbody>
            {iamRoles.map((role) => (
              <tr key={role.name} className="border-b border-[#1e2535] hover:bg-[#111520]">
                <td className="p-2 font-mono text-cyan-400">{role.name}</td>
                <td className="p-2 text-[#c5cfe0]">{role.policies.join(', ')}</td>
                <td className="p-2">
                  <SeverityPill level={role.risk} />
                </td>
                <td className="p-2 text-[#6b7a96]">{role.lastUsed || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <SectionTitle>Policy Analysis</SectionTitle>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-2 mb-2">
          <div className="text-[11px] font-semibold text-amber-400">IAM:PassRole</div>
          <div className="text-[10px] text-[#c5cfe0]">
            ci-cd-role can pass any role to EC2 → privilege escalation to admin.
          </div>
        </div>
        <div className="bg-[#111520] border border-[#1e2535] rounded p-2">
          <div className="text-[11px] font-semibold text-red-400">AdministratorAccess</div>
          <div className="text-[10px] text-[#c5cfe0]">
            Two active users with full admin rights, no MFA enforced.
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Compliance Tab ----
function TabCompliance() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-3">
        {complianceData.map((fw) => (
          <div key={fw.name} className="bg-[#111520] border border-[#1e2535] rounded p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[12px] font-semibold text-cyan-400">{fw.name}</span>
              <span className={`text-[11px] font-bold text-${fw.color}-400`}>{fw.score}%</span>
            </div>
            <ProgressBar pct={fw.score} color={fw.color} />
            <div className="mt-2 text-[10px] text-[#6b7a96]">
              Passed: 0, Failed: {fw.controls.length}
            </div>
            {fw.controls.length > 0 && (
              <details className="mt-2">
                <summary className="text-[9.5px] text-cyan-400 cursor-pointer">
                  Show controls
                </summary>
                <div className="mt-1 space-y-1">
                  {fw.controls.map((ctrl) => (
                    <div key={ctrl.id} className="text-[9px] flex gap-2">
                      <span className={ctrl.status === 'fail' ? 'text-red-400' : 'text-green-400'}>
                        {ctrl.status === 'fail' ? '🔴' : '🟢'}
                      </span>
                      <span className="text-[#c5cfe0]">{ctrl.id}</span>
                      <span className="text-[#6b7a96]">{ctrl.description}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 p-2 bg-[#111520] border border-[#1e2535] rounded">
        <SectionTitle>Recommendations</SectionTitle>
        <ul className="list-disc list-inside text-[10px] text-[#c5cfe0] space-y-1">
          <li>Enable AWS Config and Security Hub for continuous compliance</li>
          <li>Implement automated remediation for S3 public buckets</li>
          <li>Enforce MFA for all IAM users with console access</li>
          <li>Rotate access keys every 90 days</li>
          <li>Upgrade Kubernetes to 1.28+ and enable Pod Security Standards</li>
        </ul>
      </div>
    </div>
  );
}

// ---- Reports Tab ----
function TabReports() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <div className="grid grid-cols-2 gap-2">
        {cloudReports.map((r) => (
          <div key={r.id} className="bg-[#111520] border border-[#1e2535] rounded p-3">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[12px] font-semibold text-cyan-400">{r.name}</span>
              <Badge color="gray">{r.date}</Badge>
            </div>
            <div className="grid grid-cols-4 gap-1 mb-3">
              <div className="text-center">
                <div className="text-red-400 font-bold">{r.critical}</div>
                <div className="text-[9px] text-[#6b7a96]">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-red-400 font-bold">{r.high}</div>
                <div className="text-[9px] text-[#6b7a96]">High</div>
              </div>
              <div className="text-center">
                <div className="text-amber-400 font-bold">{r.medium}</div>
                <div className="text-[9px] text-[#6b7a96]">Medium</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-bold">0</div>
                <div className="text-[9px] text-[#6b7a96]">Low</div>
              </div>
            </div>
            <div className="flex gap-2">
              <ActionButton size="sm" variant="cyan">
                View
              </ActionButton>
              <ActionButton size="sm">Export PDF</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 4. MAIN EXPORT
// ============================================================================

const TABS = ['AWS', 'GCP', 'Azure', 'Kubernetes', 'IAM', 'Compliance', 'Reports'] as const;

export function Cloud() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'AWS':
        return <TabAWS />;
      case 'GCP':
        return <TabGCP />;
      case 'Azure':
        return <TabAzure />;
      case 'Kubernetes':
        return <TabKubernetes />;
      case 'IAM':
        return <TabIAM />;
      case 'Compliance':
        return <TabCompliance />;
      case 'Reports':
        return <TabReports />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ModuleTabBar
        tabs={TABS}
        active={activeTab}
        onTabChange={setActiveTab}
        activeColor="text-cyan-400 border-cyan-400 bg-cyan-500/5"
      />
      <Toolbar>
        <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] whitespace-nowrap">
          Provider:
        </span>
        <ToolbarButton variant={activeTab === 'AWS' ? 'cyan' : 'default'}>AWS</ToolbarButton>
        <ToolbarButton variant={activeTab === 'GCP' ? 'cyan' : 'default'}>GCP</ToolbarButton>
        <ToolbarButton variant={activeTab === 'Azure' ? 'cyan' : 'default'}>Azure</ToolbarButton>
        <TbSep />
        <ToolbarButton variant="red">▶ Audit All</ToolbarButton>
        <ToolbarButton>K8s Audit</ToolbarButton>
        <ToolbarButton>IAM Enum</ToolbarButton>
        <ToolbarButton className="ml-auto">Export Report</ToolbarButton>
      </Toolbar>
      {renderTabContent()}
    </div>
  );
}
