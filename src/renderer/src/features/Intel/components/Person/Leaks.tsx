import type { DataPoint } from '../../types/person/data-point';
import type { SmartCategoryGroup } from '../../types/person/smart-category';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { StatBox } from '../../components/shared/StatBox';
import { DataTable } from '../../components/shared/DataTable';

interface LeaksProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Leaks({ dataPoints, activeGroup }: LeaksProps) {
  const passwordLeaks = dataPoints.filter((dp) => dp.category === 'leak_password').length;
  const credentialLeaks = dataPoints.filter((dp) => dp.category === 'leak_credential').length;
  const darkwebMentions = dataPoints.filter((dp) => dp.category === 'leak_darkweb_mention').length;
  const highSeverity = dataPoints.filter(
    (dp) => dp.riskScore !== undefined && dp.riskScore >= 75,
  ).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🛡️</span>
        <span className="text-[12px] font-mono text-[#30d158]">No leak exposure found ✓</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="Breaches" value={passwordLeaks} sub="passwords" accent="#ff375f" />
        <StatBox label="Credentials" value={credentialLeaks} sub="leaked" accent="#ff2d55" />
        <StatBox label="Dark Web" value={darkwebMentions} sub="mentions" accent="#ff2d55" />
        <StatBox
          label="High Risk"
          value={highSeverity}
          sub="items"
          accent={highSeverity > 0 ? '#ff2d55' : '#30d158'}
        />
      </div>

      {highSeverity > 0 && (
        <div className="bg-[#ff2d5510] border border-[#ff2d5530] rounded p-2 mb-3">
          <span className="text-[11px] font-mono text-[#ff2d55]">
            ⚠ {highSeverity} high-severity leak(s) detected — immediate password audit recommended
          </span>
        </div>
      )}

      {darkwebMentions > 0 && (
        <div className="bg-[#ff2d5510] border border-[#ff2d5530] rounded p-2 mb-3">
          <span className="text-[11px] font-mono text-[#ff2d55]">
            ⚠ {darkwebMentions} dark web mention(s) — potential targeting or doxing interest
          </span>
        </div>
      )}

      <SectionHeader accent="#ff375f">Leak Exposure & Breaches</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source', 'risk']}
        maxRows={100}
      />
    </div>
  );
}
