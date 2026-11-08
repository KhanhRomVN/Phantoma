import { useState } from 'react';
import { Button } from '@renderer/components/ui/Button';
import Checkbox from '@renderer/components/ui/Checkbox/Checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@renderer/components/ui/Table';
import { CANCEL_BUTTON_CLASS, Field, JsxPreview, Panel, Segmented, Stage, Toggle } from './shared';

const SIZES = ['sm', 'md', 'lg'] as const;
const ROLES = ['Viewer', 'Editor', 'Admin'];
const ACTIONS = ['Read', 'Write', 'Delete', 'Share'];

const INITIAL_TODOS = [
  { id: 1, text: 'Đọc .styling-rules.md', done: true },
  { id: 2, text: 'Sửa class Tailwind sai', done: true },
  { id: 3, text: 'Thêm demo cho từng UI', done: false },
  { id: 4, text: 'Chạy tsc kiểm tra', done: false },
];

const SETTINGS = [
  { key: 'autosave', title: 'Auto save', description: 'Tự lưu file sau mỗi 2 giây' },
  { key: 'telemetry', title: 'Telemetry', description: 'Gửi thống kê ẩn danh' },
  { key: 'notify', title: 'Notifications', description: 'Hiển thị thông báo hệ thống' },
];

export default function CheckboxTab() {
  const [size, setSize] = useState<(typeof SIZES)[number]>('md');
  const [disabled, setDisabled] = useState(false);
  const [checked, setChecked] = useState(true);
  const [todos, setTodos] = useState(INITIAL_TODOS);
  const [settings, setSettings] = useState<Record<string, boolean>>({ autosave: true });
  const [perms, setPerms] = useState<Record<string, boolean>>({
    'Viewer-Read': true,
    'Editor-Read': true,
    'Editor-Write': true,
    'Admin-Read': true,
    'Admin-Write': true,
    'Admin-Delete': true,
    'Admin-Share': true,
  });
  const [submitted, setSubmitted] = useState('');

  const doneCount = todos.filter((todo) => todo.done).length;
  const allDone = doneCount === todos.length;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setSubmitted(JSON.stringify(data));
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Panel title="Playground" description="checked, onChange, disabled, size">
        <div className="flex flex-col gap-4">
          <Stage>
            <Checkbox size={size} checked={checked} disabled={disabled} onChange={setChecked} />
          </Stage>
          <Field label="size">
            <Segmented value={size} options={SIZES} onChange={setSize} />
          </Field>
          <Field label="props">
            <div className="flex flex-col gap-2">
              <Toggle label="checked" checked={checked} onChange={setChecked} />
              <Toggle label="disabled" checked={disabled} onChange={setDisabled} />
            </div>
          </Field>
          <JsxPreview name="Checkbox" props={{ size, checked, disabled }} />
        </div>
      </Panel>

      <Panel
        title="Todo list + select all"
        description={`${doneCount}/${todos.length} hoàn thành`}
        actions={
          <Button
            className={CANCEL_BUTTON_CLASS}
            onClick={() => setTodos((prev) => prev.filter((todo) => !todo.done))}
          >
            Clear done
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-background">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${todos.length ? (doneCount / todos.length) * 100 : 0}%` }}
            />
          </div>
          <div className="flex items-center gap-2 border-b border-divider pb-2 text-xs font-medium text-text-primary">
            <Checkbox
              checked={allDone && todos.length > 0}
              onChange={(value) => setTodos((prev) => prev.map((todo) => ({ ...todo, done: value })))}
            />
            Select all
          </div>
          {todos.map((todo) => (
            <div key={todo.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={todo.done}
                onChange={(value) =>
                  setTodos((prev) => prev.map((item) => (item.id === todo.id ? { ...item, done: value } : item)))
                }
              />
              <span className={todo.done ? 'text-text-secondary line-through' : 'text-text-primary'}>
                {todo.text}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Settings rows" description="Checkbox ở cuối hàng, inputClassName rounded-full">
        <div className="flex flex-col divide-y divide-divider">
          {SETTINGS.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="text-sm font-medium text-text-primary">{item.title}</div>
                <div className="text-xs text-text-secondary">{item.description}</div>
              </div>
              <Checkbox
                size="lg"
                inputClassName="rounded-full"
                checked={!!settings[item.key]}
                onChange={(value) => setSettings((prev) => ({ ...prev, [item.key]: value }))}
              />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Permission matrix" description="Checkbox trong Table" className="xl:col-span-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell as="th">Role</TableCell>
              {ACTIONS.map((action) => (
                <TableCell key={action} as="th" className="text-center">
                  {action}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROLES.map((role) => (
              <TableRow key={role}>
                <TableCell>{role}</TableCell>
                {ACTIONS.map((action) => {
                  const key = `${role}-${action}`;
                  return (
                    <TableCell key={key} className="text-center">
                      <Checkbox
                        size="sm"
                        checked={!!perms[key]}
                        onChange={(value) => setPerms((prev) => ({ ...prev, [key]: value }))}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <Panel title="Form (id + name)" description="Submit để đọc FormData">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {['news', 'digest', 'promo'].map((name) => (
            <div key={name} className="flex items-center gap-2 text-sm text-text-primary">
              <Checkbox id={`ui-test-${name}`} name={name} defaultChecked={name === 'news'} />
              <label htmlFor={`ui-test-${name}`} className="cursor-pointer">
                {name}
              </label>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <Button className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70">
              Submit
            </Button>
            <code className="truncate font-mono text-[11px] text-text-secondary">
              {submitted || '{}'}
            </code>
          </div>
        </form>
      </Panel>
    </div>
  );
}