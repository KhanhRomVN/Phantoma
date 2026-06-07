import React from 'react';
import type { DataPoint } from '../types/data-point';
import { SectionHeader } from './shared/SectionHeader';

interface TimelineClusterProps {
  dataPoints: DataPoint[];
}

interface TimelineGroup {
  date: string;
  label: string;
  items: DataPoint[];
}

export function TimelineCluster({ dataPoints }: TimelineClusterProps) {
  // Group data points by date (day granularity)
  const grouped = dataPoints.reduce((acc, dp) => {
    const date = dp.discoveredAt
      ? new Date(dp.discoveredAt).toISOString().split('T')[0]
      : 'Unknown';
    if (!acc[date]) acc[date] = [];
    acc[date].push(dp);
    return acc;
  }, {} as Record<string, DataPoint[]>);

  const timelineGroups: TimelineGroup[] = Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a)) // Most recent first
    .map(([date, items]) => ({
      date,
      label: date === 'Unknown' ? 'Unknown Date' : new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      items,
    }));

  if (timelineGroups.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🕐</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No timeline data available</span>
        <span className="text-[10px] font-mono text-[#3a4558]">Data points need timestamps for timeline view</span>
      </div>
    );
  }

  const categoryColors: Record<string, string> = {
    email: '#0af',
    phone: '#30d158',
    full_name: '#af52de',
    username: '#0a84ff',
    social_profile: '#0a84ff',
    domain: '#64d2ff',
    ip_address: '#ff6b35',
    password_leak: '#ff2d55',
    credential_leak: '#ff375f',
    darkweb_mention: '#af52de',
    breach_entry: '#ff375f',
    pastebin_entry: '#f5a623',
  };

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-3.5 top-2 bottom-2 w-px bg-[#1c2333]" />

        {timelineGroups.map((group, gi) => (
          <div key={group.date} className="mb-4 relative">
            {/* Timeline dot */}
            <div className="absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#0af] border-2 border-[#0f1319]" />

            {/* Date header */}
            <div className="mb-2">
              <span className="text-[12px] font-mono font-bold text-[#0af]">{group.label}</span>
              <span className="text-[10px] font-mono text-[#6a7a9a] ml-2">({group.items.length} items)</span>
            </div>

            {/* Items */}
            <div className="space-y-1">
              {group.items.map(dp => {
                const accentColor = categoryColors[dp.category] || '#6a7a9a';
                return (
                  <div
                    key={dp.id}
                    className="bg-[#0d1017] border border-[#1c2333] rounded p-2 hover:border-[#2a3548] transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
                      <span className="text-[11px] font-mono font-bold uppercase" style={{ color: accentColor }}>
                        {dp.label}
                      </span>
                      <span className="text-[9px] font-mono text-[#3a4558]">{dp.source.name}</span>
                    </div>
                    <div className="text-[12px] font-mono break-all" style={{ color: accentColor }}>
                      {dp.displayValue || String(dp.value).substring(0, 100)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}