/**
 * ------------------------------------------------------------------
 * DatabaseManagerDrawer
 * ------------------------------------------------------------------
 * Bottom-sheet drawer tạo/sửa database manager. Hỗ trợ 2 loại:
 * - local-file : chọn đường dẫn file SQLite trong máy
 * - connection : host/port/database/username/password/sslMode/...
 *
 * Điều kiện lưu: local-file phải trỏ tới file tồn tại; connection phải
 * test connection thành công trước.
 * Tham khảo UI của EditAccountDrawer.
 * ------------------------------------------------------------------
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  FolderOpen,
  Loader2,
  Server,
  X,
  XCircle,
} from 'lucide-react';
import { extensionService } from '../../../../services/ExtensionService';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { useDbFetch } from '../../../../services/useDbFetch';
import { $ } from '@renderer/utils/color';

export type ManagerType = 'local-file' | 'connection';
export type DbType = 'sqlite' | 'postgres' | 'mysql' | 'mariadb' | 'mssql' | 'mongodb';

/** Các db_type hợp lệ cho kết nối từ xa (loại sqlite vì đã có 'local-file'). */
const CONNECTION_DB_TYPES: DbType[] = ['postgres', 'mysql', 'mariadb', 'mssql', 'mongodb'];

/** File logo trong images/database_icons theo db_type (khớp DatabaseManagerCard). */
const DB_ICON_FILES: Partial<Record<DbType, string>> = {
  postgres: 'postgresql.svg',
  mysql: 'mysql.svg',
  mariadb: 'mariadb.svg',
  mongodb: 'mongodb.svg',
};

/** Logo engine từ images/database_icons; engine chưa có logo (VD: mssql) → icon Server. */
const DbTypeIcon: React.FC<{ type: DbType; size?: number }> = ({ type, size = 16 }) => {
  const file = DB_ICON_FILES[type];
  if (!file) return <Server size={size} style={{ flexShrink: 0 }} />;
  const base = (window as any).__zenImagesUri || '/images';
  return (
    <img
      src={`${base}/database_icons/${file}`}
      alt={type}
      width={size}
      height={size}
      draggable={false}
      style={{ objectFit: 'contain', flexShrink: 0 }}
    />
  );
};

export interface DatabaseManagerPayload {
  id?: string;
  name: string;
  type: ManagerType;
  db_type?: DbType;
  icon?: string;
  color?: string;
  file_path?: string;
  host?: string;
  port?: number | null;
  database_name?: string;
  username?: string;
  password?: string;
  ssl_mode?: string;
  channel_binding?: string;
}

interface DatabaseManagerDrawerProps {
  open: boolean;
  /** Dữ liệu khởi tạo khi sửa; null khi tạo mới */
  initial?: DatabaseManagerPayload | null;
  onOpenChange: (open: boolean) => void;
  /** Gọi sau khi lưu thành công (create/update) */
  onSaved: () => void;
}

const SSL_MODES = ['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'];
const CHANNEL_BINDINGS = ['disable', 'prefer', 'require'];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  backgroundColor: $('--input-background'),
  border: 'none',
  borderRadius: '8px',
  color: $('--text-primary'),
  outline: 'none',
  boxSizing: 'border-box',
  height: '34px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: $('--text-secondary'),
  marginBottom: '5px',
  display: 'block',
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col min-w-0">
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

/** Ô nhập password có nút bật/tắt hiển thị giá trị. */
const PasswordInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, paddingRight: '34px' }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        title={visible ? 'Hide password' : 'Show password'}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute top-1/2 right-1 -translate-y-1/2 w-6 h-6 flex items-center justify-center border-none rounded-md bg-transparent text-text-secondary cursor-pointer hover:bg-gray-500/10 transition-colors"
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
};

const DrawerBody: React.FC<Omit<DatabaseManagerDrawerProps, 'open'>> = ({
  initial,
  onOpenChange,
  onSaved,
}) => {
  const dbFetch = useDbFetch();
  const isEdit = !!initial?.id;

  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<ManagerType>(initial?.type ?? 'local-file');
  const [dbType, setDbType] = useState<DbType>(
    initial?.db_type ?? (initial?.type === 'connection' ? 'postgres' : 'sqlite'),
  );
  const [filePath, setFilePath] = useState(initial?.file_path ?? '');
  const [host, setHost] = useState(initial?.host ?? '');
  const [port, setPort] = useState<string>(initial?.port != null ? String(initial.port) : '');
  const [databaseName, setDatabaseName] = useState(initial?.database_name ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [sslMode, setSslMode] = useState(initial?.ssl_mode ?? 'prefer');
  const [channelBinding, setChannelBinding] = useState(initial?.channel_binding ?? 'prefer');

  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fileExists, setFileExists] = useState(false);
  const [checkingFile, setCheckingFile] = useState(false);

  // Kiểm tra file local có tồn tại không (debounce 300ms) để gate nút Save.
  React.useEffect(() => {
    if (type !== 'local-file') return undefined;
    const p = filePath.trim();
    if (!p) {
      setFileExists(false);
      return undefined;
    }
    setCheckingFile(true);
    const requestId = `checkPath-${Date.now()}-${Math.random()}`;
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.requestId !== requestId || msg?.command !== 'pathExistsResult') {
        return;
      }
      window.removeEventListener('message', handler);
      setCheckingFile(false);
      setFileExists(!!msg.exists);
    };
    window.addEventListener('message', handler);
    const debounce = setTimeout(() => {
      extensionService.postMessage({
        command: 'checkPathExists',
        requestId,
        path: p,
      });
    }, 300);
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      setCheckingFile(false);
    }, 5000);
    return () => {
      clearTimeout(debounce);
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
    };
  }, [type, filePath]);

  // Tên bị cấm — dành riêng cho fallback database connection của AIWeb2API.
  const RESERVED_NAMES = ['aiweb2api'];
  const RESERVED_FILES = ['aiweb2api.sqlite'];

  const isReservedName = RESERVED_NAMES.includes(name.trim().toLowerCase());
  const isReservedFile =
    type === 'local-file' &&
    RESERVED_FILES.includes(filePath.trim().split(/[\\/]/).pop()?.toLowerCase() ?? '');

  // local-file yêu cầu file tồn tại; connection yêu cầu test connection thành công.
  const canSave =
    !!name.trim() &&
    !isReservedName &&
    !isReservedFile &&
    (type === 'local-file' ? fileExists : testOk);

  const buildPayload = (): DatabaseManagerPayload => ({
    id: initial?.id,
    name: name.trim(),
    type,
    db_type: type === 'connection' ? dbType : 'sqlite',
    file_path: type === 'local-file' ? filePath.trim() : undefined,
    host: type === 'connection' ? host.trim() : undefined,
    port: type === 'connection' && port.trim() !== '' ? Number(port.trim()) : undefined,
    database_name: type === 'connection' ? databaseName.trim() : undefined,
    username: type === 'connection' ? username.trim() : undefined,
    password: type === 'connection' ? password : undefined,
    ssl_mode: type === 'connection' ? sslMode : undefined,
    channel_binding: type === 'connection' ? channelBinding : undefined,
  });

  const pickFile = () => {
    const requestId = `pickPath-${Date.now()}`;
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.requestId !== requestId || msg?.command !== 'pathPicked') return;
      window.removeEventListener('message', handler);
      if (msg.cancelled) return;
      if (typeof msg.path === 'string' && msg.path) {
        setFilePath(msg.path);
        setTestOk(false);
      }
    };
    window.addEventListener('message', handler);
    extensionService.postMessage({
      command: 'pickPath',
      requestId,
      mode: 'pickFile',
      defaultPath: filePath || undefined,
    });
  };

  const testConnection = async () => {
    const payload = buildPayload();
    setTesting(true);
    setTestMessage(null);
    try {
      const res = await dbFetch(`/v1/database-managers/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setTestOk(!!data.success);
      setTestMessage(data.message ?? (data.success ? 'OK' : 'Failed'));
    } catch (e: any) {
      setTestOk(false);
      setTestMessage(e?.message ?? 'Network error');
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload();
      const path = isEdit ? `/v1/database-managers/${initial!.id}` : `/v1/database-managers`;
      const res = await dbFetch(path, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
        onOpenChange(false);
      } else {
        setError(data.message ?? 'Save failed');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const saveDisabled = !canSave || saving || checkingFile;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/55 z-[200] animate-fadeIn"
        onClick={() => !saving && onOpenChange(false)}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-tertiary-bg border-t border-border shadow-[0_-8px_32px_rgba(0,0,0,0.25)] z-[201] max-h-[80%] flex flex-col animate-slideUp">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <div className="text-base font-bold text-text-primary">
              {isEdit ? 'Edit Database Manager' : 'Add Database Manager'}
            </div>
            <div className="text-[11px] text-text-secondary opacity-70 overflow-hidden text-ellipsis whitespace-nowrap">
              {isEdit ? initial?.name : 'Local SQLite file or remote connection'}
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="p-1.5 rounded border-none bg-transparent text-text-secondary cursor-pointer flex items-center transition-all hover:bg-red-500/15 hover:text-red-500"
          >
            <X size={16} />
          </button>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 flex flex-col gap-3">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My local database"
              disabled={saving}
              style={inputStyle}
            />
          </Field>

          <Field label="Storage type">
            <div className="flex gap-2">
              {(['local-file', 'connection'] as ManagerType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setTestOk(false);
                    setTestMessage(null);
                    // Chuyển sang connection mà đang giữ giá trị mặc định sqlite
                    // (vốn dành cho local-file) → đổi sang postgres.
                    if (t === 'connection' && dbType === 'sqlite') {
                      setDbType('postgres');
                    }
                  }}
                  className={`flex-1 py-2 text-xs cursor-pointer border-none rounded-lg transition-colors ${
                    type === t
                      ? 'bg-blue-600/15 text-blue-600 font-semibold'
                      : 'bg-input-background text-text-primary'
                  }`}
                >
                  {t === 'local-file' ? 'Local file' : 'Connection'}
                </button>
              ))}
            </div>
          </Field>

          {type === 'connection' && (
            <Field label="Database type">
              <Dropdown align="start" side="bottom" sideOffset={4}>
                <DropdownTrigger asChild>
                  <button
                    type="button"
                    className="w-full h-9 px-3 rounded text-sm flex items-center gap-2 text-left cursor-pointer"
                    style={inputStyle}
                  >
                    <DbTypeIcon type={dbType} />
                    {dbType}
                  </button>
                </DropdownTrigger>
                <DropdownContent>
                  {CONNECTION_DB_TYPES.map((t) => (
                    <DropdownItem
                      key={t}
                      icon={<DbTypeIcon type={t} />}
                      onClick={() => {
                        setDbType(t);
                        setTestOk(false);
                      }}
                    >
                      {t}
                    </DropdownItem>
                  ))}
                </DropdownContent>
              </Dropdown>
            </Field>
          )}

          {type === 'local-file' ? (
            <Field label="Database file path">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={filePath}
                  onChange={(e) => {
                    setFilePath(e.target.value);
                    setTestOk(false);
                  }}
                  placeholder="~/.elara/database.sqlite"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={pickFile}
                  title="Browse"
                  className="w-9 h-9 p-0 flex items-center justify-center cursor-pointer shrink-0 text-text-secondary hover:text-text-primary transition-colors"
                  style={{ ...inputStyle, width: '34px', padding: 0 }}
                >
                  <FolderOpen size={16} />
                </button>
              </div>
            </Field>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="flex-[2] min-w-0">
                  <Field label="Host">
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => {
                        setHost(e.target.value);
                        setTestOk(false);
                      }}
                      placeholder="localhost"
                      style={inputStyle}
                    />
                  </Field>
                </div>
                <div className="flex-1 min-w-0">
                  <Field label="Port">
                    <input
                      type="text"
                      value={port}
                      onChange={(e) => {
                        setPort(e.target.value);
                        setTestOk(false);
                      }}
                      placeholder="5432"
                      style={inputStyle}
                    />
                  </Field>
                </div>
              </div>

              <Field label="Database">
                <input
                  type="text"
                  value={databaseName}
                  onChange={(e) => {
                    setDatabaseName(e.target.value);
                    setTestOk(false);
                  }}
                  placeholder="mydb"
                  style={inputStyle}
                />
              </Field>

              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <Field label="Username">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setTestOk(false);
                      }}
                      style={inputStyle}
                    />
                  </Field>
                </div>
                <div className="flex-1 min-w-0">
                  <Field label="Password">
                    <PasswordInput
                      value={password}
                      onChange={(v) => {
                        setPassword(v);
                        setTestOk(false);
                      }}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <Field label="SSL Mode">
                    <Dropdown align="start" side="bottom" sideOffset={4}>
                      <DropdownTrigger asChild>
                        <button
                          type="button"
                          className="w-full h-9 px-3 rounded text-sm text-left cursor-pointer"
                          style={inputStyle}
                        >
                          {sslMode}
                        </button>
                      </DropdownTrigger>
                      <DropdownContent>
                        {SSL_MODES.map((m) => (
                          <DropdownItem
                            key={m}
                            onClick={() => {
                              setSslMode(m);
                              setTestOk(false);
                            }}
                          >
                            {m}
                          </DropdownItem>
                        ))}
                      </DropdownContent>
                    </Dropdown>
                  </Field>
                </div>
                <div className="flex-1 min-w-0">
                  <Field label="Channel Binding">
                    <Dropdown align="start" side="bottom" sideOffset={4}>
                      <DropdownTrigger asChild>
                        <button
                          type="button"
                          className="w-full h-9 px-3 rounded text-sm text-left cursor-pointer"
                          style={inputStyle}
                        >
                          {channelBinding}
                        </button>
                      </DropdownTrigger>
                      <DropdownContent>
                        {CHANNEL_BINDINGS.map((m) => (
                          <DropdownItem
                            key={m}
                            onClick={() => {
                              setChannelBinding(m);
                              setTestOk(false);
                            }}
                          >
                            {m}
                          </DropdownItem>
                        ))}
                      </DropdownContent>
                    </Dropdown>
                  </Field>
                </div>
              </div>

              {/* Test + result (chỉ áp dụng cho loại connection) */}
              <div className="flex flex-col gap-2">
                {testing && !testMessage && (
                  <div className="flex items-center gap-1.5 py-2 px-2.5 rounded-lg bg-gray-500/10 text-text-secondary text-xs">
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Testing connection… (this can take a few seconds)
                  </div>
                )}

                {!testing && testMessage && (
                  <div
                    role="status"
                    className={`flex items-start gap-2 py-2 px-2.5 rounded-lg text-xs leading-normal break-words ${
                      testOk ? 'bg-green-500/14 text-green-500' : 'bg-red-500/14 text-red-500'
                    }`}
                  >
                    {testOk ? (
                      <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                    ) : (
                      <XCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                    )}
                    <span className="min-w-0">
                      {testOk ? 'Connection succeeded — ' : 'Connection failed — '}
                      {testMessage}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {(isReservedName || isReservedFile) && (
            <div className="bg-red-500/8 rounded-lg py-2 px-2.5 text-xs text-red-500 flex items-center gap-1.5">
              <AlertCircle size={12} style={{ flexShrink: 0 }} />
              <span>
                {isReservedName
                  ? `"${name.trim()}" is reserved for the AIWeb2API fallback database. Please choose a different name.`
                  : `"aiweb2api.sqlite" is reserved for the AIWeb2API fallback database. Please choose a different file.`}
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/8 rounded-lg py-2 px-2.5 text-xs text-red-500 flex items-center gap-1.5">
              <AlertCircle size={12} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2 shrink-0">
          {type === 'connection' && (
            <button
              type="button"
              className="mr-auto py-2 px-1 text-xs font-semibold border-none bg-transparent text-text-primary cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={testConnection}
              disabled={testing || saving}
            >
              {testing && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
              {testing ? 'Testing…' : 'Test connection'}
            </button>
          )}
          <button
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="py-2 px-3.5 rounded-lg bg-gray-500/8 border-none text-text-secondary text-xs font-medium cursor-pointer whitespace-nowrap hover:bg-gray-500/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saveDisabled}
            title={
              !canSave
                ? type === 'local-file'
                  ? 'Database file must exist'
                  : 'Test connection must succeed first'
                : undefined
            }
            className={`py-2 px-3.5 rounded-lg bg-green-500/12 border-none text-green-500 text-xs font-semibold cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-opacity ${
              saveDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-500/20'
            }`}
          >
            {saving && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-slideUp { animation: slideUp 0.22s ease; }
        .animate-fadeIn { animation: fadeIn 0.15s ease; }
      `}</style>
    </>
  );
};

/**
 * Drawer tạo/sửa database manager. Body được mount mới mỗi lần mở
 * nên state form luôn khởi tạo lại từ `initial`.
 */
const DatabaseManagerDrawer: React.FC<DatabaseManagerDrawerProps> = ({
  open,
  initial,
  onOpenChange,
  onSaved,
}) => {
  if (!open) return null;
  return <DrawerBody initial={initial} onOpenChange={onOpenChange} onSaved={onSaved} />;
};

export default DatabaseManagerDrawer;
