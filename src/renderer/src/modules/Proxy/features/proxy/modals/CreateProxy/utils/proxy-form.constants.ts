import { PROVIDERS } from '../../../../../shared/constants/proxy-meta.constants';
import type { Form } from '../CreateProxyModal.types';

export const EMPTY_FORM: Form = {
  protocol: 'http',
  host: '',
  port: 8080,
  username: '',
  password: '',
  kind: 'datacenter',
  ownership: 'private',
  country: 'VN',
  provider: PROVIDERS[0],
  tags: [],
  isp: '',
  name: '',
  stickyEnabled: false,
  stickyTtlMin: 30,
  rotationMin: 0,
  maxConns: 10,
  notes: '',
  quotaTotalGb: null,
  expiresAt: null,
};
