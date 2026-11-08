import { useState } from 'react';
import { Bell, Inbox, Mail, MessageSquare, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@renderer/components/ui/Button';
import Badge from '@renderer/components/ui/Badge/Badge';
import { Field, JsxPreview, Panel, Segmented, Stage } from './shared';

const TONES = [
  { name: 'primary', className: 'bg-primary/20 text-primary' },
  { name: 'success', className: 'bg-success/20 text-success' },
  { name: 'warn', className: 'bg-warn/20 text-warn' },
  { name: 'error', className: 'bg-error/20 text-error' },
  { name: 'info', className: 'bg-info/20 text-info' },
  { name: 'solid-error', className: 'bg-error text-white' },
];

const TONE_NAMES = TONES.map((tone) => tone.name);
const MAXES: number[] = [9, 99, 999];
const EDGE_COUNTS = [0, 1, 9, 10, 99, 100, 1000];

export default function BadgeTab() {
  const [count, setCount] = useState(7);
  const [max, setMax] = useState(99);
  const [tone, setTone] = useState('primary');
  const [tab, setTab] = useState('Inbox');

  const toneClass = TONES.find((item) => item.name === tone)?.className ?? TONES[0].className;

  const tabs = [
    { name: 'Inbox', count: 3 },
    { name: 'Drafts', count: 12 },
    { name: 'Sent', count: 0 },
    { name: 'Spam', count: 120 },
  ];

  const navItems = [
    { icon: Inbox, name: 'Inbox', count: 24, className: undefined },
    { icon: Mail, name: 'Unread', count: 5, className: 'bg-error/20 text-error' },
    { icon: MessageSquare, name: 'Mentions', count: 2, className: 'bg-info/20 text-info' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Panel title="Playground" description="count, max, className">
        <div className="flex flex-col gap-4">
          <Stage>
            <span className="inline-flex items-center text-sm text-text-primary">
              Notifications
              <Badge count={count} max={max} className={toneClass} />
            </span>
          </Stage>
          <Field label="count">
            <div className="flex items-center gap-2">
              <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={() => setCount((c) => Math.max(0, c - 1))}>
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-12 text-center font-mono text-sm text-text-primary">{count}</span>
              <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={() => setCount((c) => c + 1)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button className="text-primary hover:bg-primary/10 active:bg-primary/20" onClick={() => setCount(150)}>
                150
              </Button>
            </div>
          </Field>
          <Field label="max">
            <Segmented value={max} options={MAXES} onChange={setMax} />
          </Field>
          <Field label="className (tone)">
            <Segmented value={tone} options={TONE_NAMES} onChange={setTone} />
          </Field>
          <JsxPreview name="Badge" props={{ count, max, className: toneClass }} />
        </div>
      </Panel>

      <div className="flex flex-col gap-4 xl:col-span-2">
        <Panel title="Tab bar" description="Badge ngay sau label, count=0 tự ẩn">
          <div className="flex gap-1 border-b border-divider">
            {tabs.map((item) => (
              <button
                key={item.name}
                onClick={() => setTab(item.name)}
                className={`flex cursor-pointer items-center border-b-2 px-3 py-2 text-sm outline-none transition-colors ${
                  tab === item.name
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {item.name}
                <Badge count={item.count} />
              </button>
            ))}
          </div>
        </Panel>

        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Sidebar list" description="Badge đẩy sang phải bằng ml-auto">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                    <span className="ml-auto">
                      <Badge count={item.count} className={item.className} />
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Icon overlay" description="className absolute -right-2 -top-2 ml-0">
            <div className="flex items-center gap-8 py-2">
              <div className="relative">
                <Bell className="h-6 w-6 text-text-secondary" />
                <Badge
                  count={4}
                  className="absolute -right-3 -top-2 ml-0 bg-error text-white"
                />
              </div>
              <div className="relative">
                <ShoppingCart className="h-6 w-6 text-text-secondary" />
                <Badge
                  count={120}
                  className="absolute -right-4 -top-2 ml-0 bg-primary text-text-foreground"
                />
              </div>
              <div className="relative">
                <Mail className="h-6 w-6 text-text-secondary" />
                <Badge
                  count={12}
                  max={9}
                  className="absolute -right-4 -top-2 ml-0 bg-warn text-white"
                />
              </div>
            </div>
          </Panel>
        </div>

        <Panel title="Edge cases" description="max mặc định = 99">
          <div className="flex flex-wrap gap-6">
            {EDGE_COUNTS.map((value) => (
              <div key={value} className="flex flex-col items-center gap-2">
                <span className="font-mono text-[11px] text-text-secondary">count={value}</span>
                <div className="flex h-6 items-center">
                  <Badge count={value} />
                  {value === 0 && <span className="text-[10px] text-text-secondary">null</span>}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}