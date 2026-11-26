import { useEffect, useState } from 'react';
import { decodeQrText } from '../../../../shared/integrations/profile-bridge';
import { errorMessage } from '../../../../shared/utils/error';
import { parseWireGuardConf } from '../../utils/wireguard-parser';
import { isProtonFormValid } from './proton-validation';
import type { ProtonCredentials } from './proton.types';

interface UseProtonSetupOptions {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: ProtonCredentials) => Promise<void>;
}

/** State for the "Add ProtonVPN account" flow: credentials, config/QR import and submit. */
export function useProtonSetup({ isOpen, onClose, onCreate }: UseProtonSetupOptions) {
  const [email, setEmail] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [peerKey, setPeerKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conf, setConf] = useState('');
  const [drag, setDrag] = useState(false);
  const [hint, setHint] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setConf('');
      setDrag(false);
      setHint(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPrivateKey('');
      setPeerKey('');
      setEndpoint('');
      setReveal(false);
      setBusy(false);
      setError(null);
    }
  }, [isOpen]);

  const applyConf = (text: string): void => {
    setConf(text);
    if (!text.trim()) {
      setHint(null);
      return;
    }
    const parsed = parseWireGuardConf(text);
    if (!parsed) {
      setHint({ ok: false, text: 'No PrivateKey, PublicKey and Endpoint found in this text.' });
      return;
    }
    if (parsed.email) setEmail(parsed.email);
    setPrivateKey(parsed.privateKey);
    setPeerKey(parsed.peerPublicKey);
    setEndpoint(parsed.endpoint);
    setHint({ ok: true, text: 'Fields filled from the configuration.' });
  };

  const applyImage = async (file: Blob): Promise<void> => {
    try {
      applyConf(await decodeQrText(file));
    } catch (err) {
      setHint({ ok: false, text: err instanceof Error ? err.message : 'Failed to read image.' });
    }
  };

  const pasteClipboard = async (): Promise<void> => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          await applyImage(await item.getType(imageType));
          return;
        }
      }
      const text = await navigator.clipboard.readText();
      if (text.trim()) applyConf(text);
      else setHint({ ok: false, text: 'Clipboard has no image or configuration text.' });
    } catch {
      setHint({ ok: false, text: 'Cannot read the clipboard.' });
    }
  };

  const valid = isProtonFormValid({ email, privateKey, peerKey, endpoint });

  const submit = async (): Promise<void> => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate({
        email: email.trim(),
        privateKey: privateKey.trim(),
        peerPublicKey: peerKey.trim(),
        endpoint: endpoint.trim(),
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return {
    email,
    setEmail,
    privateKey,
    setPrivateKey,
    peerKey,
    setPeerKey,
    endpoint,
    setEndpoint,
    reveal,
    setReveal,
    busy,
    error,
    conf,
    drag,
    setDrag,
    hint,
    applyConf,
    applyImage,
    pasteClipboard,
    valid,
    submit,
  };
}

export type ProtonSetup = ReturnType<typeof useProtonSetup>;
