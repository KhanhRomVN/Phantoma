/** Từ viết tắt được giữ hoa trong label(). */
export const ACR: Record<string, string> = {
  ip: 'IP', dns: 'DNS', webrtc: 'WebRTC', webgl: 'WebGL', gpu: 'GPU', isp: 'ISP', asn: 'ASN', vpn: 'VPN', fp: 'FP', id: 'ID', ua: 'UA',
  hdr: 'HDR', hid: 'HID', usb: 'USB', midi: 'MIDI', dst: 'DST', rtt: 'RTT', apis: 'APIs', gl: 'GL', hw: 'HW', pdf: 'PDF' };

/** Boolean "true = đáng chú ý": hiển thị vàng khi Yes, xanh khi No. */

export const TITLES: Record<string, string> = {
  overview: 'Overview', fingerprint: 'Fingerprint', network: 'Network', navigator: 'Navigator',
  screen: 'Screen', webgl: 'WebGL & Canvas', timezone: 'Timezone & Locale', detection: 'Detection', media: 'Media & Hardware',
};

/** Khung rỗng hiển thị trước khi quét: giữ đúng thứ tự tab trong sidebar. */
export const EMPTY_DATA = {
  titles: TITLES,
  overview: {}, fingerprint: {}, network: {}, navigator: {}, screen: {},
  webgl: {}, timezone: {}, detection: {}, media: {},
};
