import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Compass, Monitor, Box, Clock, ShieldCheck, Mic, Languages, Puzzle, Laptop, ShieldAlert, Layers,
  Fingerprint, MapPin, Server, Wifi, Cpu, Bot, Volume2, Palette, FlaskConical, Film, Cable,
} from 'lucide-react';
import { NetHero, UaHero, ScreenHero, GlHero, TzHero, DetHero, MediaHero, type HeroProps } from './components/heroes';

export interface TabSpecEntry {
  hero: ComponentType<HeroProps>;
  /** Field đã được hero hiển thị (không lặp lại trong sections). */
  used: string[];
  /** [tiêu đề, icon, các field]. Field có trong dữ liệu nhưng không khai báo ở đây tự vào section "Other". */
  sections: [string, LucideIcon, string[]][];
  /** Mô tả tab (hiển thị dưới title). */
  desc?: string;
}

/**
 * Cấu hình hiển thị từng tab. Nguồn dữ liệu của mỗi field: scan/build/groups/<tab>.ts
 * (field trong `sections` mà build không tạo ra sẽ hiện "n/a" — hãy xoá hoặc thêm extractor).
 */
export const TAB_SPEC: Record<string, TabSpecEntry> = {
  network: {
    hero: NetHero, used: ['ip', 'ipVersion', 'proxy', 'vpn', 'tor', 'hosting', 'dnsLeak', 'webrtcLeak'],
    desc: 'Network identity, location, and WebRTC leak detection',
    sections: [
      ['Location', MapPin, ['country', 'countryCode', 'region', 'city', 'coordinates', 'locationAlt']],
      ['Network', Server, ['isp', 'org', 'asn', 'usageType', 'networkDomain', 'anonymous', 'vpnCheck']],
      ['Timezone vs IP', Clock, ['ipTimezone', 'timezoneMismatch']],
      ['WebRTC', Wifi, ['webrtcSupported', 'hostCandidates', 'stunCandidates']],
    ],
  },
  navigator: {
    hero: UaHero, used: ['userAgent'],
    desc: 'Browser identity, language, hardware, and privacy settings',
    sections: [
      ['Identity', Compass, ['platform', 'vendor', 'browserBuild', 'uaFullVersion', 'uaBrands', 'uaArchitecture', 'uaBitness', 'uaMobile', 'uaReduction']],
      ['Language', Languages, ['language', 'languages']],
      ['Hardware', Cpu, ['hardwareConcurrency', 'deviceMemory', 'maxTouchPoints', 'storageQuota']],
      ['Connection', Cable, ['connectionType', 'downlink', 'rtt', 'saveData']],
      ['Privacy and features', ShieldCheck, ['doNotTrack', 'cookieEnabled', 'pdfViewerEnabled', 'webdriver']],
      ['Plugins', Puzzle, ['pluginsCount', 'mimeTypesCount']],
    ],
  },
  screen: {
    hero: ScreenHero, used: ['screenWidth', 'screenHeight', 'availWidth', 'availHeight', 'innerWidth', 'innerHeight', 'outerWidth', 'outerHeight'],
    desc: 'Display resolution, pixel ratio, color depth, and input capabilities',
    sections: [
      ['Display', Monitor, ['devicePixelRatio', 'colorDepth', 'pixelDepth', 'orientation', 'multiMonitor']],
      ['Input', Laptop, ['touchSupport', 'pointerType']],
      ['OS preferences', Palette, ['prefersColorScheme', 'colorGamut', 'hdr', 'reducedMotion', 'forcedColors', 'scrollbarWidth']],
    ],
  },
  webgl: {
    hero: GlHero, used: ['gpuModel', 'gpuArchitecture', 'isSoftwareRenderer'],
    desc: 'GPU renderer, WebGL capabilities, canvas hashes, and fingerprint protection',
    sections: [
      ['Renderer', Box, ['webglVendor', 'webglRenderer', 'webglVersion', 'shadingLanguageVersion', 'webglContext', 'gpuVendor']],
      ['Capabilities', Layers, ['webglExtensionsCount', 'webglParamsHash', 'maxTextureSize']],
      ['Render hashes', Fingerprint, ['canvas2dHash', 'canvasTextHash', 'webglImageHash', 'glImageHash', 'webglPixelHash']],
      ['Protection', ShieldCheck, ['antiFingerprintNoise', 'canvasStable']],
    ],
  },
  timezone: {
    hero: TzHero, used: ['timezone', 'timezoneName', 'dateStringSample'],
    desc: 'Timezone offset, locale, and internationalization settings',
    sections: [
      ['Timezone', Clock, ['timezoneOffset', 'hour12', 'observesDst']],
      ['Locale and Intl', Languages, ['locale', 'calendar', 'numberingSystem', 'intlDateTimeFormat']],
    ],
  },
  detection: {
    hero: DetHero, used: ['headlessScore', 'likeHeadlessScore', 'stealthScore'],
    desc: 'Headless browser detection, automation indicators, and tampering signs',
    sections: [
      ['Headless indicators', Bot, ['noChrome', 'hasHeadlessUA', 'hasHeadlessWorkerUA', 'hasBadChromeRuntime', 'hasPermissionsBug', 'noPlugins', 'noMimeTypes', 'pdfIsDisabled', 'notificationDenied', 'hasKnownBgColor', 'hasSwiftShader']],
      ['Missing APIs', Puzzle, ['noWebShare', 'noContentIndex', 'noContactsManager', 'noTaskbar', 'noDownlinkMax', 'uaDataIsBlank']],
      ['Tampering', ShieldAlert, ['hasHighChromeIndex', 'hasIframeProxy', 'hasToStringProxy', 'hasBadWebGL', 'hasVvpScreenRes']],
      ['Integrity tests', FlaskConical, ['prototypeLies', 'domrectScore', 'iframesPassed', 'machinePassed', 'timezonePassed', 'extensionsFound', 'extensionsProbed']],
      ['Bot tests', Bot, ['botTestsPassed', 'botTestsFailed', 'fpScannerFailed']],
      ['Browser', Compass, ['chromiumDetected', 'prefersLightColor', 'incognito']],
    ],
  },
  media: {
    hero: MediaHero, used: ['audioInputDevices', 'audioOutputDevices', 'videoInputDevices', 'gamepadsCount', 'batteryLevel', 'batteryCharging'],
    desc: 'Media devices, battery status, hardware APIs, and speech synthesis',
    sections: [
      ['Devices', Mic, ['mediaLabelsVisible']],
      ['Hardware APIs', Layers, ['bluetoothAvailable', 'usbAvailable', 'serialAvailable', 'hidAvailable', 'midiAvailable', 'webApisAvailable']],
      ['Codecs and runtime', Film, ['videoCodecs', 'audioCodecs', 'webAssemblyFeatures']],
      ['Speech', Volume2, ['speechVoicesCount']],
    ],
  },
};
