import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  FileText,
  Folder,
  LogOut,
  MoreHorizontal,
  Palette,
  Pencil,
  Settings,
  Trash2,
  User,
} from 'lucide-react';
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
import type { DropdownProps } from '@renderer/components/ui/Dropdown';
import { Field, JsxPreview, Panel, Segmented, Toggle } from './shared';

const SIDES = ['bottom', 'top', 'left', 'right'] as const;
const ALIGNS = ['start', 'center', 'end'] as const;
const SIZES = ['sm', 'md', 'lg'] as const;
const STRATEGIES = ['fixed', 'relative'] as const;
const TRIGGERS = ['click', 'contextmenu'] as const;
const OFFSETS: number[] = [4, 12, 32];
const WIDTHS: number[] = [0, 200, 280];
const MENU_ITEMS = ['Profile', 'Settings', 'Billing', 'Team', 'Integrations', 'API keys', 'Audit log'];
const LANGS = ['English', 'Tiếng Việt', 'Français', 'Deutsch', 'Español', 'Português', 'Italiano'];
const THEMES = ['MidnightBlue', 'MonoBlack', 'VioletAbyss', 'EmberVoid'];
const FILES = ['README.md', 'package.json', 'tailwind.config.js', 'src/'];

export default function DropdownTab() {
  const [side, setSide] = useState<(typeof SIDES)[number]>('bottom');
  const [align, setAlign] = useState<(typeof ALIGNS)[number]>('start');
  const [size, setSize] = useState<(typeof SIZES)[number]>('md');
  const [strategy, setStrategy] = useState<(typeof STRATEGIES)[number]>('fixed');
  const [trigger, setTrigger] = useState<(typeof TRIGGERS)[number]>('click');
  const [offset, setOffset] = useState(12);
  const [width, setWidth] = useState(0);
  const [searchable, setSearchable] = useState(false);
  const [closeOnSelect, setCloseOnSelect] = useState(true);
  const [disableAutoFlip, setDisableAutoFlip] = useState(false);
  const [picked, setPicked] = useState('none');

  const [lang, setLang] = useState('English');
  const [theme, setTheme] = useState('MidnightBlue');
  const [lastAction, setLastAction] = useState('none');

  const dropdownProps: Omit<DropdownProps, 'children'> = {
    side,
    align,
    sideOffset: offset,
    strategy,
    trigger,
    searchable,
    closeOnSelect,
    disableAutoFlip,
    width: width || undefined,
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Panel
        title="Playground"
        description={`picked: ${picked}`}
        className="xl:row-span-2"
      >
        <div className="flex flex-col gap-4">
          <div className="flex min-h-[140px] items-center justify-center rounded-lg border border-dashed border-border bg-background p-6">
            <Dropdown {...dropdownProps}>
              <DropdownTrigger asChild>
                {trigger === 'click' ? (
                  <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70">
                    Open menu
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <div className="flex h-24 w-56 items-center justify-center rounded-lg border border-border text-xs text-text-secondary">
                    Right click here
                  </div>
                )}
              </DropdownTrigger>
              <DropdownContent size={size}>
                {MENU_ITEMS.map((item) => (
                  <DropdownItem key={item} onClick={() => setPicked(item)}>
                    {item}
                  </DropdownItem>
                ))}
                <DropdownSeparator />
                <DropdownItem variant="error" onClick={() => setPicked('Sign out')}>
                  Sign out
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          </div>
          <Field label="trigger">
            <Segmented value={trigger} options={TRIGGERS} onChange={setTrigger} />
          </Field>
          <Field label="side">
            <Segmented value={side} options={SIDES} onChange={setSide} />
          </Field>
          <Field label="align">
            <Segmented value={align} options={ALIGNS} onChange={setAlign} />
          </Field>
          <Field label="sideOffset">
            <Segmented value={offset} options={OFFSETS} onChange={setOffset} />
          </Field>
          <Field label="width (0 = auto)">
            <Segmented value={width} options={WIDTHS} onChange={setWidth} />
          </Field>
          <Field label="strategy">
            <Segmented value={strategy} options={STRATEGIES} onChange={setStrategy} />
          </Field>
          <Field label="DropdownContent size">
            <Segmented value={size} options={SIZES} onChange={setSize} />
          </Field>
          <Field label="boolean props">
            <div className="grid grid-cols-2 gap-2">
              <Toggle label="searchable" checked={searchable} onChange={setSearchable} />
              <Toggle label="closeOnSelect" checked={closeOnSelect} onChange={setCloseOnSelect} />
              <Toggle label="disableAutoFlip" checked={disableAutoFlip} onChange={setDisableAutoFlip} />
            </div>
          </Field>
          <JsxPreview name="Dropdown" props={dropdownProps as Record<string, unknown>} />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="User menu" description={`DropdownSub chọn theme: ${theme}`}>
          <Dropdown align="start" width={220}>
            <DropdownTrigger>
              <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70">
                <User className="h-3.5 w-3.5" />
                Account
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem icon={<User className="h-3.5 w-3.5" />}>Profile</DropdownItem>
              <DropdownItem icon={<Settings className="h-3.5 w-3.5" />}>Settings</DropdownItem>
              <DropdownSub>
                <DropdownSubTrigger icon={<Palette />}>Theme</DropdownSubTrigger>
                <DropdownSubContent>
                  {THEMES.map((item) => (
                    <DropdownItem
                      key={item}
                      icon={item === theme ? <Check className="h-3.5 w-3.5" /> : undefined}
                      onClick={() => setTheme(item)}
                    >
                      {item}
                    </DropdownItem>
                  ))}
                </DropdownSubContent>
              </DropdownSub>
              <DropdownSeparator />
              <DropdownItem variant="error" icon={<LogOut className="h-3.5 w-3.5" />}>
                Log out
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </Panel>

        <Panel title="Select-like" description="searchable + width, item có icon check">
          <Dropdown searchable width={220}>
            <DropdownTrigger>
              <Button className="border border-border text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/10 active:bg-primary/20">
                {lang}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownTrigger>
            <DropdownContent className="max-h-48 overflow-y-auto" hideScrollbar>
              {LANGS.map((item) => (
                <DropdownItem
                  key={item}
                  icon={item === lang ? <Check className="h-3.5 w-3.5" /> : undefined}
                  onClick={() => setLang(item)}
                >
                  {item}
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>
        </Panel>

        <Panel
          title="File list context menu"
          description={`Chuột phải vào hàng. Action cuối: ${lastAction}`}
        >
          <div className="flex flex-col">
            {FILES.map((file) => (
              <Dropdown key={file} trigger="contextmenu">
                <DropdownTrigger asChild>
                  <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-primary hover:bg-card-hover">
                    {file.endsWith('/') ? (
                      <Folder className="h-4 w-4 text-text-secondary" />
                    ) : (
                      <FileText className="h-4 w-4 text-text-secondary" />
                    )}
                    {file}
                  </div>
                </DropdownTrigger>
                <DropdownContent>
                  <DropdownItem
                    icon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => setLastAction(`rename ${file}`)}
                  >
                    Rename
                  </DropdownItem>
                  <DropdownItem
                    icon={<Copy className="h-3.5 w-3.5" />}
                    onClick={() => setLastAction(`copy ${file}`)}
                  >
                    Copy path
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem
                    variant="error"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => setLastAction(`delete ${file}`)}
                  >
                    Delete
                  </DropdownItem>
                </DropdownContent>
              </Dropdown>
            ))}
          </div>
        </Panel>

        <Panel title="Row action menu" description="align=end, nút ba chấm">
          <div className="flex flex-col divide-y divide-divider">
            {['Alpha', 'Beta', 'Gamma'].map((row) => (
              <div key={row} className="flex items-center justify-between py-2">
                <span className="text-sm text-text-primary">{row}</span>
                <Dropdown align="end">
                  <DropdownTrigger>
                    <Button className="text-primary hover:bg-primary/10 active:bg-primary/20 px-2">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownContent>
                    <DropdownItem onClick={() => setLastAction(`edit ${row}`)}>Edit</DropdownItem>
                    <DropdownItem disabled>Duplicate</DropdownItem>
                    <DropdownItem variant="error" onClick={() => setLastAction(`delete ${row}`)}>
                      Delete
                    </DropdownItem>
                  </DropdownContent>
                </Dropdown>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}