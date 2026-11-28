import { FileSpreadsheet, FolderOpen } from 'lucide-react';
import type { Tone } from '../../../../../shared/types/ui.types';
import { RowStatus, RowFilter, Column, MethodMeta } from './import-profiles.types';

export const COLUMN_ORDER: Column[] = ['email', 'password', 'recoveryEmail', 'phone', 'totpSecret', 'backupCodes'];

export const ALIASES: Record<Column, string[]> = {
  email: ['email', 'mail', 'gmail', 'account', 'username', 'user', 'login'],
  password: ['password', 'pass', 'pwd'],
  recoveryEmail: ['recovery', 'recoveryemail', 'recoverymail', 'backupemail'],
  phone: ['phone', 'phonenumber', 'mobile', 'tel'],
  totpSecret: ['totp', 'totpsecret', '2fa', 'otp', 'secret', 'authenticator'],
  backupCodes: ['backupcodes', 'backupcode', 'backup', 'codes'],
  displayName: ['name', 'displayname', 'fullname'],
  group: ['group', 'category'],
};

export const METHODS: MethodMeta[] = [
  {
    id: 'folder',
    icon: FolderOpen,
    tone: 'primary',
    label: 'Folder',
    hint: 'A folder of profile folders, or one profile folder',
    card: 'bg-primary/10',
    dropTitle: 'Choose a folder',
    dropHint: 'Emails, folder names and Chrome sync state are read automatically',
    info: 'Accepts a folder that contains profile folders, or a profile folder itself. Folders not named after the email are renamed to the email.',
  },
  {
    id: 'file',
    icon: FileSpreadsheet,
    tone: 'info',
    label: 'File',
    hint: 'CSV / TSV, or a source backup with emails and service_emails',
    card: 'bg-info/10',
    dropTitle: 'Choose a file',
    dropHint: '.csv, .tsv, .txt, .sql, .db or .sqlite',
    info: 'CSV columns: email, password, recovery_email, phone, totp, backup_codes (header optional). A backup .sql file is scanned for its emails and service_emails tables.',
  },
];

export const FILTERS: { id: RowFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'duplicate', label: 'Duplicates' },
  { id: 'unsynced', label: 'Unsynced' },
  { id: 'invalid', label: 'Invalid' },
];

export const STATUS_TONE: Record<RowStatus, Tone> = { new: 'success', duplicate: 'warn', invalid: 'error' };

export const STATUS_LABEL: Record<RowStatus, string> = { new: 'New', duplicate: 'Duplicate', invalid: 'Invalid' };
