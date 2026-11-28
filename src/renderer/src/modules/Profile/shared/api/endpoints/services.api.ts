import type { ServiceTemplate, ServiceTemplateInput } from '../../types';
import { request } from '../client';

export const servicesApi = {
  list: () => request<ServiceTemplate[]>('GET', '/services'),
  create: (input: ServiceTemplateInput) => request<ServiceTemplate>('POST', '/services', input),
  update: (id: string, input: Partial<ServiceTemplateInput>) =>
    request<ServiceTemplate>('PUT', `/services/${id}`, input),
  remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/services/${id}`),
};
