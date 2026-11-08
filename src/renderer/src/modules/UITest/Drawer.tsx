import { useState } from 'react';
import { Button } from '@renderer/components/ui/Button';
import Checkbox from '@renderer/components/ui/Checkbox/Checkbox';
import { Input } from '@renderer/components/ui/Input';
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter } from '@renderer/components/ui/Drawer';
import type { DrawerProps } from '@renderer/components/ui/Drawer';
import { CANCEL_BUTTON_CLASS, Field, JsxPreview, Panel, Segmented, Toggle } from './shared';

const POSITIONS = ['right', 'left', 'bottom'] as const;
const STRATEGIES = ['absolute', 'fixed'] as const;
const SIZES = ['sm', 'md', 'lg'] as const;
const WIDTHS = { sm: '320px', md: '420px', lg: '560px' };
const HEIGHTS = { sm: '35%', md: '50%', lg: '75%' };

type Scenario = 'settings' | 'filters' | 'sheet';

export default function DrawerTab() {
  const [open, setOpen] = useState(true);
  const [position, setPosition] = useState<(typeof POSITIONS)[number]>('right');
  const [strategy, setStrategy] = useState<(typeof STRATEGIES)[number]>('absolute');
  const [size, setSize] = useState<(typeof SIZES)[number]>('md');
  const [showHandle, setShowHandle] = useState(false);
  const [backdrop, setBackdrop] = useState(true);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [filters, setFilters] = useState<Record<string, boolean>>({ active: true });

  const drawerProps: Omit<DrawerProps, 'isOpen' | 'onClose' | 'children'> = {
    position,
    strategy,
    showHandle,
    closeOnBackdropClick: backdrop,
    ...(position === 'bottom' ? { height: HEIGHTS[size] } : { width: WIDTHS[size] }),
  };

  const closeScenario = () => setScenario(null);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Panel title="Playground" description="position, strategy, width/height, showHandle">
        <div className="flex flex-col gap-4">
          <Field label="position">
            <Segmented value={position} options={POSITIONS} onChange={setPosition} />
          </Field>
          <Field label="strategy">
            <Segmented value={strategy} options={STRATEGIES} onChange={setStrategy} />
          </Field>
          <Field label={position === 'bottom' ? 'height' : 'width'}>
            <Segmented value={size} options={SIZES} onChange={setSize} />
          </Field>
          <Field label="props">
            <div className="flex flex-col gap-2">
              <Toggle label="showHandle" checked={showHandle} onChange={setShowHandle} />
              <Toggle label="closeOnBackdropClick" checked={backdrop} onChange={setBackdrop} />
            </div>
          </Field>
          <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={() => setOpen((v) => !v)}>
            {open ? 'Close drawer' : 'Open drawer'}
          </Button>
          <JsxPreview name="Drawer" props={{ isOpen: open, ...drawerProps }} />
        </div>
      </Panel>

      <Panel
        title="Live frame"
        description={
          strategy === 'absolute'
            ? 'strategy=absolute: Drawer nằm gọn trong khung'
            : 'strategy=fixed: Drawer phủ toàn màn hình'
        }
      >
        <div className="relative h-[440px] overflow-hidden rounded-lg border border-border bg-background">
          <div className="flex flex-col gap-3 p-4">
            <div className="h-4 w-1/3 rounded bg-card-background" />
            <div className="h-3 w-2/3 rounded bg-card-background" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-24 rounded-lg bg-card-background" />
              ))}
            </div>
          </div>
          <Drawer isOpen={open} onClose={() => setOpen(false)} {...drawerProps}>
            <DrawerHeader
              title="Drawer"
              description={`position=${position}`}
              onClose={() => setOpen(false)}
            />
            <DrawerBody>
              <p className="text-sm text-text-primary">DrawerBody content.</p>
            </DrawerBody>
            <DrawerFooter>
              <Button className={CANCEL_BUTTON_CLASS} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={() => setOpen(false)}>
                Apply
              </Button>
            </DrawerFooter>
          </Drawer>
        </div>
      </Panel>

      <Panel title="Real-world drawers" description="strategy=fixed" className="xl:col-span-2">
        <div className="flex flex-wrap gap-3">
          <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={() => setScenario('settings')}>
            Settings (right)
          </Button>
          <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={() => setScenario('filters')}>
            Filters (left)
          </Button>
          <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={() => setScenario('sheet')}>
            Bottom sheet (handle)
          </Button>
        </div>
      </Panel>

      <Drawer isOpen={scenario === 'settings'} onClose={closeScenario} position="right" width="420px">
        <DrawerHeader title="Settings" description="Cấu hình tài khoản" onClose={closeScenario} />
        <DrawerBody>
          <div className="flex flex-col gap-3">
            <Input label="Display name" placeholder="Your name" />
            <Input label="Email" type="email" placeholder="you@example.com" />
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button className={CANCEL_BUTTON_CLASS} onClick={closeScenario}>
            Cancel
          </Button>
          <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={closeScenario}>
            Save
          </Button>
        </DrawerFooter>
      </Drawer>

      <Drawer isOpen={scenario === 'filters'} onClose={closeScenario} position="left" width="320px">
        <DrawerHeader title="Filters" onClose={closeScenario} />
        <DrawerBody>
          <div className="flex flex-col gap-3">
            {['active', 'archived', 'starred'].map((name) => (
              <div key={name} className="flex items-center gap-2 text-sm text-text-primary">
                <Checkbox
                  checked={!!filters[name]}
                  onChange={(value) => setFilters((prev) => ({ ...prev, [name]: value }))}
                />
                {name}
              </div>
            ))}
          </div>
        </DrawerBody>
      </Drawer>

      <Drawer
        isOpen={scenario === 'sheet'}
        onClose={closeScenario}
        position="bottom"
        height="45%"
        showHandle
      >
        <DrawerHeader title="Share" description="Bottom sheet với handle" onClose={closeScenario} />
        <DrawerBody>
          <div className="grid grid-cols-4 gap-3">
            {['Link', 'Email', 'Slack', 'Export'].map((item) => (
              <div
                key={item}
                className="flex h-16 items-center justify-center rounded-lg bg-card-hover text-sm text-text-primary"
              >
                {item}
              </div>
            ))}
          </div>
        </DrawerBody>
      </Drawer>
    </div>
  );
}