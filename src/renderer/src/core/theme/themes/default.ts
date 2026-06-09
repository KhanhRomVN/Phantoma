import IntelBlack from './IntelBlack.json';
import { ThemePreset } from '../types/theme.types';

export const defaultTheme: ThemePreset = {
  name: 'Obsidian',
  modes: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    light: IntelBlack as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dark: IntelBlack as any,
  },
};
