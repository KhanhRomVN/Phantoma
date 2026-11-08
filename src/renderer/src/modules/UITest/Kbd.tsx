import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import Kbd from '@renderer/components/ui/Kbd/Kbd';
import { Panel, Stage } from './shared';

type Shortcut = [string, string[]];

const GROUPS: { title: string; items: Shortcut[] }[] = [
  {
    title: 'General',
    items: [
      ['Quick navigation', ['Ctrl', 'B']],
      ['Open folder', ['Ctrl', 'O']],
      ['New window', ['Ctrl', 'Shift', 'N']],
      ['Reload', ['Ctrl', 'R']],
    ],
  },
  {
    title: 'Editor',
    items: [
      ['Save', ['Ctrl', 'S']],
      ['Find', ['Ctrl', 'F']],
      ['Go to definition', ['Ctrl', 'Click']],
      ['Comment line', ['Ctrl', '/']],
    ],
  },
  {
    title: 'Chat',
    items: [
      ['Send message', ['Enter']],
      ['New line', ['Shift', 'Enter']],
      ['Cancel', ['Esc']],
    ],
  },
];

const MODIFIERS = ['Control', 'Shift', 'Alt', 'Meta'];

function Combo({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((key, index) => (
        <React.Fragment key={`${key}-${index}`}>
          {index > 0 && <span className="text-[10px] text-text-secondary">+</span>}
          <Kbd>{key}</Kbd>
        </React.Fragment>
      ))}
    </span>
  );
}

export default function KbdTab() {
  const [pressed, setPressed] = useState<string[]>([]);
  const [history, setHistory] = useState<string[][]>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.repeat) return;
    const keys: string[] = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.metaKey) keys.push('Meta');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    if (!MODIFIERS.includes(e.key)) keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    setPressed(keys);
    if (!MODIFIERS.includes(e.key)) setHistory((prev) => [keys, ...prev].slice(0, 5));
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {GROUPS.map((group) => (
        <Panel key={group.title} title={group.title} description="Cheat sheet">
          <div className="flex flex-col divide-y divide-divider">
            {group.items.map(([label, keys]) => (
              <div key={label} className="flex items-center justify-between py-2">
                <span className="text-sm text-text-primary">{label}</span>
                <Combo keys={keys} />
              </div>
            ))}
          </div>
        </Panel>
      ))}

      <Panel
        title="Live capture"
        description="Click vào khung rồi nhấn tổ hợp phím"
        className="xl:col-span-2"
      >
        <div className="flex flex-col gap-3">
          <div
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="outline-none focus:ring-2 focus:ring-primary/30"
          >
            <Stage className="min-h-[140px] flex-col">
              {pressed.length > 0 ? (
                <div className="scale-150">
                  <Combo keys={pressed} />
                </div>
              ) : (
                <span className="text-xs text-text-secondary">Press any key...</span>
              )}
            </Stage>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
              history
            </span>
            {history.length === 0 && <span className="text-xs text-text-secondary">empty</span>}
            {history.map((keys, index) => (
              <Combo key={index} keys={keys} />
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="className & usage" description="Kbd trong text, button, input">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Kbd className="h-4 min-w-[16px] text-[9px]">S</Kbd>
            <Kbd>M</Kbd>
            <Kbd className="h-7 min-w-[28px] text-sm">L</Kbd>
            <Kbd className="border-primary text-primary">Primary</Kbd>
            <Kbd className="min-w-[64px]">Space</Kbd>
          </div>
          <p className="text-sm text-text-primary">
            Nhấn <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> để mở palette, <Kbd>Esc</Kbd> để đóng.
          </p>
          <Button className="border border-border text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/10 active:bg-primary/20">
            Run
            <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd>
          </Button>
          <Input
            placeholder="Search..."
            leftIcon={<Search className="h-4 w-4" />}
            rightIcon={<Kbd>/</Kbd>}
          />
        </div>
      </Panel>
    </div>
  );
}