import express, { Router } from 'express';
import { getDeviceFingerprint } from '../services/device-fingerprint.service';
import { handle } from '../utils/handle';
import { json } from '../utils/response';

export function registerSystemRoutes(): Router {
  const router = express.Router();

  router.get(
    '/system/device-fingerprint',
    handle(async (_req, res) => json(res, 200, await getDeviceFingerprint())),
  );

  return router;
}