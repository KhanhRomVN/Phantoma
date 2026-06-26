// ─── Analytic Component ────────────────────────────────────────────────────

import React from 'react';
import { BarChart3, Activity, TrendingUp, Users } from 'lucide-react';

export function Analytic() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2 border-b border-divider bg-background shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-text-secondary" />
          <span className="text-sm font-bold text-text-primary">Analytic</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-card-background border border-border rounded-lg">
            <div className="flex items-center gap-2 text-text-secondary">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-medium">Requests</span>
            </div>
            <p className="text-2xl font-bold text-text-primary mt-1">2,847</p>
            <p className="text-[10px] text-green-500">+12.5% from last week</p>
          </div>
          <div className="p-3 bg-card-background border border-border rounded-lg">
            <div className="flex items-center gap-2 text-text-secondary">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Avg. Latency</span>
            </div>
            <p className="text-2xl font-bold text-text-primary mt-1">42ms</p>
            <p className="text-[10px] text-green-500">-8% from last week</p>
          </div>
        </div>

        <div className="p-3 bg-card-background border border-border rounded-lg">
          <div className="flex items-center gap-2 text-text-secondary">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium">Active Sessions</span>
          </div>
          <p className="text-2xl font-bold text-text-primary mt-1">12</p>
          <p className="text-[10px] text-text-secondary">3 sessions with high activity</p>
        </div>

        <div className="p-3 bg-card-background border border-border rounded-lg">
          <p className="text-xs font-semibold text-text-primary mb-2">Recent Activity</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">GET /api/v1/data</span>
              <span className="text-text-secondary">2 min ago</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">POST /api/v1/submit</span>
              <span className="text-text-secondary">15 min ago</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">GET /api/v1/status</span>
              <span className="text-text-secondary">1 hour ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}