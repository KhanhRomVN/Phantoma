/** Giải thích hiển thị khi một field bị gắn cờ cảnh báo. */
export const HINTS: Record<string, string> = {
  uniquenessScore: 'Your fingerprint is fairly distinctive, so sites can recognise this browser more easily.',
  anonymityScore: 'A smaller crowd looks like you, which makes your traffic easier to link across sites.',
  extensionsDetected: 'Sites can detect installed extensions, and the combination adds to your fingerprint.',
  dnsLeak: 'DNS lookups may bypass your proxy or VPN and expose the resolver you really use.',
  webrtcLeak: 'WebRTC can reveal an IP address different from the one your browser connects with.',
  doNotTrack: 'An unset or unusual Do Not Track value is one more signal that sets you apart.',
  timezoneMismatch: 'Your browser timezone differs from the timezone of your IP, which looks like a proxy or a spoofed profile.',
  devicePixelRatio: 'Uncommon display scaling narrows the group of browsers that look like yours.',
  antiFingerprintNoise: 'Noise on canvas and WebGL protects you, but it can also mark you as a privacy-tool user.',
  intlCurrency: "Currency comes from the locale. If it doesn't fit your region, the profile can look inconsistent.",
  likeHeadlessScore: 'Some traits resemble an automated, headless browser and may trigger bot checks.',
  speechVoicesCount: 'No speech voices is typical of minimal or headless setups, and real desktops usually have some.',
};
