import type { FootprintPreset, OsFamily } from '@renderer/services/fingerprint-generator';

export const FOOTPRINT_QUERY_KEYS = ['os', 'browser', 'gpu', 'lang', 'tz'];

export const OS_FAMILIES: { id: OsFamily; label: string }[] = [
  { id: 'windows', label: 'Windows' },
  { id: 'macos', label: 'macOS' },
  { id: 'linux', label: 'Linux' },
  { id: 'android', label: 'Android' },
];


const PRESET_SEEDS: Omit<FootprintPreset, 'deviceClass' | 'browserMajor'>[] = [
  { id: 'win11-chrome', name: 'Windows 11 · Chrome 124', family: 'windows', os: 'Windows 11', browser: 'Chrome 124', screen: '1920×1080', gpu: 'NVIDIA GeForce RTX 3060', cores: 12, memory: 16, lang: 'en-US', tz: 'America/New_York', cc: 'US', usage: 38, tag: 'Most used', tone: 'success' },
  { id: 'win10-chrome', name: 'Windows 10 · Chrome 123', family: 'windows', os: 'Windows 10', browser: 'Chrome 123', screen: '1366×768', gpu: 'Intel UHD Graphics 620', cores: 4, memory: 8, lang: 'en-US', tz: 'America/Chicago', cc: 'US', usage: 24, tag: 'Low detection', tone: 'info' },
  { id: 'win11-edge', name: 'Windows 11 · Edge 124', family: 'windows', os: 'Windows 11', browser: 'Edge 124', screen: '2560×1440', gpu: 'AMD Radeon RX 6700 XT', cores: 8, memory: 16, lang: 'en-GB', tz: 'Europe/London', cc: 'GB', usage: 9, tag: 'Rare', tone: 'warn' },
  { id: 'win10-de', name: 'Windows 10 · Chrome 124 (DE)', family: 'windows', os: 'Windows 10', browser: 'Chrome 124', screen: '1920×1080', gpu: 'NVIDIA GeForce GTX 1660', cores: 6, memory: 16, lang: 'de-DE', tz: 'Europe/Berlin', cc: 'DE', usage: 7, tag: 'Regional', tone: 'info' },
  { id: 'win10-vn', name: 'Windows 10 · Chrome 124 (VN)', family: 'windows', os: 'Windows 10', browser: 'Chrome 124', screen: '1920×1080', gpu: 'NVIDIA GeForce GTX 1650', cores: 6, memory: 8, lang: 'vi-VN', tz: 'Asia/Ho_Chi_Minh', cc: 'VN', usage: 8, tag: 'Regional', tone: 'info' },
  { id: 'win11-jp', name: 'Windows 11 · Chrome 124 (JP)', family: 'windows', os: 'Windows 11', browser: 'Chrome 124', screen: '1920×1080', gpu: 'NVIDIA GeForce RTX 3050', cores: 8, memory: 16, lang: 'ja-JP', tz: 'Asia/Tokyo', cc: 'JP', usage: 6, tag: 'Regional', tone: 'info' },
  { id: 'mac-m2', name: 'macOS Sonoma · Chrome 124', family: 'macos', os: 'macOS 14', browser: 'Chrome 124', screen: '1512×982', gpu: 'Apple M2', cores: 8, memory: 16, lang: 'en-US', tz: 'America/Los_Angeles', cc: 'US', usage: 17, tag: 'Popular', tone: 'primary' },
  { id: 'mac-m1-safari', name: 'macOS Ventura · Safari 17', family: 'macos', os: 'macOS 13', browser: 'Safari 17', screen: '1440×900', gpu: 'Apple M1', cores: 8, memory: 8, lang: 'en-GB', tz: 'Europe/London', cc: 'GB', usage: 11, tag: 'Popular', tone: 'primary' },
  { id: 'mac-sg', name: 'macOS Sonoma · Chrome 124 (SG)', family: 'macos', os: 'macOS 14', browser: 'Chrome 124', screen: '1728×1117', gpu: 'Apple M3 Pro', cores: 12, memory: 18, lang: 'en-US', tz: 'Asia/Singapore', cc: 'SG', usage: 5, tag: 'Regional', tone: 'info' },
  { id: 'ubuntu', name: 'Ubuntu 22.04 · Chrome 124', family: 'linux', os: 'Linux', browser: 'Chrome 124', screen: '1920×1080', gpu: 'Mesa Intel UHD 630', cores: 4, memory: 8, lang: 'en-US', tz: 'Europe/Berlin', cc: 'DE', usage: 4, tag: 'Niche', tone: 'muted' },
  { id: 'fedora-ff', name: 'Fedora 39 · Firefox 125', family: 'linux', os: 'Linux', browser: 'Firefox 125', screen: '2560×1440', gpu: 'AMD Radeon RX 580', cores: 8, memory: 16, lang: 'en-US', tz: 'Europe/Paris', cc: 'FR', usage: 3, tag: 'Niche', tone: 'muted' },
  { id: 'pixel-8', name: 'Android 14 · Chrome 124', family: 'android', os: 'Android 14', browser: 'Chrome 124', screen: '412×915', gpu: 'Mali-G715', cores: 9, memory: 8, lang: 'en-US', tz: 'America/Chicago', cc: 'US', usage: 14, tag: 'Mobile', tone: 'warn' },
  { id: 'galaxy-vn', name: 'Android 13 · Chrome 123 (VN)', family: 'android', os: 'Android 13', browser: 'Chrome 123', screen: '384×854', gpu: 'Adreno 730', cores: 8, memory: 8, lang: 'vi-VN', tz: 'Asia/Ho_Chi_Minh', cc: 'VN', usage: 10, tag: 'Mobile', tone: 'warn' },
];

export const FOOTPRINT_PRESETS: FootprintPreset[] = PRESET_SEEDS.map((p) => ({
  ...p,
  deviceClass: p.family === 'android' ? 'mobile' : 'desktop',
  browserMajor: parseInt(p.browser.match(/\d+/)?.[0] ?? '0', 10),
}));