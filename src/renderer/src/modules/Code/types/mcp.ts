/**
 * ------------------------------------------------------------------
 * MCP Types
 * ------------------------------------------------------------------
 * Type definitions for Model Context Protocol (MCP) management.
 * MCPs are server implementations that provide context and tools
 * to AI agents.
 * ------------------------------------------------------------------
 */

export type MCPCategory =
  | 'database'
  | 'file-system'
  | 'web'
  | 'api'
  | 'cloud'
  | 'devtools'
  | 'productivity'
  | 'custom';

export type MCPStatus = 'not-installed' | 'installed' | 'running' | 'error';

export interface MCP {
  id: string;
  name: string;
  description: string;
  category: MCPCategory;
  author?: string;
  version?: string;
  homepage?: string;
  repository?: string;
  documentation?: string; // Markdown content
  command?: string;
  config?: Record<string, any>;
  status: MCPStatus;
  isRecommended?: boolean;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  installedAt?: number;
}

export type MCPInput = Omit<MCP, 'id' | 'createdAt' | 'updatedAt' | 'status'>;

export interface MCPFilter {
  category?: MCPCategory[];
  status?: MCPStatus[];
  search?: string;
  isRecommended?: boolean;
}
