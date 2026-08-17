/**
 * Website Template - Contact Page
 */

import { useState } from 'react';
import { Mail, Github, MessageSquare, Send } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';
import { Button } from '../components/Button';

const CHANNELS = [
  {
    icon: Mail,
    title: 'Email',
    value: 'hello@phantoma.app',
    tone: 'cyan' as const,
  },
  {
    icon: Github,
    title: 'GitHub',
    value: 'github.com/KhanhRomVN',
    tone: 'violet' as const,
  },
  {
    icon: MessageSquare,
    title: 'Cộng đồng',
    value: 'discord.gg/phantoma',
    tone: 'cyan' as const,
  },
];

export function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="py-20 md:py-28 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Liên hệ"
          title="Kể cho chúng tôi nghe về dự án của bạn"
          description="Đội ngũ Phantoma phản hồi trong vòng 24 giờ làm việc."
        />

        <div className="mt-16 grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10">
          {/* Channels */}
          <div className="flex flex-col gap-4">
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              const wrap =
                c.tone === 'cyan'
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                  : 'bg-violet-500/10 text-violet-600 dark:text-violet-400';
              return (
                <div
                  key={c.title}
                  className="flex items-center gap-4 rounded-2xl border border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/60 p-5"
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${wrap}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      {c.title}
                    </p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{c.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/60 p-8">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 mb-4">
                  <Send className="h-6 w-6" />
                </div>
                <h3 className="font-[Space_Grotesk] text-xl font-bold text-zinc-900 dark:text-white mb-2">
                  Đã gửi thành công
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Cảm ơn bạn, đội ngũ Phantoma sẽ phản hồi sớm nhất có thể.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Họ tên
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Nguyễn Văn A"
                      className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Email
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="ban@congty.com"
                      className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Nội dung
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Cho chúng tôi biết bạn đang xây dựng điều gì..."
                    className="resize-none rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>

                <Button type="submit" size="lg" className="self-start">
                  Gửi liên hệ
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
