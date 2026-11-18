export type ScheduleTargetKind = 'device' | 'group';

export interface Schedule {
  id: string;
  name: string;
  scriptId: string;
  targetKind: ScheduleTargetKind;
  targetId: string;
  cron: string;
  nextRun: string;
  enabled: boolean;
  lastStatus: 'success' | 'failed' | null;
}