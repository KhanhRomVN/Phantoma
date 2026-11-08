import { useState } from 'react';
import { Bold, Code, Italic, Link, Underline } from 'lucide-react';
import { Button } from '@renderer/components/ui/Button';
import Kbd from '@renderer/components/ui/Kbd/Kbd';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import { Field, JsxPreview, Panel, Segmented, Toggle } from './shared';

const SIDES = ['top', 'bottom', 'left', 'right'] as const;
const ALIGNS = ['start', 'center', 'end'] as const;
const DELAYS: number[] = [0, 300, 800];
const OFFSETS: number[] = [4, 12, 28];
const ALIGN_OFFSETS: number[] = [0, 10, 20];
const LONG_TEXT = 'src/renderer/src/components/Widgets/Zen/feature/Chat/components/ChatBody/index.tsx';

function PlacementGrid() {
  const cell = (side: (typeof SIDES)[number], className: string) => (
    <div className={className}>
      {ALIGNS.map((align) => (
        <Tooltip key={align} side={side} align={align} content={`side=${side} align=${align}`}>
          <button className="h-7 w-7 cursor-pointer rounded-md bg-button-soft-background text-[10px] font-semibold uppercase text-text-secondary outline-none transition-colors hover:text-text-primary">
            {align[0]}
          </button>
        </Tooltip>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-[auto_1fr_auto] grid-rows-[auto_1fr_auto] items-center justify-items-center gap-4">
      <div />
      {cell('top', 'flex gap-1')}
      <div />
      {cell('left', 'flex flex-col gap-1')}
      <div className="flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-border text-xs text-text-secondary">
        side x align (S / C / E)
      </div>
      {cell('right', 'flex flex-col gap-1')}
      <div />
      {cell('bottom', 'flex gap-1')}
      <div />
    </div>
  );
}

export default function TooltipTab() {
  const [side, setSide] = useState<(typeof SIDES)[number]>('top');
  const [align, setAlign] = useState<(typeof ALIGNS)[number]>('center');
  const [delay, setDelay] = useState(300);
  const [offset, setOffset] = useState(4);
  const [alignOffset, setAlignOffset] = useState(0);
  const [hoverable, setHoverable] = useState(true);
  const [open, setOpen] = useState(false);

  const toolbar = [
    { icon: Bold, name: 'Bold', keys: ['Ctrl', 'B'] },
    { icon: Italic, name: 'Italic', keys: ['Ctrl', 'I'] },
    { icon: Underline, name: 'Underline', keys: ['Ctrl', 'U'] },
    { icon: Link, name: 'Link', keys: ['Ctrl', 'K'] },
    { icon: Code, name: 'Code', keys: ['Ctrl', 'E'] },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Panel
        title="Playground"
        description="side, align, delayDuration, sideOffset, alignOffset"
        className="xl:row-span-2"
      >
        <div className="flex flex-col gap-4">
          <div className="flex min-h-[140px] items-center justify-center rounded-lg border border-dashed border-border bg-background p-6">
            <Tooltip
              content="Playground tooltip"
              side={side}
              align={align}
              delayDuration={delay}
              sideOffset={offset}
              alignOffset={alignOffset}
              disableHoverableContent={!hoverable}
            >
              <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70">Hover me</Button>
            </Tooltip>
          </div>
          <Field label="side">
            <Segmented value={side} options={SIDES} onChange={setSide} />
          </Field>
          <Field label="align">
            <Segmented value={align} options={ALIGNS} onChange={setAlign} />
          </Field>
          <Field label="delayDuration (ms)">
            <Segmented value={delay} options={DELAYS} onChange={setDelay} />
          </Field>
          <Field label="sideOffset">
            <Segmented value={offset} options={OFFSETS} onChange={setOffset} />
          </Field>
          <Field label="alignOffset">
            <Segmented value={alignOffset} options={ALIGN_OFFSETS} onChange={setAlignOffset} />
          </Field>
          <Toggle label="hoverable content" checked={hoverable} onChange={setHoverable} />
          <JsxPreview
            name="Tooltip"
            props={{
              content: 'Playground tooltip',
              side,
              align,
              delayDuration: delay,
              sideOffset: offset,
              alignOffset,
              disableHoverableContent: !hoverable,
            }}
          />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Placement matrix" description="4 side x 3 align" className="lg:col-span-2">
          <PlacementGrid />
        </Panel>

        <Panel title="Editor toolbar" description="content là ReactNode, có Kbd">
          <div className="inline-flex gap-1 rounded-lg border border-border p-1">
            {toolbar.map((item) => {
              const Icon = item.icon;
              return (
                <Tooltip
                  key={item.name}
                  side="bottom"
                  content={
                    <span className="flex items-center gap-2">
                      {item.name}
                      <span className="flex gap-1">
                        {item.keys.map((key) => (
                          <Kbd key={key}>{key}</Kbd>
                        ))}
                      </span>
                    </span>
                  }
                >
                  <Button className="text-primary hover:bg-primary/10 active:bg-primary/20 px-2">
                    <Icon className="h-4 w-4" />
                  </Button>
                </Tooltip>
              );
            })}
          </div>
        </Panel>

        <Panel title="Truncated text" description="Tooltip hiện full path">
          <Tooltip content={LONG_TEXT} contentClassName="max-w-sm break-all">
            <span className="block w-56 truncate text-sm text-text-primary">{LONG_TEXT}</span>
          </Tooltip>
        </Panel>

        <Panel title="Disabled button" description="Bọc trong span để tooltip vẫn hoạt động">
          <Tooltip content="Cần quyền admin để xóa">
            <span className="inline-flex">
              <Button className="bg-error/10 text-error hover:bg-error/20 active:bg-error/30" disabled>
                Delete
              </Button>
            </span>
          </Tooltip>
        </Panel>

        <Panel title="Controlled" description={`open=${String(open)}, onOpenChange`}>
          <div className="flex items-center gap-4">
            <Tooltip content="Controlled tooltip" open={open} onOpenChange={setOpen}>
              <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70">Target</Button>
            </Tooltip>
            <Toggle label="open" checked={open} onChange={setOpen} />
          </div>
        </Panel>

        <Panel title="defaultOpen + styling" description="className, contentClassName">
          <Tooltip
            defaultOpen
            side="right"
            content="Opened by default"
            className="inline-flex"
            contentClassName="border border-primary"
          >
            <Button className="border border-border text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/10 active:bg-primary/20">defaultOpen</Button>
          </Tooltip>
        </Panel>
      </div>
    </div>
  );
}