import fs from 'fs';
import type { Router } from 'express';
import { profileBrowserDataService } from '../application/services/browser-data/profile-browser-data.service';
import { BrowserSessionsController } from '../api/controllers/browser-sessions.controller';
import { BrowserUpdatesController } from '../api/controllers/browser-updates.controller';
import { ProfileActivityController } from '../api/controllers/profile-activity.controller';
import { ProfileBrowserDataController } from '../api/controllers/profile-browser-data.controller';
import { ProfileJobsController } from '../api/controllers/profile-jobs.controller';
import { ProfilesController } from '../api/controllers/profiles.controller';
import { QueriesController } from '../api/controllers/queries.controller';
import { ServiceEmailsController } from '../api/controllers/service-emails.controller';
import { ServicesController } from '../api/controllers/services.controller';
import { SessionsController } from '../api/controllers/sessions.controller';
import { SourceImportsController } from '../api/controllers/source-imports.controller';
import { SourcesController } from '../api/controllers/sources.controller';
import { createApiRouter } from '../api/routes';
import { BackupService } from '../application/services/backups/backup.service';
import { ImportJobService } from '../application/services/imports/import-job.service';
import { createProfileService } from '../application/services/profiles/profile.service';
import { ProfileActivityService } from '../application/services/profile-activity/profile-activity.service';
import { QueryService } from '../application/services/queries/query.service';
import { ServiceCatalogService } from '../application/services/service-catalog/service.service';
import { ServiceEmailService } from '../application/services/service-emails/service-email.service';
import { SessionService } from '../application/services/sessions/session.service';
import { createSourceService } from '../application/services/sources/source.service';
import { TransferJobService } from '../application/services/transfers/transfer-job.service';
import { closeRedis, getRedis } from '../cache/email.cache';
import type { AppConfig } from '../config/server.config';
import { close as closeDb, getDb } from '../database/connection';
import {
  deleteEmailBackup,
  deleteSourceBackup,
  pruneSourceBackup,
  renameSourceBackup,
  writeEmailBackup,
} from '../database/backup';
import { purgeSessionDb, withSessionDb } from '../database/session';
import { purgeVault, withVault } from '../database/vault';
import { createBrowserRunService } from '../infrastructure/browser/launcher/browser-run.service';
import { createBrowserUpdateService } from '../infrastructure/browser/updater/browser-update.service';
import { RedisCache, createEmailCache, createServiceEmailCache } from '../infrastructure/cache/redis-cache';
import { migrateLegacyServiceEmails } from '../infrastructure/persistence/migrations/legacy-service-emails.migration';
import { SqliteQueryRepository } from '../infrastructure/persistence/repositories/query.repository';
import { SqliteServiceCatalogRepository } from '../infrastructure/persistence/repositories/service-catalog.repository';
import { SqliteServiceEmailRepository } from '../infrastructure/persistence/repositories/service-email.repository';
import { SqliteSessionRepository } from '../infrastructure/persistence/repositories/session.repository';
import { emailRepository } from '../repositories/email.repository';
import {
  browsingEntryRepository,
  deviceActivityRepository,
  footprintRepository,
  scriptRunRepository,
  sourceRepository,
} from '../repositories/service.repository';
import { browserForkService } from '../services/browser-fork.service';
import { externalBrowserService } from '../services/external-browser.service';
import { previewImportFolder, readImportFile } from '../services/import-preview.service';
import type { StartupTask } from '../startup/startup.runner';
import { createAutoInstallMissingBrowserTask } from '../startup/tasks/auto-install-missing-browser.task';
import { createMigrateLegacyServiceEmailsTask } from '../startup/tasks/migrate-legacy-service-emails.task';
import { createReconcileAndSyncLocalSourcesTask } from '../startup/tasks/reconcile-and-sync-local-sources.task';
import { createSweepBrowserTempDirsTask } from '../startup/tasks/sweep-browser-temp-dirs.task';
import {
  TransferCancelled,
  folderNameFor,
  fromEmailId,
  isChromeRoot,
  measureFolder,
  nextChromeProfileName,
  pickFreeFolder,
  transferProfileFolder,
} from '../utils/browser-folder';
import { validateFolder } from '../utils/system';

export interface Container {
  apiRouter: Router;
  startupTasks: StartupTask[];
  close: () => Promise<void>;
}

// ASSUMED: repositories for profiles, sources and activity are still the legacy global-getDb singletons injected as-is; phase 4 replaces them with infrastructure repositories
export function createContainer(_config: AppConfig): Container {
  const redisCache = new RedisCache(getRedis());
  const emailCache = createEmailCache(redisCache);
  const serviceEmailCache = createServiceEmailCache(redisCache);

  const queryService = new QueryService(new SqliteQueryRepository(getDb));
  const serviceService = new ServiceCatalogService(new SqliteServiceCatalogRepository(getDb));
  const sessionRepository = new SqliteSessionRepository({ withDb: withSessionDb, purge: purgeSessionDb });
  const sessionService = new SessionService(emailRepository, sessionRepository);
  const serviceEmailRepository = new SqliteServiceEmailRepository({ withDb: withVault, purge: purgeVault }, getDb);
  const backupStore = { writeEmailBackup, deleteEmailBackup, renameSourceBackup, pruneSourceBackup, deleteSourceBackup };
  const backupService = new BackupService(
    emailRepository,
    sourceRepository,
    serviceEmailRepository,
    backupStore,
    fromEmailId,
  );
  const serviceEmailService = new ServiceEmailService(
    emailRepository,
    serviceEmailRepository,
    serviceEmailCache,
    backupService,
  );

  const profileService = createProfileService({
    emailRepository,
    sourceRepository,
    serviceEmailRepository,
    sessionRepository,
    browsingEntryRepository,
    emailCache,
    serviceEmailCache,
    serviceEmailService,
    backup: backupService,
    getDb,
  });
  const sourceService = createSourceService({
    sourceRepository,
    emailRepository,
    serviceEmailRepository,
    sessionRepository,
    emailCache,
    serviceEmailCache,
    backup: backupService,
    backupStore,
    emailService: profileService,
  });

  const browserRunService = createBrowserRunService({
    profiles: emailRepository,
    sessions: sessionRepository,
    externalBrowsers: externalBrowserService,
    forks: browserForkService,
  });
  const browserUpdateService = createBrowserUpdateService();
  const profileActivity = new ProfileActivityService(emailRepository, {
    footprints: footprintRepository,
    scriptRuns: scriptRunRepository,
    deviceActivities: deviceActivityRepository,
    browsingEntries: browsingEntryRepository,
  });

  const isCancelledError = (err: unknown): boolean => err instanceof TransferCancelled;
  const transferJobService = new TransferJobService({
    transfer: (input, run) => profileService.transfer(input, run),
    isCancelledError,
  });
  const importJobService = new ImportJobService({
    previewImportFolder,
    getSourceLocation: (id) => sourceRepository.getById(id)?.location ?? null,
    syncSource: (id) => sourceService.sync(id),
    folders: {
      measureFolder,
      isChromeRoot,
      nextChromeProfileName,
      pickFreeFolder,
      folderNameFor,
      duplicateFolder: (from, to, options) => transferProfileFolder('duplicate', from, to, options),
    },
    isCancelledError,
  });

  const apiRouter = createApiRouter({
    sources: new SourcesController({ sourceService }),
    sourceImports: new SourceImportsController({
      sourceService,
      validateFolder,
      previewImportFolder,
      readImportFile,
    }),
    profileJobs: new ProfileJobsController({ transferJobService, importJobService }),
    profiles: new ProfilesController({ profileService, sourceService }),
    profileActivity: new ProfileActivityController({
      footprintService: profileActivity.footprints,
      scriptRunService: profileActivity.scriptRuns,
      deviceActivityService: profileActivity.deviceActivities,
      browsingEntryService: profileActivity.browsingEntries,
    }),
    profileBrowserData: new ProfileBrowserDataController({
      profileService,
      browserData: profileBrowserDataService,
    }),
    services: new ServicesController({ serviceService }),
    queries: new QueriesController({ queryService }),
    serviceEmails: new ServiceEmailsController({ serviceEmailService }),
    sessions: new SessionsController({ sessionService }),
    browserSessions: new BrowserSessionsController({ browserRunService, browserForkService }),
    browserUpdates: new BrowserUpdatesController({ browserUpdateService }),
  });

  const startupTasks: StartupTask[] = [
    createMigrateLegacyServiceEmailsTask({ migrate: () => migrateLegacyServiceEmails(getDb, withVault) }),
    createSweepBrowserTempDirsTask({ sweepTempDirs: () => browserRunService.sweepTempDirs() }),
    createReconcileAndSyncLocalSourcesTask({
      reconcile: () => sourceService.reconcile(),
      list: () => sourceService.list(),
      syncSource: sourceService.syncSource,
      folderExists: (location) => fs.existsSync(location),
    }),
    createAutoInstallMissingBrowserTask({
      autoInstallIfMissing: () => browserUpdateService.autoInstallIfMissing(),
    }),
  ];

  return {
    apiRouter,
    startupTasks,
    close: async () => {
      browserRunService.shutdown();
      await closeRedis();
      closeDb();
    },
  };
}