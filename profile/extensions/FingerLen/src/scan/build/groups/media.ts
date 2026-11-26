import { type G, type Pages, put, flag } from '../helpers';
import { glassbox, GB } from '../glassbox';

const supported = (o: unknown): string | undefined => {
  const list = Object.entries((o || {}) as Record<string, string>).filter(([, v]) => v && v !== 'no').map(([k]) => k);
  return list.length ? list.join(', ') : undefined;
};

export function buildMedia(p: Pages): G {
  const js = p('bl-javascript'), cp = p('creepjs'), ss = p('sannysoft');
  const gb = glassbox(p);
  const m: G = {};

  if (typeof cp.devicesRaw === 'string') {
    const parts = cp.devicesRaw.toLowerCase().split(/[,\s]+/).filter(Boolean);
    m.audioInputDevices = parts.filter((x: string) => x === 'mic').length;
    m.audioOutputDevices = parts.filter((x: string) => x === 'audio').length;
    m.videoInputDevices = parts.filter((x: string) => x === 'webcam').length;
  }
  put(m, 'mediaLabelsVisible', flag(gb.row(GB.media, 'labels visible')));
  put(m, 'batteryLevel', js.batteryLevel ?? cp.batteryLevel);
  put(m, 'batteryCharging', js.batteryCharging ?? cp.batteryCharging);

  // API phần cứng: suy từ prototype của navigator (có thuộc tính ⇒ trình duyệt hỗ trợ API đó).
  const proto: string[] | undefined = ss.fpCollect?.navigatorPrototype;
  const has = (name: string) => (Array.isArray(proto) ? proto.some((s) => s.startsWith(name + '~~~')) : undefined);
  put(m, 'bluetoothAvailable', js.bluetoothAvailable ?? has('bluetooth'));
  put(m, 'usbAvailable', has('usb'));
  put(m, 'serialAvailable', has('serial'));
  put(m, 'hidAvailable', has('hid'));
  put(m, 'midiAvailable', has('requestMIDIAccess'));
  put(m, 'webApisAvailable', gb.row(GB.apis, 'available'));

  put(m, 'videoCodecs', supported(ss.fpCollect?.videoCodecs));
  put(m, 'audioCodecs', supported(ss.fpCollect?.audioCodecs));
  put(m, 'webAssemblyFeatures', gb.row(GB.wasm, 'features'));
  put(m, 'speechVoicesCount', js.speechVoicesCount ?? cp.speechVoicesCount);
  return m;
}
