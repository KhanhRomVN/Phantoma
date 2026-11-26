export const FP_IDS: [string, string, string][] = [
  ['fpId', 'Fingerprint ID', 'Exact match · changes when any signal changes'],
  ['fuzzyFp', 'Fuzzy fingerprint', 'Tolerant match · survives small changes'],
];

export const FP_CAPS: Record<string, string> = {
  canvasHash: '2D drawing output', webglHash: 'GPU rendering output', audioHash: 'Audio stack response',
  fontsHash: 'Installed font set', timezoneHash: 'Time zone and locale', screenHash: 'Display geometry',
};

/** Hash lấy từ các trang test chi tiết (CreepJS tests, GlassBox). */
export const FP_EXTRA_CAPS: Record<string, string> = {
  fontsTestHash: 'Fonts test (detailed)', timezoneTestHash: 'Timezone test (detailed)', screenTestHash: 'Screen test (detailed)',
  mathHash: 'JS engine math', emojisHash: 'Emoji rendering', proxyHash: 'Function.toString proxy test',
  extensionsHash: 'Extension probe', workersHash: 'Worker scope data',
  hwHash: 'Hardware profile', engineHash: 'Browser engine', buildHash: 'Browser build', sessionHash: 'This session only',
};

/** Hash tổng trong thẻ "Capability hashes". */
export const FP_MAIN_HASHES = ['canvasHash', 'webglHash', 'audioHash', 'fontsHash', 'timezoneHash', 'screenHash'] as const;

/** Các dòng trong thẻ "Identity profile". */
export const FP_PROFILE = ['identityBand', 'entropyBits', 'crowdSize', 'canvasUniqueness'] as const;
