import { useState } from 'react';
import { Search, Eye, Mail, Copy, Trash2 } from 'lucide-react';
import Badge from '@renderer/components/ui/Badge/Badge';
import Kbd from '@renderer/components/ui/Kbd/Kbd';
import Checkbox from '@renderer/components/ui/Checkbox/Checkbox';
import { Input, InputField, InputAction } from '@renderer/components/ui/Input';
import { Demo, Section } from '../shared';

export function BadgeDemo() {
  const row = (label: string, node: React.ReactNode) => (
    <span className="inline-flex items-center text-xs text-text-primary">
      {label}
      {node}
    </span>
  );

  return (
    <Section title="Badge" description="Props: count, max, className">
      <Demo label="count">
        {row('count=0 (renders null)', <Badge count={0} />)}
        {row('count=3', <Badge count={3} />)}
        {row('count=42', <Badge count={42} />)}
      </Demo>
      <Demo label="max">
        {row('count=100, max mặc định 99', <Badge count={100} />)}
        {row('count=25, max=9', <Badge count={25} max={9} />)}
      </Demo>
      <Demo label="className override">
        {row('error', <Badge count={7} className="bg-error/20 text-error" />)}
        {row('success', <Badge count={7} className="bg-success/20 text-success" />)}
        {row('warn', <Badge count={7} className="bg-warn/20 text-warn" />)}
        {row('info', <Badge count={7} className="bg-info/20 text-info" />)}
      </Demo>
    </Section>
  );
}

export function KbdDemo() {
  return (
    <Section title="Kbd" description="Props: children, className">
      <Demo label="children">
        <Kbd>Ctrl</Kbd>
        <span className="text-xs text-text-secondary">+</span>
        <Kbd>K</Kbd>
        <Kbd>Esc</Kbd>
        <Kbd>Enter</Kbd>
      </Demo>
      <Demo label="className override">
        <Kbd className="border-primary text-primary">Primary</Kbd>
        <Kbd className="min-w-[48px]">Wide</Kbd>
      </Demo>
    </Section>
  );
}

export function CheckboxDemo() {
  const [checked, setChecked] = useState(false);

  return (
    <Section
      title="Checkbox"
      description="Props: checked, defaultChecked, onChange, disabled, size, id, name, className, inputClassName"
    >
      <Demo label="size (controlled)">
        {(['sm', 'md', 'lg'] as const).map((size) => (
          <Checkbox key={size} size={size} checked={checked} onChange={setChecked} />
        ))}
        <span className="text-xs text-text-secondary">checked = {String(checked)}</span>
      </Demo>
      <Demo label="defaultChecked (uncontrolled)">
        <Checkbox defaultChecked />
        <Checkbox />
      </Demo>
      <Demo label="disabled">
        <Checkbox disabled />
        <Checkbox disabled defaultChecked />
      </Demo>
      <Demo label="id + name (label htmlFor)">
        <Checkbox id="ui-test-agree" name="agree" />
        <label htmlFor="ui-test-agree" className="cursor-pointer text-xs text-text-primary">
          I agree
        </label>
      </Demo>
      <Demo label="className / inputClassName">
        <Checkbox defaultChecked className="p-1" inputClassName="rounded-full" />
      </Demo>
    </Section>
  );
}

export function InputDemo() {
  const [value, setValue] = useState('');

  return (
    <>
      <Section
        title="Input"
        description="Props: label, error, hint, leftIcon, rightIcon, containerClassName, labelClassName, inputClassName, + input attributes"
      >
        <Demo label="label + hint + controlled value" column>
          <Input
            label="Name"
            hint="Gợi ý hiển thị khi không có lỗi"
            placeholder="Type something..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Demo>
        <Demo label="error (ẩn hint)" column>
          <Input label="Email" error="Email không hợp lệ" hint="không hiển thị" defaultValue="abc" />
        </Demo>
        <Demo label="leftIcon" column>
          <Input leftIcon={<Search className="h-4 w-4" />} placeholder="Search..." />
        </Demo>
        <Demo label="rightIcon + type=password" column>
          <Input
            type="password"
            rightIcon={<Eye className="h-4 w-4" />}
            placeholder="Password"
          />
        </Demo>
        <Demo label="leftIcon + rightIcon" column>
          <Input
            leftIcon={<Mail className="h-4 w-4" />}
            rightIcon={<Copy className="h-4 w-4" />}
            placeholder="mail@example.com"
          />
        </Demo>
        <Demo label="disabled" column>
          <Input label="Disabled" disabled defaultValue="read only" />
        </Demo>
        <Demo label="containerClassName / labelClassName / inputClassName" column>
          <Input
            label="Custom"
            containerClassName="max-w-xs"
            labelClassName="text-primary"
            inputClassName="font-mono"
            placeholder="max-w-xs, mono"
          />
        </Demo>
      </Section>

      <Section title="InputField" description="Props: className + input attributes">
        <InputField placeholder="InputField" />
        <InputField placeholder="InputField disabled" disabled />
      </Section>

      <Section title="InputAction" description="Props: children, onClick, disabled, className">
        <Demo label="default">
          <InputAction onClick={() => setValue('')}>
            <Trash2 className="h-4 w-4" />
          </InputAction>
          <InputAction disabled>
            <Copy className="h-4 w-4" />
          </InputAction>
        </Demo>
      </Section>
    </>
  );
}