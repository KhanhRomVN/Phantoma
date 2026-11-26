import { browserApi } from './endpoints/browser.api';
import { activityApi, devicesApi, footprintsApi, scriptsApi } from './endpoints/activity.api';
import { profilesApi } from './endpoints/profiles.api';
import { queriesApi } from './endpoints/queries.api';
import { securityApi } from './endpoints/security.api';
import { serviceEmailsApi } from './endpoints/service-emails.api';
import { servicesApi } from './endpoints/services.api';
import { sessionsApi } from './endpoints/sessions.api';
import { sourcesApi } from './endpoints/sources.api';
import { checkHealth, systemApi } from './endpoints/system.api';

export const profileApi = {
  health: checkHealth,
  sources: sourcesApi,
  profiles: profilesApi,
  system: { ...systemApi, ...securityApi },
  services: servicesApi,
  serviceEmails: serviceEmailsApi,
  sessions: sessionsApi,
  queries: queriesApi,
  footprints: footprintsApi,
  activity: activityApi,
  scripts: scriptsApi,
  devices: devicesApi,
  browser: browserApi,
};
