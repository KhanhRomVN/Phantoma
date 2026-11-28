/**
 * DashboardOverview — composition của StatsGrid, ModelDistribution và UsageChart.
 */

import React, { useMemo } from 'react';
import StatsGrid from './StatsGrid';
import ModelDistribution from './ModelDistribution';
import UsageChart from './UsageChart';
import type { StatsPeriod, StatsSnapshot } from '../data/dashboard.types';

interface DashboardOverviewProps {
  stats: StatsSnapshot;
  totalAccounts: number;
  providerFavicons: Record<string, string>;
  statsPeriod: StatsPeriod;
}

function percentChange(current?: number, previous?: number): number | null {
  return previous && current ? ((current - previous) / previous) * 100 : null;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  totalAccounts,
  providerFavicons,
  statsPeriod,
}) => {
  const percentChanges = useMemo(() => {
    const sorted = [...stats.dailyUsage].sort((a, b) => b.date.localeCompare(a.date));
    const [latest, previous] = sorted;
    return {
      tokens: percentChange(latest?.tokens, previous?.tokens),
      requests: percentChange(latest?.requests, previous?.requests),
    };
  }, [stats.dailyUsage]);

  return (
    <>
      <StatsGrid
        periodTokens={stats.periodTokens}
        periodRequests={stats.periodRequests}
        favoriteModel={stats.favoriteModel}
        totalAccounts={totalAccounts}
        percentChanges={percentChanges}
      />
      <ModelDistribution
        modelDistribution={stats.modelDistribution}
        providerFavicons={providerFavicons}
        title="AI Model Distribution"
        emptyText="Loading history..."
      />
      <UsageChart usage={stats.dailyUsage} title="Usage" period={statsPeriod} />
    </>
  );
};

export default React.memo(DashboardOverview);
