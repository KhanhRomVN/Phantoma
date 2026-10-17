/**
 * Browser Session Types
 */
import type { Browser, Page } from 'puppeteer';

export interface BrowserSession {
  targetId: string;
  browser: Browser;
  pages: Map<string, Page>; // tabId -> Page
  activeTabId: string | null;
  pid?: number;
  createdAt: number;
}

export interface TabInfo {
  id: string;
  url: string;
  title: string;
  isActive: boolean;
}

export interface LaunchOptions {
  targetId: string;
  executablePath?: string;
  headless?: boolean;
  args?: string[];
}