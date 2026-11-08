import { useState } from 'react';
import { Button } from '@renderer/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter } from '@renderer/components/ui/Drawer';
import type { DrawerProps } from '@renderer/components/ui/Drawer';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import type { TooltipProps } from '@renderer/components/ui/Tooltip';
import { Demo, Section } from '../shared';

const CANCEL_CLASS =
  'bg-button-soft-background text-text-secondary hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70 disabled:hover:bg-button-soft-background';

type ModalKind = 'default' | 'noCloseButton' | 'noBackdropClose' | 'customClass';

const MODAL_KINDS: { kind: ModalKind; label: string }[] = [
  { kind: 'default', label: 'Default' },
  { kind: 'noCloseButton', label: 'showCloseButton=false' },
  { kind: 'noBackdropClose', label: 'closeOnBackdropClick=false' },
  { kind: 'customClass', label: 'className=max-w-md' },
];

interface SampleModalProps {
  kind: ModalKind;
  open: boolean;
  onClose: () => void;
}

function SampleModal({ kind, open, onClose }: SampleModalProps) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      closeOnBackdropClick={kind !== 'noBackdropClose'}
      className={kind === 'customClass' ? 'max-w-md' : undefined}
    >
      <ModalHeader
        title={`Modal: ${kind}`}
        description="ModalHeader: title, description, onClose, showCloseButton"
        onClose={onClose}
        showCloseButton={kind !== 'noCloseButton'}
      />
      <ModalBody>
        <p className="text-sm text-text-primary">ModalBody content.</p>
      </ModalBody>
      <ModalFooter>
        <Button className={CANCEL_CLASS} onClick={onClose}>
          Cancel
        </Button>
        <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={onClose}>
          Confirm
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function ModalDemo() {
  const [open, setOpen] = useState<ModalKind | null>(null);
  const close = () => setOpen(null);

  return (
    <Section
      title="Modal"
      description="Props: isOpen, onClose, className, closeOnBackdropClick. Sub: ModalHeader, ModalBody, ModalFooter"
    >
      <Demo label="open variants">
        {MODAL_KINDS.map(({ kind, label }) => (
          <Button key={kind} className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={() => setOpen(kind)}>
            {label}
          </Button>
        ))}
      </Demo>
      {MODAL_KINDS.map(({ kind }) => (
        <SampleModal key={kind} kind={kind} open={open === kind} onClose={close} />
      ))}
    </Section>
  );
}

type DrawerPreset = Partial<Omit<DrawerProps, 'isOpen' | 'onClose' | 'children'>>;

const DRAWER_PRESETS: { label: string; props: DrawerPreset }[] = [
  { label: 'position=right', props: { position: 'right' } },
  { label: 'position=left', props: { position: 'left' } },
  { label: 'position=bottom', props: { position: 'bottom' } },
  { label: 'showHandle', props: { position: 'bottom', showHandle: true } },
  { label: 'width=480px', props: { position: 'right', width: '480px' } },
  { label: 'height=60%', props: { position: 'bottom', height: '60%' } },
  { label: 'closeOnBackdropClick=false', props: { closeOnBackdropClick: false } },
  { label: 'strategy=absolute', props: { strategy: 'absolute' } },
];

export function DrawerDemo() {
  const [active, setActive] = useState<number | null>(null);
  const close = () => setActive(null);
  const preset = active === null ? null : DRAWER_PRESETS[active];

  return (
    <Section
      title="Drawer"
      description="Props: isOpen, onClose, className, closeOnBackdropClick, height, width, strategy, position, showHandle"
    >
      <Demo label="presets">
        {DRAWER_PRESETS.map((item, index) => (
          <Button key={item.label} className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={() => setActive(index)}>
            {item.label}
          </Button>
        ))}
      </Demo>
      <div className="relative h-72 overflow-hidden rounded-lg border border-dashed border-border">
        <div className="flex h-full items-center justify-center text-xs text-text-secondary">
          Container (strategy=absolute render trong khung này)
        </div>
        <Drawer isOpen={preset !== null} onClose={close} {...(preset?.props ?? {})}>
          <DrawerHeader
            title="Drawer title"
            description="DrawerHeader: title, description, onClose, showCloseButton"
            onClose={close}
          />
          <DrawerBody>
            <p className="text-sm text-text-primary">DrawerBody content.</p>
          </DrawerBody>
          <DrawerFooter>
            <Button className={CANCEL_CLASS} onClick={close}>
              Cancel
            </Button>
            <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={close}>
              Confirm
            </Button>
          </DrawerFooter>
        </Drawer>
      </div>
    </Section>
  );
}

type TooltipPreset = Partial<Omit<TooltipProps, 'children' | 'content'>>;

export function TooltipDemo() {
  const [open, setOpen] = useState(false);

  const trigger = (label: string, props: TooltipPreset = {}) => (
    <Tooltip key={label} content={`Tooltip: ${label}`} {...props}>
      <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70">
        {label}
      </Button>
    </Tooltip>
  );

  return (
    <Section
      title="Tooltip"
      description="Props: content, open, defaultOpen, onOpenChange, delayDuration, disableHoverableContent, side, align, sideOffset, alignOffset, className, contentClassName"
    >
      <Demo label="side">
        {(['top', 'bottom', 'left', 'right'] as const).map((side) =>
          trigger(`side=${side}`, { side }),
        )}
      </Demo>
      <Demo label="align (side=bottom)">
        {(['start', 'center', 'end'] as const).map((align) =>
          trigger(`align=${align}`, { side: 'bottom', align }),
        )}
      </Demo>
      <Demo label="delayDuration">
        {trigger('delay=0', { delayDuration: 0 })}
        {trigger('delay=800', { delayDuration: 800 })}
      </Demo>
      <Demo label="offset">
        {trigger('sideOffset=20', { sideOffset: 20 })}
        {trigger('alignOffset=20', { side: 'bottom', align: 'start', alignOffset: 20 })}
      </Demo>
      <Demo label="disableHoverableContent">
        {trigger('not hoverable', { disableHoverableContent: true })}
      </Demo>
      <Demo label="defaultOpen">{trigger('defaultOpen', { defaultOpen: true })}</Demo>
      <Demo label="controlled open / onOpenChange">
        <Tooltip content="Controlled tooltip" open={open} onOpenChange={setOpen}>
          <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70">
            hover me
          </Button>
        </Tooltip>
        <Button className={CANCEL_CLASS} onClick={() => setOpen((v) => !v)}>
          toggle (open = {String(open)})
        </Button>
      </Demo>
      <Demo label="rich content + className / contentClassName">
        <Tooltip
          content={
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">Rich content</span>
              <span>ReactNode</span>
            </div>
          }
          className="inline-flex"
          contentClassName="border border-primary"
        >
          <Button className="border border-border text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/10 active:bg-primary/20">
            rich
          </Button>
        </Tooltip>
      </Demo>
    </Section>
  );
}