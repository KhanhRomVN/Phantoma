import express, { Router } from 'express';
import type { BrowserSessionsController } from '../controllers/browser-sessions.controller';
import type { BrowserUpdatesController } from '../controllers/browser-updates.controller';
import type { ProfileActivityController } from '../controllers/profile-activity.controller';
import type { ProfileBrowserDataController } from '../controllers/profile-browser-data.controller';
import type { ProfileJobsController } from '../controllers/profile-jobs.controller';
import type { ProfilesController } from '../controllers/profiles.controller';
import type { QueriesController } from '../controllers/queries.controller';
import type { ServiceEmailsController } from '../controllers/service-emails.controller';
import type { ServicesController } from '../controllers/services.controller';
import type { SessionsController } from '../controllers/sessions.controller';
import type { SourceImportsController } from '../controllers/source-imports.controller';
import type { SourcesController } from '../controllers/sources.controller';
import { createBrowserSessionsRoutes } from './browser-sessions.routes';
import { createBrowserUpdatesRoutes } from './browser-updates.routes';
import { createProfileActivityRoutes } from './profile-activity.routes';
import { createProfileBrowserDataRoutes } from './profile-browser-data.routes';
import { createProfileJobsRoutes } from './profile-jobs.routes';
import { createProfilesRoutes } from './profiles.routes';
import { createQueriesRoutes } from './queries.routes';
import { createServiceEmailsRoutes } from './service-emails.routes';
import { createServicesRoutes } from './services.routes';
import { createSessionsRoutes } from './sessions.routes';
import { createSourceImportsRoutes } from './source-imports.routes';
import { createSourcesRoutes } from './sources.routes';

export interface ApiControllers {
  sources: SourcesController;
  sourceImports: SourceImportsController;
  profileJobs: ProfileJobsController;
  profiles: ProfilesController;
  profileActivity: ProfileActivityController;
  profileBrowserData: ProfileBrowserDataController;
  services: ServicesController;
  queries: QueriesController;
  serviceEmails: ServiceEmailsController;
  sessions: SessionsController;
  browserSessions: BrowserSessionsController;
  browserUpdates: BrowserUpdatesController;
}

// Mount order mirrors the legacy routes/routes.ts so route matching precedence is unchanged
export function createApiRouter(c: ApiControllers): Router {
  const router = express.Router();
  router.use(createSourcesRoutes(c.sources));
  router.use(createSourceImportsRoutes(c.sourceImports));
  router.use(createProfileJobsRoutes(c.profileJobs));
  router.use(createProfilesRoutes(c.profiles));
  router.use(createProfileActivityRoutes(c.profileActivity));
  router.use(createProfileBrowserDataRoutes(c.profileBrowserData));
  router.use(createServicesRoutes(c.services));
  router.use(createQueriesRoutes(c.queries));
  router.use(createServiceEmailsRoutes(c.serviceEmails));
  router.use(createSessionsRoutes(c.sessions));
  router.use(createBrowserSessionsRoutes(c.browserSessions));
  router.use(createBrowserUpdatesRoutes(c.browserUpdates));
  return router;
}