/**
 * Theme Toggle Button
 */

import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40 transition-colors duration-200"
    >
      <Sun
        className={`absolute h-4 w-4 transition-all duration-300 ${
          isDark ? 'scale-0 -rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
        }`}
      />
      <Moon
        className={`absolute h-4 w-4 transition-all duration-300 ${
          isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'
        }`}
      />
    </button>
  );
}
