import type { AppContainer } from '../../bootstrap/container';
import { sendSuccess } from '../../utils/http-response.util';
import { asyncHandler } from '../middleware/async-handler.middleware';

export function createDeviceController({ deviceFingerprint }: AppContainer) {
  return {
    fingerprint: asyncHandler(async (_req, res) => sendSuccess(res, await deviceFingerprint.get())),
  };
}
