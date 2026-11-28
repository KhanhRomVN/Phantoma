import { useEffect, useState } from 'react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

import { TOTP_PERIOD } from '@shared/constants/totp.constants';
export { TOTP_PERIOD };

function base32Decode(input: string): Uint8Array<ArrayBuffer> {
  const clean = input.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error('Invalid base32 secret');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
      value &= (1 << bits) - 1;
    }
  }
  return new Uint8Array(out);
}

export async function generateTotp(secret: string, now = Date.now()): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    base32Decode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const counter = Math.floor(now / 1000 / TOTP_PERIOD);
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
  const off = mac[mac.length - 1] & 15;
  const bin =
    ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(bin % 1000000).padStart(6, '0');
}

export function useTotp(secret: string | null): {
  code: string | null;
  remaining: number;
  invalid: boolean;
} {
  const [code, setCode] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(TOTP_PERIOD);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!secret) {
      setCode(null);
      setInvalid(false);
      return;
    }
    let alive = true;
    const tick = (): void => {
      const now = Date.now();
      setRemaining(TOTP_PERIOD - (Math.floor(now / 1000) % TOTP_PERIOD));
      generateTotp(secret, now)
        .then((c) => {
          if (!alive) return;
          setCode(c);
          setInvalid(false);
        })
        .catch(() => {
          if (!alive) return;
          setCode(null);
          setInvalid(true);
        });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [secret]);

  return { code, remaining, invalid };
}