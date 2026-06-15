export type SecuritySeverity = 'high' | 'medium' | 'low' | 'info';

export interface SecurityIssue {
  id: string;
  title: string;
  description: string;
  severity: SecuritySeverity;
  evidence?: string;
  recommendation?: string;
}