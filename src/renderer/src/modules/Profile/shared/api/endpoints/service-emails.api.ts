import type { ServiceLink, ServiceLinkInput } from '../../types';
import { request } from '../client';

export const serviceEmailsApi = {
  list: (profileId: string) => request<ServiceLink[]>('GET', `/profiles/${profileId}/service-emails`),
  create: (profileId: string, input: ServiceLinkInput) =>
    request<ServiceLink>('POST', `/profiles/${profileId}/service-emails`, input),
  update: (profileId: string, id: string, input: Partial<ServiceLinkInput>) =>
    request<ServiceLink>('PUT', `/profiles/${profileId}/service-emails/${id}`, input),
  remove: (profileId: string, id: string) =>
    request<{ deleted: boolean }>('DELETE', `/profiles/${profileId}/service-emails/${id}`),
};
