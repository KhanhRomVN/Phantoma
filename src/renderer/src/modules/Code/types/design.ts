/**
 * ------------------------------------------------------------------
 * Design Types
 * ------------------------------------------------------------------
 * Type definitions for design management system.
 * Designs are HTML-based UI mockups that can be created, edited,
 * and previewed within the Code module.
 * ------------------------------------------------------------------
 */

export interface Design {
  id: string;
  name: string;
  description?: string;
  html: string;
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

export type DesignInput = Omit<Design, 'id' | 'createdAt' | 'updatedAt'>;
