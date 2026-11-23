/**
 * ------------------------------------------------------------------
 * Local-only Guard
 * ------------------------------------------------------------------
 * Các endpoint `/system/*` lộ thông tin nhạy cảm của máy (process, cổng mở,
 * log, lịch sử đăng nhập) nên mặc định chỉ chấp nhận request từ loopback.
 * Bật SYSTEM_ALLOW_REMOTE=true để cho phép máy khác trong mạng gọi.
 * ------------------------------------------------------------------
 */

import type { RequestHandler } from 'express';
import { AppError } from '../../errors/app.error';
import { isLoopbackAddress } from '../../utils/network.util';

export const createLocalOnlyGuard =
  (allowRemote: boolean): RequestHandler =>
  (req, _res, next) => {
    const remote = req.socket.remoteAddress ?? '';
    if (allowRemote || isLoopbackAddress(remote)) {
      next();
      return;
    }
    next(new AppError('System endpoints are only available from localhost', 403, 'LOCAL_ONLY'));
  };
