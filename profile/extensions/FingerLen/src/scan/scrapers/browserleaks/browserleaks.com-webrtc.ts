import { clean, q, txt, until, set, bool, sleep } from '../_helpers';

/**
 * Scraper cho BrowserLeaks /webrtc — https://browserleaks.com/webrtc
 * 10 fields: Remote IP, WebRTC support, leak test, public IP, SDP log, media devices
 */
export async function scrapeBlWebrtc(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!txt('#rtc-leak') || !!txt('#rtc-public'), timeoutMs);
    await sleep(800); // cho ICE gathering kết thúc
    
    // Your Remote IP
    set(out, 'remoteIpv4', txt('#client-ipv4'));
    
    // WebRTC Support Detection
    set(out, 'rtcPeerConnection', bool(txt('#rtc-peerconnection')));
    set(out, 'rtcDataChannel', bool(txt('#rtc-datachannel')));
    
    // Your WebRTC IP
    set(out, 'webrtcLeakTest', txt('#rtc-leak'));
    set(out, 'publicIpAddress', txt('#rtc-public'));
    set(out, 'localIpAddress', txt('#rtc-local'));
    
    // Session Description
    set(out, 'sdpLog', txt('#sdp-log'));
    
    // Media Devices
    set(out, 'mediaDevicesApiSupport', bool(txt('#media-devices-api')));
    set(out, 'mediaDevicesPermissionAudio', txt('#media-permission-audio'));
    set(out, 'mediaDevicesPermissionVideo', txt('#media-permission-video'));
    set(out, 'mediaDevicesList', txt('#rtc-device-ids'));
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}