import express, { Router } from 'express';
import { handle } from '../../utils/http';
import type { ProfileBrowserDataController } from '../controllers/profile-browser-data.controller';

export function createProfileBrowserDataRoutes(c: ProfileBrowserDataController): Router {
  const router = express.Router();

  router.get('/browser/executables', handle(c.listExecutables));
  router.get('/system/device-fingerprint', handle(c.deviceFingerprint));

  router.get('/profiles/:id/folder', handle(c.folderInfo));
  router.get('/profiles/:id/avatar', handle(c.avatar));
  router.get('/profiles/:id/google-login', handle(c.googleLogin));
  router.get('/profiles/:id/domain-session', handle(c.domainSession));
  router.get('/profiles/:id/saved-logins', handle(c.savedLogins));
  router.get('/profiles/:id/extension-state', handle(c.extensionState));
  router.get('/profiles/:id/history', handle(c.history));

  router.post('/passwords/reuse', handle(c.passwordReuse));
  router.get('/profiles/:id/passwords', handle(c.listPasswords));
  router.post('/profiles/:id/passwords', handle(c.addPassword));
  router.put('/profiles/:id/passwords/:passwordId', handle(c.updatePassword));
  router.delete('/profiles/:id/passwords/:passwordId', handle(c.removePassword));

  router.get('/profiles/:id/fingerprint-history', handle(c.listFingerprintHistory));
  router.delete('/profiles/:id/fingerprint-history/:entryId', handle(c.removeFingerprintHistory));

  return router;
}