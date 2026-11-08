import { useState } from 'react';
import { Copy, Eye, EyeOff, Lock, Mail, Search, X } from 'lucide-react';
import { Button } from '@renderer/components/ui/Button';
import { Input, InputAction, InputField } from '@renderer/components/ui/Input';
import { Field, JsxPreview, Panel, Stage, Toggle } from './shared';

const TYPES = ['text', 'email', 'password', 'number', 'date', 'time', 'url', 'tel', 'search'];
const RESULTS = ['Button', 'Badge', 'Kbd', 'Checkbox', 'Input', 'Modal', 'Drawer', 'Dropdown'];

export default function InputTab() {
  const [showLabel, setShowLabel] = useState(true);
  const [showHint, setShowHint] = useState(true);
  const [showError, setShowError] = useState(false);
  const [leftIcon, setLeftIcon] = useState(true);
  const [rightIcon, setRightIcon] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [value, setValue] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);

  const [query, setQuery] = useState('');

  const emailError = touched && !/^\S+@\S+\.\S+$/.test(email) ? 'Email không hợp lệ' : undefined;
  const passwordError = touched && password.length < 6 ? 'Tối thiểu 6 ký tự' : undefined;
  const filtered = RESULTS.filter((item) => item.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Panel
        title="Playground"
        description="label, hint, error, leftIcon, rightIcon, disabled"
        className="xl:row-span-2"
      >
        <div className="flex flex-col gap-4">
          <Stage className="min-h-[160px]">
            <div className="w-full max-w-xs">
              <Input
                label={showLabel ? 'Email' : undefined}
                hint={showHint ? 'Chúng tôi không chia sẻ email của bạn' : undefined}
                error={showError ? 'Email không hợp lệ' : undefined}
                leftIcon={leftIcon ? <Mail className="h-4 w-4" /> : undefined}
                rightIcon={rightIcon ? <Copy className="h-4 w-4" /> : undefined}
                disabled={disabled}
                placeholder="mail@example.com"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </Stage>
          <Field label="props">
            <div className="grid grid-cols-2 gap-2">
              <Toggle label="label" checked={showLabel} onChange={setShowLabel} />
              <Toggle label="hint" checked={showHint} onChange={setShowHint} />
              <Toggle label="error (ẩn hint)" checked={showError} onChange={setShowError} />
              <Toggle label="leftIcon" checked={leftIcon} onChange={setLeftIcon} />
              <Toggle label="rightIcon" checked={rightIcon} onChange={setRightIcon} />
              <Toggle label="disabled" checked={disabled} onChange={setDisabled} />
            </div>
          </Field>
          <JsxPreview
            name="Input"
            props={{
              label: showLabel ? 'Email' : undefined,
              hint: showHint ? '...' : undefined,
              error: showError ? '...' : undefined,
              leftIcon,
              rightIcon,
              disabled,
              placeholder: 'mail@example.com',
            }}
          />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Login form" description="error theo validate, rightIcon + InputAction">
          <div className="flex flex-col gap-3">
            <Input
              label="Email"
              type="email"
              leftIcon={<Mail className="h-4 w-4" />}
              value={email}
              error={emailError}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <InputAction onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </InputAction>
              }
              value={password}
              error={passwordError}
              hint="Ít nhất 6 ký tự"
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70" onClick={() => setTouched(true)}>
              Sign in
            </Button>
          </div>
        </Panel>

        <Panel title="Search bar" description="InputField + InputAction trong container riêng">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-input-background px-3">
              <Search className="h-4 w-4 shrink-0 text-text-secondary" />
              <InputField
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm component..."
                className="flex-1 border-none bg-transparent outline-none"
              />
              <InputAction onClick={() => setQuery('')} disabled={!query}>
                <X className="h-4 w-4" />
              </InputAction>
            </div>
            <div className="flex flex-wrap gap-2">
              {filtered.map((item) => (
                <span
                  key={item}
                  className="rounded-md bg-button-soft-background px-2 py-1 text-xs text-text-primary"
                >
                  {item}
                </span>
              ))}
              {filtered.length === 0 && (
                <span className="text-xs text-text-secondary">Không có kết quả</span>
              )}
            </div>
          </div>
        </Panel>

        <Panel
          title="Custom classes"
          description="containerClassName, labelClassName, inputClassName"
          className="lg:col-span-2"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Input label="Pill" inputClassName="rounded-full px-4" placeholder="rounded-full" />
            <Input
              label="Mono"
              labelClassName="font-mono text-primary"
              inputClassName="font-mono"
              placeholder="font-mono"
            />
            <Input
              label="Large"
              containerClassName="gap-2"
              inputClassName="py-3 text-base"
              placeholder="py-3 text-base"
            />
          </div>
        </Panel>

        <Panel
          title="HTML input types"
          description="Input nhận mọi attribute của input"
          className="lg:col-span-2"
        >
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {TYPES.map((type) => (
              <Input key={type} type={type} label={`type=${type}`} placeholder={type} />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}