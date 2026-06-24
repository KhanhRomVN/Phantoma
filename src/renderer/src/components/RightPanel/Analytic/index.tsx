import React, { useState, useEffect } from 'react';
import { cn } from '../../../shared/lib/utils';
import { Activity, BarChart3, PieChart, TrendingUp, Clock, Zap } from 'lucide-react';

interface AnalyticData {
  totalRequests: number;
  averageResponseTime: number;
  successRate: number;
  requestsPerMinute: number;
  activeConnections: number;
  dataTransferred: string;
}

export function Analytic() {
  const [data, setData] = useState<AnalyticData>({
    totalRequests: 0,
    averageResponseTime: 0,
    successRate: 100,
    requestsPerMinute: 0,
    activeConnections: 0,
    dataTransferred: '0 KB',
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setData({
        totalRequests: Math.floor(Math.random() * 1000) + 100,
        averageResponseTime: Math.floor(Math.random() * 200) + 50,
        successRate: Math.floor(Math.random() * 20) + 80,
        requestsPerMinute: Math.floor(Math.random() * 60) + 10,
        activeConnections: Math.floor(Math.random() * 20) + 1,
        dataTransferred: `${(Math.random() * 10 + 0.5).toFixed(1)} MB`,
      });
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const stats = [
    {
      label: 'Total Requests',
      value: data.totalRequests.toLocaleString(),
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Avg Response Time',
      value: `${data.averageResponseTime}ms`,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Success Rate',
      value: `${data.successRate}%`,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Requests/min',
      value: data.requestsPerMinute,
      icon: Zap,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Active Connections',
      value: data.activeConnections,
      icon: PieChart,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Data Transferred',
      value: data.dataTransferred,
      icon: BarChart3,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={cn(
                'rounded-lg border border-border/50 p-3 transition-all hover:border-border hover:bg-dropdown-item-hover/20',
                stat.bgColor,
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={cn('w-3.5 h-3.5', stat.color)} />
                <span className="text-[10px] text-text-secondary font-medium">{stat.label}</span>
              </div>
              <div className={cn('text-sm font-bold', stat.color)}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart placeholder - can be extended with actual charts */}
      <div className="mt-4 rounded-lg border border-border/50 p-4 bg-dropdown-item-hover/10">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-text-secondary" />
          <span className="text-[10px] font-medium text-text-secondary">Request Trend</span>
        </div>
        <div className="h-24 flex items-end gap-1">
          {Array.from({ length: 20 }).map((_, i) => {
            const height = Math.floor(Math.random() * 80) + 20;
            return (
              <div
                key={i}
                className="flex-1 rounded-sm transition-all hover:opacity-80"
                style={{
                  height: `${height}%`,
                  background: `hsl(210, 100%, ${50 + (height / 100) * 30}%)`,
                  opacity: 0.6 + (height / 200),
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[8px] text-text-secondary/50">Now</span>
          <span className="text-[8px] text-text-secondary/50">Last 20s</span>
        </div>
      </div>
    </div>
  );
}