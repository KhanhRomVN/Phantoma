/**
 * Footer - dùng chung cho mọi page
 */

import { Wand2, Github, Twitter, Linkedin } from 'lucide-react';
import type { Page } from '../index';

interface FooterProps {
  onNavigate: (page: Page) => void;
}

const FOOTER_COLUMNS: { title: string; links: { label: string; page?: Page }[] }[] = [
  {
    title: 'Sản phẩm',
    links: [
      { label: 'Tính năng', page: 'features' },
      { label: 'Demo trực tiếp', page: 'showcase' },
      { label: 'Bảng giá', page: 'pricing' },
    ],
  },
  {
    title: 'Công ty',
    links: [
      { label: 'Về chúng tôi', page: 'about' },
      { label: 'Liên hệ', page: 'contact' },
    ],
  },
];

export function Footer({ onNavigate }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 font-[Space_Grotesk] text-lg font-bold text-zinc-900 dark:text-white mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 text-white">
                <Wand2 className="h-4 w-4" />
              </span>
              Phantoma
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
              Công cụ thiết kế UI/UX kết hợp AI — hover vào bất kỳ element nào để chỉnh sửa
              thuộc tính trực tiếp, không cần rời canvas.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href="https://github.com/KhanhRomVN"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-cyan-500 hover:border-cyan-500/40 transition-colors"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-cyan-500 hover:border-cyan-500/40 transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-cyan-500 hover:border-cyan-500/40 transition-colors"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => link.page && onNavigate(link.page)}
                      className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
            © {year} Phantoma. All rights reserved.
          </p>
          <p className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
            Built by{' '}
            <a
              href="https://github.com/KhanhRomVN"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              @KhanhRomVN
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
