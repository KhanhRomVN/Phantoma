import type { BrowserEngine } from '../../../shared/types';
import { TONE_CLASS } from '../../../shared/constants/tone.constants';

export const ALL_SOURCES_ID = 'all';

export const BROWSERS: Record<BrowserEngine, { label: string; dot: string }> = {
  chrome: { label: 'Chrome', dot: TONE_CLASS.warn.dot },
  chromium: { label: 'Chromium', dot: TONE_CLASS.info.dot },
};