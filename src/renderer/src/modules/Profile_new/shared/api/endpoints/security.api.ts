import { request } from '../client';

export const securityApi = {
  passwordReuse: (password: string) => request<{ count: number }>('POST', '/passwords/reuse', { password }),
};
