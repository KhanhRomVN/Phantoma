/**
 * ------------------------------------------------------------------
 * AboutSettings
 * ------------------------------------------------------------------
 * Tab About trong Settings Panel: hero (logo, tên, tagline), 2 card
 * liên kết (mã nguồn mở, issues), giới thiệu Zen + 4 tính năng cốt lõi
 * (theo README) và card giới thiệu đội ngũ phát triển.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Bug, Folder, Layers, Mail, FileText, RotateCcw, ShieldCheck } from 'lucide-react';
import { $ } from '@renderer/utils/color';

const REPO_URL = 'https://github.com/KhanhRomVN/Zen';

interface Developer {
  initials: string;
  name: string;
  role: string;
  /** Username GitHub — dùng cho link profile và ảnh avatar */
  username: string;
  email?: string;
  /** Màu nhấn cho avatar fallback (soft-style) */
  accent: string;
}

const DEVELOPERS: Developer[] = [
  {
    initials: 'KR',
    name: 'KhanhRomVN',
    role: 'Author · architecture & backend agent',
    username: 'KhanhRomVN',
    email: 'khanhromvn@gmail.com',
    accent: $('--blue'),
  },
  {
    initials: 'BC',
    name: 'BlackCandy001',
    role: 'Co-developer',
    username: 'BlackCandy001',
    accent: $('--violet'),
  },
];

interface Feature {
  icon: React.ElementType;
  /** Màu nhấn của badge icon (soft-style) */
  color: string;
  title: string;
  description: string;
}

/** 4 tính năng cốt lõi của Zen — rút gọn từ README.md. */
const FEATURES: Feature[] = [
  {
    icon: Layers,
    color: $('--blue'),
    title: 'Any LLM provider',
    description: 'DeepSeek, Claude, Gemini, Qwen, OpenAI, Ollama and more.',
  },
  {
    icon: FileText,
    color: $('--teal'),
    title: 'Agentic editing',
    description: 'The AI reads and edits files and runs commands. You approve each action.',
  },
  {
    icon: ShieldCheck,
    color: $('--green'),
    title: 'Permission modes',
    description: 'Full Access, Approval or Read Only. You set the autonomy.',
  },
  {
    icon: RotateCcw,
    color: $('--violet'),
    title: 'Checkpoint & Revert',
    description: 'Every edit is checkpointed. View the diff or undo in one click.',
  },
];

/** Ô tính năng gọn: badge icon màu soft ở trên, tiêu đề và mô tả ngắn bên dưới. */
const FeatureItem: React.FC<{ feature: Feature }> = ({ feature }) => {
  const Icon = feature.icon;
  return (
    <div className="flex flex-col gap-2.5 min-w-0 p-3 rounded-lg bg-input-background">
      <div
        className="w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0"
        style={{
          color: feature.color,
          backgroundColor: `color-mix(in srgb, ${feature.color} 16%, transparent)`,
        }}
      >
        <Icon size={16} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[12.5px] font-semibold text-text-primary">{feature.title}</span>
        <span className="text-[11px] leading-normal text-text-secondary opacity-85">
          {feature.description}
        </span>
      </div>
    </div>
  );
};

/**
 * Avatar developer: ảnh GitHub bo góc nhẹ; nếu tải lỗi (offline/CSP)
 * thì hiện chữ viết tắt trên nền soft-style.
 */
const Avatar: React.FC<{ dev: Developer }> = ({ dev }) => {
  const [failed, setFailed] = React.useState(false);
  const boxClass = 'w-10 h-10 shrink-0 rounded-[10px] overflow-hidden';
  const soft = `color-mix(in srgb, ${dev.accent} 18%, transparent)`;

  if (!failed) {
    return (
      <img
        src={`https://github.com/${dev.username}.png?size=80`}
        alt={dev.name}
        width={40}
        height={40}
        draggable={false}
        onError={() => setFailed(true)}
        className={`${boxClass} object-cover`}
        style={{ backgroundColor: soft }}
      />
    );
  }
  return (
    <div
      className={`${boxClass} flex items-center justify-center text-[13px] font-bold tracking-tight`}
      style={{
        color: dev.accent,
        backgroundColor: soft,
      }}
    >
      {dev.initials}
    </div>
  );
};

/** Card liên kết ngoài (mở repo / issues). */
const LinkCard: React.FC<{
  href: string;
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
}> = ({ href, icon, color, title, subtitle }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex-1 min-w-0 flex items-center gap-2.5 p-2.5 rounded-lg no-underline box-border transition-colors duration-140 ease-linear"
      style={{
        backgroundColor: hovered
          ? 'color-mix(in srgb, var(--primary-text) 8%, var(--input-bg))'
          : 'var(--input-bg)',
      }}
    >
      <div
        className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center"
        style={{
          color,
          backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
        }}
      >
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-semibold text-text-primary overflow-hidden text-ellipsis whitespace-nowrap">
          {title}
        </span>
        <span className="text-[11.5px] text-text-secondary opacity-80 overflow-hidden text-ellipsis whitespace-nowrap">
          {subtitle}
        </span>
      </div>
    </a>
  );
};

const AboutSettings: React.FC = () => {
  return (
    <div className="flex flex-col gap-5.5">
      {/* Hero */}
      <div className="flex flex-col items-center gap-2.5 py-6.5 px-3">
        <img
          src={`${(window as any).__zenImagesUri}/icon.png`}
          alt="Zen Logo"
          className="w-[58px] h-[58px] object-contain rounded-[14px]"
        />
        <div className="text-[26px] font-extrabold tracking-tight leading-none text-text-primary">
          Zen
        </div>
        <p className="m-0 text-[12.5px] text-text-secondary text-center max-w-[32ch] leading-normal">
          AI-powered coding assistant extension for VSCode
        </p>
      </div>

      {/* Links: mã nguồn mở + issues (đặt ngay dưới hero để dễ thấy) */}
      <div className="flex gap-2">
        <LinkCard
          href={REPO_URL}
          icon={<Folder size={16} />}
          color={$('--blue')}
          title="Open source"
          subtitle="View source on GitHub"
        />
        <LinkCard
          href={`${REPO_URL}/issues`}
          icon={<Bug size={16} />}
          color={$('--yellow')}
          title="Issues"
          subtitle="Report bugs & requests"
        />
      </div>

      {/* What is Zen + Core features */}
      <div>
        <div className="flex flex-col gap-0.5 mb-2">
          <span className="text-[13px] font-semibold text-text-primary">What is Zen?</span>
        </div>
        <p className="m-0 mb-4.5 text-xs leading-relaxed text-text-secondary">
          Zen brings AI chat into your VSCode sidebar. Connect any LLM provider, chat about your
          code, let the AI edit files and run commands, and track every change without leaving your
          editor. No subscription, no lock-in.
        </p>
        <div className="flex flex-col gap-0.5 mb-2">
          <span className="text-[13px] font-semibold text-text-primary">Core features</span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
          {FEATURES.map((f) => (
            <FeatureItem key={f.title} feature={f} />
          ))}
        </div>
      </div>

      {/* Development team */}
      <div>
        <div className="flex flex-col gap-0.5 mb-2">
          <span className="text-[13px] font-semibold text-text-primary">Development team</span>
          <span className="text-[11.5px] text-text-secondary opacity-80">
            The people who write and maintain Zen.
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {DEVELOPERS.map((dev) => (
            <div
              key={dev.name}
              className="flex items-center gap-2.5 min-w-0 p-2.5 rounded-lg bg-input-background"
            >
              <Avatar dev={dev} />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[13px] font-semibold text-text-primary overflow-hidden text-ellipsis whitespace-nowrap">
                  {dev.name}
                </span>
                <span className="text-[11.5px] text-text-secondary opacity-80 overflow-hidden text-ellipsis whitespace-nowrap">
                  {dev.role}
                </span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  <a
                    className="inline-flex items-center gap-1 text-[11px] text-text-secondary no-underline min-w-0 hover:text-text-primary hover:underline transition-colors"
                    href={`https://github.com/${dev.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Folder size={11} />
                    github.com/{dev.username}
                  </a>
                  {dev.email && (
                    <a
                      className="inline-flex items-center gap-1 text-[11px] text-text-secondary no-underline min-w-0 hover:text-text-primary hover:underline transition-colors"
                      href={`mailto:${dev.email}`}
                    >
                      <Mail size={11} />
                      {dev.email}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AboutSettings;
