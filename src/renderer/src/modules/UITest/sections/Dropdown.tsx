import React, { useState } from 'react';
import { Copy, Pencil, Trash2, Share2 } from 'lucide-react';
import { Button } from '@renderer/components/ui/Button';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownSub,
  DropdownSubTrigger,
  DropdownSubContent,
} from '@renderer/components/ui/Dropdown';
import type { DropdownProps, DropdownContentProps } from '@renderer/components/ui/Dropdown';
import { Demo, Section } from '../shared';

const DEFAULT_ITEMS = (
  <>
    <DropdownItem icon={<Copy className="h-3.5 w-3.5" />}>Copy</DropdownItem>
    <DropdownItem icon={<Pencil className="h-3.5 w-3.5" />}>Edit</DropdownItem>
    <DropdownItem disabled>Disabled</DropdownItem>
    <DropdownSeparator />
    <DropdownItem variant="error" icon={<Trash2 className="h-3.5 w-3.5" />}>
      Delete
    </DropdownItem>
  </>
);

interface MenuProps {
  label: string;
  dropdown?: Partial<Omit<DropdownProps, 'children'>>;
  content?: Partial<Omit<DropdownContentProps, 'children'>>;
  children?: React.ReactNode;
}

function Menu({ label, dropdown, content, children }: MenuProps) {
  return (
    <Dropdown {...dropdown}>
      <DropdownTrigger>
        <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70">
          {label}
        </Button>
      </DropdownTrigger>
      <DropdownContent {...content}>{children ?? DEFAULT_ITEMS}</DropdownContent>
    </Dropdown>
  );
}

const MANY_ITEMS = Array.from({ length: 12 }, (_, i) => (
  <DropdownItem key={i}>Item {i + 1}</DropdownItem>
));

export function DropdownDemo() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState('none');

  return (
    <>
      <Section
        title="Dropdown"
        description="Props: open, onOpenChange, align, side, sideOffset, disableAutoFlip, strategy, className, trigger, position, width, searchable, closeOnSelect"
      >
        <Demo label="default (click)">
          <Menu label="Open" />
        </Demo>
        <Demo label="side">
          {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
            <Menu key={side} label={`side=${side}`} dropdown={{ side }} />
          ))}
        </Demo>
        <Demo label="align">
          {(['start', 'center', 'end'] as const).map((align) => (
            <Menu key={align} label={`align=${align}`} dropdown={{ align }} />
          ))}
        </Demo>
        <Demo label="sideOffset / width / disableAutoFlip">
          <Menu label="sideOffset=24" dropdown={{ sideOffset: 24 }} />
          <Menu label="width=240" dropdown={{ width: 240 }} />
          <Menu label="disableAutoFlip" dropdown={{ disableAutoFlip: true }} />
        </Demo>
        <Demo label="strategy">
          <Menu label="strategy=fixed" dropdown={{ strategy: 'fixed' }} />
          <Menu label="strategy=relative" dropdown={{ strategy: 'relative' }} />
        </Demo>
        <Demo label="className">
          <Menu label="className=border" dropdown={{ className: 'border border-primary' }} />
        </Demo>
        <Demo label="searchable">
          <Menu label="searchable" dropdown={{ searchable: true }}>
            {MANY_ITEMS}
          </Menu>
        </Demo>
        <Demo label="closeOnSelect">
          <Menu label="closeOnSelect=false" dropdown={{ closeOnSelect: false }} />
          <Menu label="item closeOnSelect override" dropdown={{ closeOnSelect: false }}>
            <DropdownItem closeOnSelect>Closes on select</DropdownItem>
            <DropdownItem>Stays open</DropdownItem>
          </Menu>
        </Demo>
        <Demo label="asChild trigger">
          <Dropdown>
            <DropdownTrigger asChild>
              <Button className="border border-border text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/10 active:bg-primary/20">
                asChild
              </Button>
            </DropdownTrigger>
            <DropdownContent>{DEFAULT_ITEMS}</DropdownContent>
          </Dropdown>
        </Demo>
        <Demo label="controlled open / onOpenChange / position (fixed)">
          <Dropdown
            open={open}
            onOpenChange={setOpen}
            strategy="fixed"
            position={{ top: 160, left: 480 }}
          >
            <DropdownTrigger>
              <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70">
                open = {String(open)}
              </Button>
            </DropdownTrigger>
            <DropdownContent>{DEFAULT_ITEMS}</DropdownContent>
          </Dropdown>
        </Demo>
        <Demo label="trigger=contextmenu">
          <Dropdown trigger="contextmenu">
            <DropdownTrigger asChild>
              <div className="flex h-20 w-64 items-center justify-center rounded-lg border border-dashed border-border text-xs text-text-secondary">
                Right click here
              </div>
            </DropdownTrigger>
            <DropdownContent>{DEFAULT_ITEMS}</DropdownContent>
          </Dropdown>
        </Demo>
      </Section>

      <Section title="DropdownContent" description="Props: size, hideScrollbar, className">
        <Demo label="size">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Menu key={size} label={`size=${size}`} content={{ size }} />
          ))}
        </Demo>
        <Demo label="className max-h + hideScrollbar">
          <Menu
            label="scroll"
            content={{ className: 'max-h-32 overflow-y-auto', hideScrollbar: true }}
          >
            {MANY_ITEMS}
          </Menu>
        </Demo>
      </Section>

      <Section
        title="DropdownItem"
        description="Props: onClick, className, disabled, icon, closeOnSelect, variant, noPadding"
      >
        <Demo label="onClick (picked)">
          <Menu label={`picked = ${picked}`}>
            <DropdownItem onClick={() => setPicked('A')}>Pick A</DropdownItem>
            <DropdownItem onClick={() => setPicked('B')}>Pick B</DropdownItem>
            <DropdownItem disabled onClick={() => setPicked('C')}>
              Pick C (disabled)
            </DropdownItem>
          </Menu>
        </Demo>
        <Demo label="variant / icon / noPadding / className">
          <Menu label="variants">
            <DropdownItem variant="default" icon={<Share2 className="h-3.5 w-3.5" />}>
              default + icon
            </DropdownItem>
            <DropdownItem variant="error">error</DropdownItem>
            <DropdownItem noPadding className="px-6 py-2">
              noPadding + className
            </DropdownItem>
          </Menu>
        </Demo>
      </Section>

      <Section
        title="DropdownSub"
        description="DropdownSub props: open, onOpenChange, side, sideOffset, align. DropdownSubTrigger: icon, disabled"
      >
        <Demo label="submenu">
          <Menu label="with submenu">
            <DropdownItem>Plain item</DropdownItem>
            <DropdownSub>
              <DropdownSubTrigger icon={<Share2 />}>Share</DropdownSubTrigger>
              <DropdownSubContent>
                <DropdownItem>Email</DropdownItem>
                <DropdownItem>Link</DropdownItem>
              </DropdownSubContent>
            </DropdownSub>
            <DropdownSub side="left">
              <DropdownSubTrigger>side=left</DropdownSubTrigger>
              <DropdownSubContent>
                <DropdownItem>Left A</DropdownItem>
                <DropdownItem>Left B</DropdownItem>
              </DropdownSubContent>
            </DropdownSub>
            <DropdownSub>
              <DropdownSubTrigger disabled>Disabled sub</DropdownSubTrigger>
              <DropdownSubContent>
                <DropdownItem>Never shown</DropdownItem>
              </DropdownSubContent>
            </DropdownSub>
          </Menu>
        </Demo>
      </Section>
    </>
  );
}