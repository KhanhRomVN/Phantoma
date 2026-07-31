export type PayloadType = 'list' | 'numbers' | 'brute';

export function getRequestCategory(req: {
  type?: string;
  path?: string;
  protocol?: string;
}): string {
  const type = (req.type || '').toLowerCase();

  if (type.includes('xhr') || type.includes('fetch')) return 'xhr';
  if (type.includes('js') || type.includes('script') || req.path?.match(/\.js(\?|$)/)) return 'js';
  if (type.includes('css') || req.path?.match(/\.css(\?|$)/)) return 'css';
  if (
    type.includes('img') ||
    type.includes('image') ||
    type.includes('png') ||
    type.includes('jpg') ||
    type.includes('jpeg') ||
    type.includes('gif') ||
    type.includes('svg') ||
    type.includes('ico') ||
    type.includes('webp') ||
    req.path?.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)(\?|$)/)
  )
    return 'img';
  if (
    type.includes('media') ||
    type.includes('video') ||
    type.includes('audio') ||
    req.path?.match(/\.(mp4|webm|ogg|mp3|wav)(\?|$)/)
  )
    return 'media';
  if (
    type.includes('font') ||
    type.includes('woff') ||
    type.includes('ttf') ||
    req.path?.match(/\.(woff|woff2|ttf|otf|eot)(\?|$)/)
  )
    return 'font';
  if (
    type.includes('ws') ||
    type.includes('websocket') ||
    req.protocol === 'ws' ||
    req.protocol === 'wss'
  )
    return 'ws';
  if (type.includes('wasm') || req.path?.match(/\.wasm(\?|$)/)) return 'wasm';
  if (type.includes('manifest') || req.path?.match(/manifest\.json(\?|$)/)) return 'manifest';
  if (
    type.includes('doc') ||
    type.includes('html') ||
    type.includes('document') ||
    (!type && !req.path?.includes('.'))
  )
    return 'doc';

  return 'other';
}
