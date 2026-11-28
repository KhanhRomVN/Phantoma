import jsQR from 'jsqr';

export function extractTotpSecret(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol === 'otpauth:') {
      return url.searchParams.get('secret')?.replace(/\s+/g, '').toUpperCase() || null;
    }
  } catch {
    // not a URL, fall through
  }
  const compact = text.replace(/[\s-]+/g, '');
  if (/^[A-Z2-7]+=*$/i.test(compact)) return compact.toUpperCase().replace(/=+$/, '');
  return null;
}

// jsQR is sensitive to image size, so the same image is tried at several scales
const SCAN_SIZES = [1200, 800, 500, 300, 2000];

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Cannot load image.'));
    };
    img.src = url;
  });
}

function imageDataAt(img: HTMLImageElement, maxSide: number): ImageData {
  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas not supported.');
  // transparent pixels read as black and hide the QR, so paint a white background first
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export async function decodeQrText(blob: Blob): Promise<string> {
  const img = await loadImage(blob);
  for (const size of SCAN_SIZES) {
    const data = imageDataAt(img, size);
    const result = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' });
    if (result?.data) return result.data;
  }
  throw new Error('No QR code found in the image.');
}

export async function decodeTotpFromImage(blob: Blob): Promise<string> {
  const text: string | null = await decodeQrText(blob);
  if (text) {
    const offending = text.replace(/[A-Z2-7]/gi, '');
    const counts: Record<string, number> = {};
    for (const ch of offending) counts[ch] = (counts[ch] ?? 0) + 1;
  }
  if (!text) throw new Error('No QR code found in the image.');
  if (text.startsWith('otpauth-migration:')) {
    throw new Error(
      'This is a Google Authenticator export QR. Export a single account or use the setup key instead.',
    );
  }
  const secret = extractTotpSecret(text);
  if (!secret) throw new Error('QR code does not contain a valid TOTP secret.');
  return secret;
}
