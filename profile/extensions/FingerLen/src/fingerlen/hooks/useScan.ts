import { useCallback, useEffect, useState } from 'react';
import { SCAN_STATE_KEY, type ScanCommand, type ScanState } from '../../types';

const IDLE: ScanState = { phase: 'idle', progress: 0, pages: {} };

/** Đồng bộ trạng thái quét từ background (chrome.storage.session) và gửi lệnh Start / Stop. */
export function useScan() {
  const [state, setState] = useState<ScanState>(IDLE);

  useEffect(() => {
    let alive = true;
    chrome.storage.session.get(SCAN_STATE_KEY).then((r) => {
      if (alive && r[SCAN_STATE_KEY]) setState(r[SCAN_STATE_KEY] as ScanState);
    });
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'session' && changes[SCAN_STATE_KEY]) setState((changes[SCAN_STATE_KEY].newValue as ScanState) || IDLE);
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => { alive = false; chrome.storage.onChanged.removeListener(onChanged); };
  }, []);

  const send = (cmd: ScanCommand) => chrome.runtime.sendMessage(cmd);
  const run = useCallback(() => { void send({ type: 'scan:start' }); }, []);
  const stop = useCallback(() => { void send({ type: 'scan:stop' }); }, []);

  return { ...state, run, stop };
}
