import { type G, type Pages, put, flag, ipTokens, sameTimezone } from '../helpers';
import { glassbox, GB } from '../glassbox';

export function buildNetwork(p: Pages): G {
  const bs = p('bs-home'), ip = p('bl-ip'), js = p('bl-javascript'), rtc = p('bl-webrtc'), cp = p('creepjs');
  const gb = glassbox(p);
  const n: G = {};

  put(n, 'ip', ip.ip || rtc.remoteIp);
  if (n.ip) n.ipVersion = String(n.ip).includes(':') ? 'IPv6' : 'IPv4';
  put(n, 'country', ip.country);
  put(n, 'countryCode', ip.countryCode);
  put(n, 'region', ip.region);
  put(n, 'city', ip.city);
  if (ip.lat != null && ip.lon != null) n.coordinates = `${ip.lat}, ${ip.lon}`;
  put(n, 'locationAlt', gb.identity.location?.replace(/^\p{Regional_Indicator}{2}\s*/u, ''));
  put(n, 'isp', ip.isp || bs.bsIsp);
  put(n, 'org', ip.org);
  put(n, 'asn', ip.asn);
  put(n, 'usageType', ip.usageType);
  put(n, 'networkDomain', gb.row(GB.ip, 'network domain'));
  put(n, 'ipTimezone', ip.ipTimezone);
  if (js.timeZone && ip.ipTimezone) n.timezoneMismatch = !sameTimezone(js.timeZone, ip.ipTimezone);
  put(n, 'proxy', flag(bs.bsProxy));
  // GlassBox chỉ trả "possible VPN (soft signals)" → hiển thị nguyên văn, không ép thành true/false.
  put(n, 'vpnCheck', gb.row(GB.ip, 'VPN / proxy check'));
  put(n, 'hosting', ip.usageType ? /data ?center|hosting|server|cdn/i.test(ip.usageType) : undefined);
  put(n, 'dnsLeak', flag(bs.bsDnsLeak));
  put(n, 'anonymous', flag(bs.bsAnonymous));

  /* WebRTC */
  put(n, 'webrtcSupported', rtc.peerConnection);
  const remote = ipTokens(rtc.remoteIp || ip.ip).find((t) => !t.includes(':'));
  const rtcPublic = ipTokens(rtc.rtcPublic).filter((t) => !t.endsWith('.local'));
  if (rtc.rtcPublic !== undefined || rtc.rtcLeak !== undefined) {
    if (remote && rtcPublic.length) n.webrtcLeak = rtcPublic.some((t) => !t.includes(':') && t !== remote);
  }
  const hostC = ipTokens(rtc.rtcLocal);
  if (!hostC.length && cp.hostCandidate) hostC.push(cp.hostCandidate);
  if (hostC.length) n.hostCandidates = hostC;
  const stunC = rtcPublic.length ? rtcPublic : cp.stunCandidate ? [cp.stunCandidate] : [];
  if (stunC.length) n.stunCandidates = stunC;
  return n;
}
