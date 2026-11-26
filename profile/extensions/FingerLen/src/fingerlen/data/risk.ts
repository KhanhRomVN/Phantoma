/** Các key top-level KHÔNG phải group dữ liệu. */
export const META = ['titles', 'warnings', 'inverseScores', 'snapshot'];

/** Boolean "true = đáng chú ý": hiển thị vàng khi Yes, xanh khi No. Cũng được tính vào "Signals triggered" và điểm tổng quan. */
export const RISKY = new Set([
  'proxy', 'vpn', 'tor', 'hosting', 'dnsLeak', 'webrtcLeak', 'timezoneMismatch', 'webdriver', 'isSoftwareRenderer', 'antiFingerprintNoise', 'incognito',
  // CreepJS headless / automation flags
  'noChrome', 'hasPermissionsBug', 'noPlugins', 'noMimeTypes', 'notificationDenied', 'hasKnownBgColor', 'hasSwiftShader',
  'noWebShare', 'noContentIndex', 'noContactsManager', 'noTaskbar', 'noDownlinkMax', 'uaDataIsBlank', 'pdfIsDisabled',
  'hasHeadlessUA', 'hasHeadlessWorkerUA', 'hasBadChromeRuntime',
  // Tampering
  'hasHighChromeIndex', 'hasIframeProxy', 'hasToStringProxy', 'hasBadWebGL', 'hasVvpScreenRes',
]);

/** Đơn vị hiển thị sau giá trị. */
export const UNITS: Record<string, string> = {
  timezoneOffset: ' min', deviceMemory: ' GB', devicePixelRatio: '×', colorDepth: ' bit', pixelDepth: ' bit',
  hardwareConcurrency: ' cores', webglExtensionsCount: ' extensions', downlink: ' Mbps', rtt: ' ms',
  maxTextureSize: ' px', domrectScore: ' %', entropyBits: ' bits',
};
