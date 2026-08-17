/**
 * Navbar - điều hướng chính, dùng chung cho mọi page
 */

import { useState } from 'react';
import { Menu, X, Wand2 } from 'lucide-react';
import { ThemeToggle } from '../theme/ThemeToggle';
import { Button } from './Button';
import type { Page } from '../index';

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { key: Page; label: string }[] = [
  { key: 'home', label: 'Trang chủ' },
  { key: 'features', label: 'Tính năng' },
  { key: 'showcase', label: 'Demo' },
  { key: 'pricing', label: 'Bảng giá' },
  { key: 'about', label: 'Về chúng tôi' },
];

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 dark:border-white/5 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => handleNavigate('home')}
            className="flex items-center gap-2 font-[Space_Grotesk] text-lg font-bold text-zinc-900 dark:text-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 text-white">
              <Wand2 className="h-4 w-4" />
            </span>
            Phantoma
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavigate(item.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  currentPage === item.key
                    ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Button size="md" onClick={() => handleNavigate('contact')}>
              Dùng thử miễn phí
            </Button>
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Mở menu"
              className="p-2 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-black/5 dark:border-white/5 bg-white/95 dark:bg-zinc-950/95 px-4 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavigate(item.key)}
              className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                currentPage === item.key
                  ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10'
                  : 'text-zinc-700 dark:text-zinc-200'
              }`}
            >
              {item.label}
            </button>
          ))}
          <Button size="md" className="mt-2 w-full" onClick={() => handleNavigate('contact')}>
            Dùng thử miễn phí
          </Button>
        </div>
      )}
    </header>
  );
}
