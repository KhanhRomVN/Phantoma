/**
 * Đọc/ghi nội dung params/headers/body của fuzzer qua emulateApi
 * (fuzzer lưu trong fuzzer.json phía server). Logic replace/validate
 * nằm ở UpdateFuzzerContentExecutor.
 */

import { emulateApi } from '@renderer/modules/Emulate/shared/api/emulate.api';

export type FuzzerTarget = 'params' | 'headers' | 'body';

export class UpdateFuzzerContentHandler {
  public async read(targetId: string, fuzzerId: string, target: FuzzerTarget): Promise<string> {
    const res = await emulateApi.getRequest(targetId, fuzzerId);
    if (!res.success || !res.data) throw new Error(res.error || 'Fuzzer not found');
    const raw = res.data[target] ?? '';
    if (target === 'body') return raw;
    try {
      return JSON.stringify(JSON.parse(raw || '[]'), null, 2);
    } catch {
      return raw;
    }
  }

  public async write(
    targetId: string,
    fuzzerId: string,
    target: FuzzerTarget,
    content: string,
  ): Promise<void> {
    const res = await emulateApi.updateRequest(targetId, fuzzerId, { [target]: content });
    if (!res.success) throw new Error(res.error || 'Failed to update fuzzer');
  }
}