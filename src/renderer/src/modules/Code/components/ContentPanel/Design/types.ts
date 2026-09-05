/**
 * ------------------------------------------------------------------
 * Design Tool Types
 * ------------------------------------------------------------------
 * Type definitions for the design tool system
 * ------------------------------------------------------------------
 */

export interface DesignProject {
  id: string;
  name: string;
  domain: string;
  pages: PageNode[];
  files?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface PageNode {
  id: string;
  name: string;
  tag: string; // e.g. "P01", "P02"
  route: string; // e.g. "/", "/menu", "/about"
  isRoot?: boolean;
  children?: string[]; // IDs of child pages
  componentPath: string; // relative path to React component
  position?: { x: number; y: number }; // for sitemap layout
}

export interface SelectedElement {
  id: string;
  label: string;
  type: 'text' | 'button' | 'image' | 'container' | 'nav';
  properties: ElementProperties;
}

export interface ElementProperties {
  // Typography
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  color?: string;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right';

  // Layout
  width?: string;
  height?: string;
  padding?: string;
  margin?: string;

  // Fill
  backgroundColor?: string;
  borderRadius?: number;
  border?: string;
}
