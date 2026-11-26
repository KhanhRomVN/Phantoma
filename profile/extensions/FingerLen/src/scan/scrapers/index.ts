/**
 * Dispatcher: map pageId → scraper function.
 * Mỗi scraper là một function được SERIALIZE và chạy TRONG context của trang web.
 */

import { scrapeBlIp } from './browserleaks/browserleaks.com-ip';
import { scrapeBlJavascript } from './browserleaks/browserleaks.com-javascript';
import { scrapeBlWebrtc } from './browserleaks/browserleaks.com-webrtc';
import { scrapeBlCanvas } from './browserleaks/browserleaks.com-canvas';
import { scrapeBlWebgl } from './browserleaks/browserleaks.com-webgl';
import { scrapeBlFonts } from './browserleaks/browserleaks.com-fonts';
import { scrapeBlGeo } from './browserleaks/browserleaks.com-geo';
import { scrapeBlTls } from './browserleaks/browserleaks.com-tls';
import { scrapeBlFeatures } from './browserleaks/browserleaks.com-features';
import { scrapeBlProxy } from './browserleaks/browserleaks.com-proxy';
import { scrapeBsHome } from './browserscan/browserscan.net';
import { scrapeCreepjs } from './creepjs/abrahamjuliot.github.io-creepjs';
import { scrapeCreepjsTest } from './creepjs/abrahamjuliot.github.io-creepjs-tests';
import { scrapeSannysoftAntibot } from './sannysoft/bot.sannysoft.com';
import { scrapeGlassbox } from './glassbox/glassbox.codecanary.org';

export type ScraperFunction = (timeoutMs: number) => Promise<Record<string, any>>;
export type CreepjsTestScraperFunction = (pageId: string, timeoutMs: number) => Promise<Record<string, any>>;

export const SCRAPERS: Record<string, ScraperFunction | CreepjsTestScraperFunction> = {
  'bl-ip': scrapeBlIp,
  'bl-javascript': scrapeBlJavascript,
  'bl-webrtc': scrapeBlWebrtc,
  'bl-canvas': scrapeBlCanvas,
  'bl-webgl': scrapeBlWebgl,
  'bl-fonts': scrapeBlFonts,
  'bl-geo': scrapeBlGeo,
  'bl-tls': scrapeBlTls,
  'bl-features': scrapeBlFeatures,
  'bl-proxy': scrapeBlProxy,
  'bs-home': scrapeBsHome,
  'creepjs': scrapeCreepjs,
  'sannysoft': scrapeSannysoftAntibot,
  'glassbox': scrapeGlassbox,
};

// Các trang test CreepJS dùng chung 1 scraper
const CREEPJS_TESTS = ['workers', 'iframes', 'fonts', 'timezone', 'window', 'screen', 'prototype', 'domrect', 'emojis', 'math', 'machine', 'extensions', 'proxy'];
for (const test of CREEPJS_TESTS) {
  SCRAPERS[`creepjs-${test}`] = scrapeCreepjsTest;
}

export function getScraperForPage(pageId: string): ScraperFunction | CreepjsTestScraperFunction | null {
  return SCRAPERS[pageId] || null;
}