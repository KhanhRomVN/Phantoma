import type { DataPoint } from '../../types/person/data-point';
import type { SmartCategoryGroup } from '../../types/person/smart-category';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { StatBox } from '../../components/shared/StatBox';
import { DataTable } from '../../components/shared/DataTable';

interface NoiseProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Noise({ dataPoints, activeGroup }: NoiseProps) {
  const collisions = dataPoints.filter((dp) => dp.category === 'noise_username_collision').length;
  const falsePositives = dataPoints.filter((dp) =>
    ['noise_breach_false_positive', 'noise_social_false_positive'].includes(dp.category),
  ).length;
  const ipConflicts = dataPoints.filter((dp) => dp.category === 'noise_ip_conflict').length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🔇</span>
        <span className="text-[12px] font-mono text-[#30d158]">No noise/false positives ✓</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Total" value={dataPoints.length} sub="noise items" accent="#6a7a9a" />
        <StatBox label="Collisions" value={collisions} sub="usernames" accent="#f5a623" />
        <StatBox label="False Pos." value={falsePositives} sub="breaches/social" accent="#6a7a9a" />
      </div>

      {dataPoints.length > 0 && (
        <div className="bg-[#f5a62310] border border-[#f5a62330] rounded p-2 mb-3">
          <span className="text-[11px] font-mono text-[#f5a623]">
            ℹ These results are likely NOT related to the target. They represent username
            collisions, false positives from breach databases, or unrelated mentions.
          </span>
        </div>
      )}

      <SectionHeader accent="#6a7a9a">Noise & False Positives</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source']}
        maxRows={100}
      />
    </div>
  );
}
