import { COUNTRIES } from '../../constants/proxy-meta.constants';
import { flag } from '../../utils/format';
import type { Option } from './Select';

export const COUNTRY_OPTIONS: Option[] = COUNTRIES.map(([code, name]) => ({
  value: code,
  label: name,
  prefix: <span className="text-[13px] leading-none">{flag(code)}</span>,
}));
