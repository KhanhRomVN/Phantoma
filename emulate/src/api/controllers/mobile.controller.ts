/**
 * ------------------------------------------------------------------
 * Mobile Controller
 * ------------------------------------------------------------------
 * Android / Genymotion device endpoints: device discovery, logcat,
 * SSL-pinning bypass, provisioning and transparent proxy.
 * ------------------------------------------------------------------
 */

import type { Request, Response } from 'express';
import { fail } from '../../utils/http-response.util';
import { getErrorMessage } from '../../utils/error.util';
import { listRunningGenymotionDevices } from '../../services/mobile/mobile-device.service';
import { logcatService } from '../../services/mobile/logcat.service';
import { sslBypassService } from '../../services/mobile/ssl-bypass.service';
import { deviceProvisionService } from '../../services/mobile/device-provision.service';
import { transparentProxyService } from '../../services/mobile/transparent-proxy.service';
import { proxyManager } from '../../services/proxy/proxy-manager.service';

const ok = <T>(res: Response, data: T): void => {
  res.json({ success: true, data });
};

export const mobileController = {
  /** GET /runtime/mobile/devices */
  async listDevices(_req: Request, res: Response): Promise<void> {
    try {
      ok(res, await listRunningGenymotionDevices());
    } catch (err) {
      fail(res, 500, getErrorMessage(err));
    }
  },

  /** POST /runtime/mobile/logcat/start */
  async startLogcat(req: Request, res: Response): Promise<void> {
    const { serial } = req.body;
    if (!serial) return fail(res, 400, 'serial is required');
    try {
      await logcatService.start(serial);
      ok(res, true);
    } catch (err) {
      fail(res, 500, getErrorMessage(err));
    }
  },

  /** POST /runtime/mobile/logcat/stop */
  async stopLogcat(_req: Request, res: Response): Promise<void> {
    await logcatService.stop();
    ok(res, true);
  },

  /** POST /runtime/mobile/ssl-bypass/start */
  async startSslBypass(req: Request, res: Response): Promise<void> {
    const { serial, packageName } = req.body;
    if (!serial || !packageName) return fail(res, 400, 'serial and packageName are required');
    try {
      await sslBypassService.start(serial, packageName);
      ok(res, true);
    } catch (err) {
      fail(res, 500, getErrorMessage(err));
    }
  },

  /** POST /runtime/mobile/ssl-bypass/stop */
  async stopSslBypass(req: Request, res: Response): Promise<void> {
    const { serial, packageName } = req.body;
    if (!serial || !packageName) return fail(res, 400, 'serial and packageName are required');
    await sslBypassService.stop(serial, packageName);
    ok(res, true);
  },

  /** POST /runtime/mobile/provision */
  async provision(req: Request, res: Response): Promise<void> {
    const { serial } = req.body;
    if (!serial) return fail(res, 400, 'serial is required');
    try {
      ok(res, await deviceProvisionService.provision(serial));
    } catch (err) {
      fail(res, 500, getErrorMessage(err));
    }
  },

  /** POST /runtime/mobile/transparent-proxy/start */
  async startTransparentProxy(req: Request, res: Response): Promise<void> {
    const { sessionId, iface } = req.body;
    if (!sessionId || !iface) return fail(res, 400, 'sessionId and iface are required');
    const session = proxyManager.getSession(sessionId);
    if (!session) return fail(res, 404, 'proxy session not found');
    try {
      ok(res, await transparentProxyService.start(sessionId, iface, session.port));
    } catch (err) {
      fail(res, 500, getErrorMessage(err));
    }
  },

  /** POST /runtime/mobile/transparent-proxy/stop */
  async stopTransparentProxy(req: Request, res: Response): Promise<void> {
    const { sessionId } = req.body;
    if (!sessionId) return fail(res, 400, 'sessionId is required');
    await transparentProxyService.stop(sessionId);
    ok(res, true);
  },

  /** GET /runtime/mobile/transparent-proxy/:sessionId */
  transparentProxyStatus(req: Request, res: Response): void {
    ok(res, transparentProxyService.status(req.params.sessionId));
  },

  /** POST /runtime/mobile/apps/list */
  async listApps(req: Request, res: Response): Promise<void> {
    const { serial } = req.body;
    if (!serial) return fail(res, 400, 'serial is required');
    try {
      ok(res, await logcatService.listPackages(serial));
    } catch (err) {
      fail(res, 500, getErrorMessage(err));
    }
  },
};
