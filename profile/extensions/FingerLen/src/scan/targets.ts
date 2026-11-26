import type { ScanTarget } from '../types';

/**
 * Danh sách trang sẽ được mở khi bấm "Run Check" — NGUỒN DUY NHẤT (background + UI đều dùng).
 *  - BrowserScan : điểm "authenticity", proxy / DNS leak / bot detection
 *  - BrowserLeaks: IP + vị trí, JavaScript, WebRTC, Canvas, WebGL, Fonts, ...
 *  - CreepJS     : fingerprint ID, headless / stealth, hash từng thành phần (trang chính + 13 tests)
 *  - SannySoft   : Antibot tests
 *  - GlassBox    : identity score + panels chi tiết
 */

const CREEPJS_BASE = 'https://abrahamjuliot.github.io/creepjs/';
const CREEPJS_TESTS = [
  'workers', 'iframes', 'fonts', 'timezone', 'window', 'screen', 'prototype',
  'domrect', 'emojis', 'math', 'machine', 'extensions', 'proxy',
];

const BL = 'https://browserleaks.com/';
const bl = (id: string, path: string, label: string, timeoutMs = 25000): ScanTarget =>
  ({ id: `bl-${id}`, site: 'browserleaks', siteLabel: 'BrowserLeaks', label, url: BL + path, timeoutMs });

const creepTest = (name: string): ScanTarget => ({
  id: `creepjs-${name}`, site: 'creepjs', siteLabel: 'CreepJS',
  label: name.charAt(0).toUpperCase() + name.slice(1),
  url: `${CREEPJS_BASE}tests/${name}.html`, timeoutMs: 40000,
});

export const SCAN_TARGETS: ScanTarget[] = [
  { id: 'bs-home', site: 'browserscan', siteLabel: 'BrowserScan', label: 'Home', url: 'https://www.browserscan.net/', timeoutMs: 30000 },
  bl('ip', 'ip', 'IP address'),
  bl('javascript', 'javascript', 'JavaScript'),
  bl('webrtc', 'webrtc', 'WebRTC'),
  bl('canvas', 'canvas', 'Canvas'),
  bl('webgl', 'webgl', 'WebGL'),
  bl('fonts', 'fonts', 'Fonts', 35000),
  bl('geo', 'geo', 'Geo location'),
  bl('tls', 'tls', 'TLS fingerprint'),
  bl('features', 'features', 'Features', 30000),
  bl('proxy', 'proxy', 'Proxy'),
  { id: 'creepjs', site: 'creepjs', siteLabel: 'CreepJS', label: 'Overview', url: CREEPJS_BASE, timeoutMs: 40000 },
  ...CREEPJS_TESTS.map(creepTest),
  { id: 'sannysoft', site: 'sannysoft', siteLabel: 'SannySoft', label: 'Antibot tests', url: 'https://bot.sannysoft.com/', timeoutMs: 35000 },
  { id: 'glassbox', site: 'glassbox', siteLabel: 'GlassBox', label: 'Identity score', url: 'https://glassbox.codecanary.org/', timeoutMs: 90000 },
];

/** Thời gian tối đa cho việc tải 1 tab (ms). */
export const TAB_LOAD_TIMEOUT_MS = 30000;
