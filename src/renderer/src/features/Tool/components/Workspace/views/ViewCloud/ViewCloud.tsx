import { cn } from '../../../../../../shared/lib/utils'
import { KVRow } from '../../../ui/KVRow'
import { ToolbarButton } from '../../../ui/ToolbarButton'
import { ProgressBar } from '../../../ui/ProgressBar'
import { Badge } from '../../../ui/Badge'

const AWS_RESOURCES = [
  { icon:'S3',  iconBg:'bg-amber-500/15 text-amber-400',   name:'prod-backup-2024',  issue:'🔴 Public!',                    issueColor:'text-red-400',   detail:'ACL: public-read — Contains sensitive files', border:'border-red-500/20' },
  { icon:'IAM', iconBg:'bg-purple-500/12 text-purple-400', name:'legacy-admin-user', issue:'🔴 AdministratorAccess',         issueColor:'text-red-400',   detail:'No MFA · Keys 847 days old',                  border:'border-red-500/20' },
  { icon:'EC2', iconBg:'bg-cyan-500/10 text-cyan-400',     name:'web-server-01',     issue:'🟡 SSH open 0.0.0.0/0',         issueColor:'text-amber-400', detail:'',                                            border:'border-amber-500/20' },
  { icon:'SG',  iconBg:'bg-red-500/12 text-red-400',       name:'default-sg',        issue:'🔴 All ports open',             issueColor:'text-red-400',   detail:'',                                            border:'border-red-500/20' },
]
const COMPLIANCE = [
  { label:'CIS AWS', pct:34, color:'red'   },
  { label:'PCI DSS', pct:58, color:'amber' },
  { label:'HIPAA',   pct:62, color:'amber' },
]
const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />
const SectionTitle = ({children}:{children:React.ReactNode}) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-2">{children}</div>
)

export function ViewCloud() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
        <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] whitespace-nowrap">Provider:</span>
        <ToolbarButton variant="cyan">AWS</ToolbarButton>
        <ToolbarButton>GCP</ToolbarButton>
        <ToolbarButton>Azure</ToolbarButton>
        <TbSep />
        <ToolbarButton variant="red">▶ Audit All</ToolbarButton>
        <ToolbarButton>K8s Audit</ToolbarButton>
        <ToolbarButton>IAM Enum</ToolbarButton>
        <ToolbarButton className="ml-auto">Export Report</ToolbarButton>
      </div>
      <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
        {/* Resources */}
        <div className="flex flex-col bg-[#141924] overflow-hidden" style={{width:'33%'}}>
          <div className="flex items-center gap-2 px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
            <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em] flex-1">AWS Resources</span>
            <Badge color="red">14 issues</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {AWS_RESOURCES.map((r) => (
              <div key={r.name} className={cn('bg-[#111520] border rounded p-2.5', r.border)}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center shrink-0', r.iconBg)}>{r.icon}</span>
                  <span className="flex-1 text-[11px] font-semibold text-[#c5cfe0] truncate">{r.name}</span>
                  <span className={cn('text-[10px] shrink-0', r.issueColor)}>{r.issue}</span>
                </div>
                {r.detail && <div className="text-[10px] text-[#6b7a96] ml-8">{r.detail}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* K8s */}
        <div className="flex flex-col bg-[#141924] overflow-hidden" style={{width:'33%'}}>
          <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
            <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em]">Kubernetes Audit</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div>
              <SectionTitle>Cluster: prod-k8s-01</SectionTitle>
              <KVRow label="Version"    value="1.24.0 (outdated)"           valueColor="text-amber-400" />
              <KVRow label="API Server" value="Anonymous auth: ON"          valueColor="text-red-400" />
              <KVRow label="Dashboard"  value="Exposed publicly!"           valueColor="text-red-400" />
              <KVRow label="RBAC"       value="cluster-admin on default SA" valueColor="text-amber-400" />
            </div>
            <div>
              <SectionTitle>Pod Issues</SectionTitle>
              <div className="bg-[#111520] border border-red-500/20 rounded p-2 mb-2">
                <div className="text-[10.5px] font-semibold text-red-400">privileged: true in nginx-pod</div>
                <div className="text-[10px] text-[#6b7a96]">Container escape possible</div>
              </div>
              <div className="bg-[#111520] border border-amber-500/20 rounded p-2">
                <div className="text-[10.5px] font-semibold text-amber-400">Secrets in ENV variables</div>
                <div className="text-[10px] text-[#6b7a96]">DB_PASSWORD=prod_secret123 in 3 pods</div>
              </div>
            </div>
          </div>
        </div>

        {/* IAM */}
        <div className="flex flex-col bg-[#141924] overflow-hidden" style={{width:'34%'}}>
          <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
            <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em]">IAM Enumeration</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div>
              <SectionTitle>Over-Privileged Roles</SectionTitle>
              <KVRow label="legacy-admin" value="AdministratorAccess"      valueColor="text-red-400" />
              <KVRow label="dev-role"     value="S3:*, EC2:*, RDS:*"      valueColor="text-amber-400" />
              <KVRow label="ci-cd-role"   value="IAM:PassRole (dangerous)" valueColor="text-amber-400" />
            </div>
            <div>
              <SectionTitle>Compliance</SectionTitle>
              {COMPLIANCE.map((c) => (
                <div key={c.label} className="mb-2">
                  <div className="flex justify-between text-[10px] text-[#6b7a96] mb-1">
                    <span>{c.label}</span>
                    <span className={`text-${c.color}-400`}>{c.pct}%</span>
                  </div>
                  <ProgressBar pct={c.pct} color={c.color as any} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
