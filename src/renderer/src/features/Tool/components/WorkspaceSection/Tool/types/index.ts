import React from 'react';

export type ToolCategory = 'Network' | 'Web' | 'Exploit' | 'OSINT' | 'Vuln';

export type SecurityTool = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  shortDescription: string;
  category: ToolCategory;
  tags: string[];
  testCommand?: string;
  component: React.ComponentType<any>;
  apiEndpoint: string;
  method: 'GET' | 'POST';
  status: 'stable' | 'beta' | 'experimental';
  speed: 'fast' | 'medium' | 'slow';
} & (
  | { websiteUrl: string; icon?: never; color?: never }
  | { websiteUrl?: never; icon: string; color: string }
);
