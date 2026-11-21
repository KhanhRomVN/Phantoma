import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';

/* ============================================================================
 * 2. COLORS — schema chính thức (không dùng màu ngoài schema, trừ alpha variant)
 * ========================================================================== */
const COLORS = {
  primary: 'rgb(139, 109, 255)',
  success: 'rgb(52, 211, 153)',
  error: 'rgb(244, 63, 94)',
  warn: 'rgb(251, 191, 36)',
  info: 'rgb(34, 211, 238)',

  background: 'rgb(7, 7, 13)',

  textPrimary: 'rgb(244, 244, 251)',
  textSecondary: 'rgb(154, 154, 184)',
  textForeground: 'rgb(255, 255, 255)',

  border: 'rgb(38, 38, 58)',

  cardBackground: 'rgb(15, 15, 26)',
  cardBackgroundHover: 'rgb(23, 23, 40)',

  inputBackground: 'rgb(15, 15, 26)',

  modalBackground: 'rgb(15, 15, 26)',

  dropdownBackground: 'rgb(17, 17, 29)',
  dropdownItemHover: 'rgb(26, 26, 45)',

  tooltipBackground: 'rgb(23, 23, 40)',

  panelBackground: 'rgb(10, 10, 18)',

  tableHeaderBackground: 'rgb(15, 15, 26)',
  tableFooterBackground: 'rgb(15, 15, 26)',
  tableRowHover: 'rgb(23, 23, 40)',
};

const C = COLORS;

/** Chuyển rgb(...) sang rgba(...) với alpha cho trước. */
const alpha = (rgb, a) => rgb.replace('rgb(', 'rgba(').replace(')', `, ${a})`);

/** Danh mục loại target — dùng chung cho tab, dropdown, badge. */
const TARGET_TYPES = [
  { value: 'binary', label: 'Binary', full: 'Tệp thực thi / Binary', icon: 'cpu' },
  { value: 'packed', label: 'Packed', full: 'Gói tệp đã nén / bảo vệ', icon: 'package' },
  { value: 'python', label: 'Python', full: 'Gói ứng dụng Python', icon: 'fileCode' },
  { value: 'mobile', label: 'Mobile', full: 'Gói ứng dụng di động', icon: 'smartphone' },
  { value: 'firmware', label: 'Firmware', full: 'Gói phần mềm thiết bị nhúng', icon: 'layers' },
];

const SECTION_KIND_LABEL = {
  header: 'Header',
  section: 'Section',
  segment: 'Segment',
  file: 'Tệp',
  folder: 'Thư mục',
};

/* ============================================================================
 * 3. MOCK DATA
 * ========================================================================== */

/* --- 3.1. PHIÊN & TARGET ------------------------------------------------- */
const mockSessions = [
  {
    id: 'S-118',
    name: 'RE-2024-118 · sample_app.apk',
    targetType: 'mobile',
    status: 'done',
    time: '2 giờ trước',
    targetCount: 3,
  },
  {
    id: 'S-117',
    name: 'RE-2024-117 · netd_daemon.elf',
    targetType: 'binary',
    status: 'done',
    time: '5 giờ trước',
    targetCount: 2,
  },
  {
    id: 'S-116',
    name: 'RE-2024-116 · bundle_v3.2.zip',
    targetType: 'packed',
    status: 'warn',
    time: 'Hôm qua 21:40',
    targetCount: 4,
  },
  {
    id: 'S-115',
    name: 'RE-2024-115 · gateway_fw.bin',
    targetType: 'firmware',
    status: 'done',
    time: 'Hôm qua 09:12',
    targetCount: 1,
  },
  {
    id: 'S-114',
    name: 'RE-2024-114 · analytics_pkg.pyz',
    targetType: 'python',
    status: 'done',
    time: '2 ngày trước',
    targetCount: 2,
  },
  {
    id: 'S-113',
    name: 'RE-2024-113 · client_helper.dll',
    targetType: 'binary',
    status: 'error',
    time: '2 ngày trước',
    targetCount: 1,
  },
  {
    id: 'S-112',
    name: 'RE-2024-112 · router_img.bin',
    targetType: 'firmware',
    status: 'processing',
    time: '3 ngày trước',
    targetCount: 1,
  },
  {
    id: 'S-111',
    name: 'RE-2024-111 · player_2.8.1.apk',
    targetType: 'mobile',
    status: 'done',
    time: '3 ngày trước',
    targetCount: 5,
  },
  {
    id: 'S-110',
    name: 'RE-2024-110 · updater.pkg',
    targetType: 'packed',
    status: 'done',
    time: '4 ngày trước',
    targetCount: 2,
  },
  {
    id: 'S-109',
    name: 'RE-2024-109 · ml_runner.pyz',
    targetType: 'python',
    status: 'warn',
    time: '5 ngày trước',
    targetCount: 1,
  },
  {
    id: 'S-108',
    name: 'RE-2024-108 · sensor_hub.elf',
    targetType: 'binary',
    status: 'done',
    time: '1 tuần trước',
    targetCount: 3,
  },
  {
    id: 'S-107',
    name: 'RE-2024-107 · telco_cpe_fw.bin',
    targetType: 'firmware',
    status: 'done',
    time: '1 tuần trước',
    targetCount: 2,
  },
];

const mockTargets = [
  {
    id: 'T-01',
    name: 'libnative.so',
    type: 'binary',
    size: '1.84 MB',
    uploadedAt: '12/06 09:12',
    status: 'ok',
  },
  {
    id: 'T-02',
    name: 'sample_app.apk',
    type: 'mobile',
    size: '24.6 MB',
    uploadedAt: '12/06 08:40',
    status: 'ok',
  },
  {
    id: 'T-03',
    name: 'gateway_fw.bin',
    type: 'firmware',
    size: '16.2 MB',
    uploadedAt: '11/06 21:05',
    status: 'ok',
  },
  {
    id: 'T-04',
    name: 'analytics_pkg.pyz',
    type: 'python',
    size: '3.10 MB',
    uploadedAt: '11/06 15:22',
    status: 'ok',
  },
  {
    id: 'T-05',
    name: 'bundle_v3.2.zip',
    type: 'packed',
    size: '42.8 MB',
    uploadedAt: '11/06 10:48',
    status: 'warn',
  },
  {
    id: 'T-06',
    name: 'client_helper.dll',
    type: 'binary',
    size: '892 KB',
    uploadedAt: '10/06 19:31',
    status: 'error',
  },
  {
    id: 'T-07',
    name: 'router_img.bin',
    type: 'firmware',
    size: '8.40 MB',
    uploadedAt: '10/06 14:09',
    status: 'processing',
  },
  {
    id: 'T-08',
    name: 'player_2.8.1.apk',
    type: 'mobile',
    size: '58.3 MB',
    uploadedAt: '09/06 11:55',
    status: 'ok',
  },
  {
    id: 'T-09',
    name: 'updater.pkg',
    type: 'packed',
    size: '12.7 MB',
    uploadedAt: '09/06 09:17',
    status: 'ok',
  },
  {
    id: 'T-10',
    name: 'ml_runner.pyz',
    type: 'python',
    size: '2.40 MB',
    uploadedAt: '08/06 16:44',
    status: 'warn',
  },
  {
    id: 'T-11',
    name: 'sensor_hub.elf',
    type: 'binary',
    size: '704 KB',
    uploadedAt: '08/06 10:02',
    status: 'ok',
  },
  {
    id: 'T-12',
    name: 'helper_module.ko',
    type: 'binary',
    size: '128 KB',
    uploadedAt: '07/06 20:18',
    status: 'ok',
  },
];

/* --- 3.2. BINARY VIEW ---------------------------------------------------- */
const mockBinaryTree = [
  {
    id: 'bt1',
    name: 'ELF64 Header',
    type: 'header',
    size: '0x40',
    children: [
      { id: 'bt1a', name: 'e_ident', type: 'segment', size: '0x10' },
      { id: 'bt1b', name: 'e_type / e_machine', type: 'segment', size: '0x04' },
      { id: 'bt1c', name: 'e_entry', type: 'segment', size: '0x08' },
      { id: 'bt1d', name: 'e_phoff / e_shoff', type: 'segment', size: '0x10' },
    ],
  },
  {
    id: 'bt2',
    name: 'Program Headers (13)',
    type: 'header',
    size: '0x1A0',
    children: [
      { id: 'bt2a', name: 'PT_PHDR', type: 'segment', size: '0x38' },
      { id: 'bt2b', name: 'PT_INTERP', type: 'segment', size: '0x38' },
      { id: 'bt2c', name: 'PT_LOAD (R-X)', type: 'segment', size: '0x38' },
      { id: 'bt2d', name: 'PT_LOAD (RW-)', type: 'segment', size: '0x38' },
      { id: 'bt2e', name: 'PT_DYNAMIC', type: 'segment', size: '0x38' },
      { id: 'bt2f', name: 'PT_GNU_STACK', type: 'segment', size: '0x38' },
    ],
  },
  { id: 'bt3', name: '.text', type: 'section', size: '0x2A4F0', badge: 'exec' },
  { id: 'bt4', name: '.rodata', type: 'section', size: '0x84C10' },
  { id: 'bt5', name: '.data', type: 'section', size: '0x12A00' },
  {
    id: 'bt6',
    name: '.dynamic',
    type: 'section',
    size: '0x1F0',
    children: [
      { id: 'bt6a', name: 'DT_NEEDED · libc.so.6', type: 'segment', size: '0x08' },
      { id: 'bt6b', name: 'DT_NEEDED · libm.so.6', type: 'segment', size: '0x08' },
      { id: 'bt6c', name: 'DT_SONAME · libnative.so', type: 'segment', size: '0x08' },
    ],
  },
  { id: 'bt7', name: '.symtab', type: 'section', size: '0x9C40' },
  { id: 'bt8', name: '.strtab', type: 'section', size: '0x4E20' },
  { id: 'bt9', name: '.note.gnu.build-id', type: 'section', size: '0x24' },
  { id: 'bt10', name: '.eh_frame_hdr', type: 'section', size: '0x1C4C' },
];

const mockDisassembly = [
  {
    id: 'd1',
    address: '0x00401000',
    bytes: '55',
    opcode: 'push',
    operand: 'rbp',
    comment: '; prologue',
  },
  {
    id: 'd2',
    address: '0x00401001',
    bytes: '48 89 e5',
    opcode: 'mov',
    operand: 'rbp, rsp',
    comment: '',
  },
  {
    id: 'd3',
    address: '0x00401004',
    bytes: '48 83 ec 20',
    opcode: 'sub',
    operand: 'rsp, 0x20',
    comment: '; stack frame',
  },
  {
    id: 'd4',
    address: '0x00401008',
    bytes: '48 89 7d f8',
    opcode: 'mov',
    operand: '[rbp-0x8], rdi',
    comment: '',
  },
  {
    id: 'd5',
    address: '0x0040100C',
    bytes: '48 8b 45 f8',
    opcode: 'mov',
    operand: 'rax, [rbp-0x8]',
    comment: '',
  },
  {
    id: 'd6',
    address: '0x00401010',
    bytes: '48 83 f8 00',
    opcode: 'cmp',
    operand: 'rax, 0x0',
    comment: '; kiểm tra null',
  },
  {
    id: 'd7',
    address: '0x00401014',
    bytes: '74 12',
    opcode: 'je',
    operand: '0x00401028',
    comment: '',
  },
  {
    id: 'd8',
    address: '0x00401016',
    bytes: '48 8b 45 f8',
    opcode: 'mov',
    operand: 'rax, [rbp-0x8]',
    comment: '',
  },
  {
    id: 'd9',
    address: '0x0040101A',
    bytes: '48 8b 00',
    opcode: 'mov',
    operand: 'rax, [rax]',
    comment: '',
  },
  {
    id: 'd10',
    address: '0x0040101D',
    bytes: '48 89 45 f0',
    opcode: 'mov',
    operand: '[rbp-0x10], rax',
    comment: '',
  },
  {
    id: 'd11',
    address: '0x00401021',
    bytes: 'e8 1a 00 00 00',
    opcode: 'call',
    operand: '0x00401040',
    comment: '; helper_compute',
  },
  {
    id: 'd12',
    address: '0x00401026',
    bytes: 'eb 05',
    opcode: 'jmp',
    operand: '0x0040102D',
    comment: '',
  },
  {
    id: 'd13',
    address: '0x00401028',
    bytes: 'b8 00 00 00 00',
    opcode: 'mov',
    operand: 'eax, 0x0',
    comment: '',
  },
  {
    id: 'd14',
    address: '0x0040102D',
    bytes: '48 8b 45 f0',
    opcode: 'mov',
    operand: 'rax, [rbp-0x10]',
    comment: '',
  },
  {
    id: 'd15',
    address: '0x00401031',
    bytes: '48 83 c0 01',
    opcode: 'add',
    operand: 'rax, 0x1',
    comment: '',
  },
  {
    id: 'd16',
    address: '0x00401035',
    bytes: '48 89 45 e8',
    opcode: 'mov',
    operand: '[rbp-0x18], rax',
    comment: '',
  },
  { id: 'd17', address: '0x00401039', bytes: 'c9', opcode: 'leave', operand: '', comment: '' },
  {
    id: 'd18',
    address: '0x0040103A',
    bytes: 'c3',
    opcode: 'ret',
    operand: '',
    comment: '; return',
  },
  {
    id: 'd19',
    address: '0x00401040',
    bytes: 'f3 0f 1e fa',
    opcode: 'endbr64',
    operand: '',
    comment: '; CFI marker',
  },
  {
    id: 'd20',
    address: '0x00401044',
    bytes: '66 0f ef c0',
    opcode: 'pxor',
    operand: 'xmm0, xmm0',
    comment: '',
  },
  {
    id: 'd21',
    address: '0x00401048',
    bytes: 'f2 0f 10 05',
    opcode: 'movsd',
    operand: 'xmm0, [rip+0x2F10]',
    comment: '; hằng số float',
  },
  { id: 'd22', address: '0x00401050', bytes: 'c3', opcode: 'ret', operand: '', comment: '' },
];

/** 32 dòng hex, dòng đầu là ELF magic thật để trông chân thực. */
const mockHexRows = (() => {
  const ELF_FIRST = [
    '7f',
    '45',
    '4c',
    '46',
    '02',
    '01',
    '01',
    '00',
    '00',
    '00',
    '00',
    '00',
    '00',
    '00',
    '00',
    '00',
  ];
  const toAscii = (bytes) =>
    bytes
      .map((h) => {
        const n = parseInt(h, 16);
        return n >= 32 && n < 127 ? String.fromCharCode(n) : '.';
      })
      .join('');
  const rows = [];
  for (let i = 0; i < 32; i += 1) {
    const bytes = [];
    for (let j = 0; j < 16; j += 1) {
      const v = (i * 37 + j * 13 + 0x40) & 0xff;
      bytes.push(v.toString(16).padStart(2, '0'));
    }
    const finalBytes = i === 0 ? ELF_FIRST : bytes;
    rows.push({
      id: `h${i}`,
      offset: `0x${(0x1000 + i * 16).toString(16).padStart(8, '0')}`,
      bytes: finalBytes,
      ascii: toAscii(finalBytes),
    });
  }
  return rows;
})();

const mockStrings = [
  { id: 's1', offset: '0x00001240', type: 'ascii', length: 18, value: '/usr/lib/libc.so.6' },
  { id: 's2', offset: '0x00001298', type: 'ascii', length: 18, value: '/usr/lib/libm.so.6' },
  { id: 's3', offset: '0x00001310', type: 'ascii', length: 24, value: 'libnative.so.1.4.2' },
  { id: 's4', offset: '0x00001400', type: 'unicode', length: 32, value: 'Không thể mở cấu hình' },
  { id: 's5', offset: '0x0000149C', type: 'ascii', length: 21, value: 'configuration loaded' },
  { id: 's6', offset: '0x00001520', type: 'ascii', length: 14, value: '%s:%d:%s\n' },
  { id: 's7', offset: '0x000015B0', type: 'ascii', length: 27, value: 'sample_app:invalid header' },
  { id: 's8', offset: '0x00001648', type: 'ascii', length: 12, value: 'build-2024.1' },
  {
    id: 's9',
    offset: '0x000016C0',
    type: 'unicode',
    length: 40,
    value: 'Đang khởi tạo bộ phân tích',
  },
  {
    id: 's10',
    offset: '0x00001760',
    type: 'ascii',
    length: 33,
    value: 'https://example.org/docs/format',
  },
  { id: 's11', offset: '0x00001800', type: 'ascii', length: 16, value: 'GLIBC_2.34' },
  { id: 's12', offset: '0x00001860', type: 'ascii', length: 22, value: 'entropy threshold hit' },
  { id: 's13', offset: '0x00001910', type: 'ascii', length: 9, value: 'v1.4.2' },
  { id: 's14', offset: '0x00001988', type: 'unicode', length: 28, value: 'Tệp không hợp lệ' },
  { id: 's15', offset: '0x00001A20', type: 'ascii', length: 19, value: '/etc/sample.conf' },
  { id: 's16', offset: '0x00001AB0', type: 'ascii', length: 25, value: 'cache directory ready' },
  { id: 's17', offset: '0x00001B40', type: 'ascii', length: 11, value: '0123456789' },
  {
    id: 's18',
    offset: '0x00001BD0',
    type: 'ascii',
    length: 30,
    value: 'analyzer worker started ok',
  },
  {
    id: 's19',
    offset: '0x00001C60',
    type: 'unicode',
    length: 36,
    value: 'Hoàn tất phân tích tĩnh',
  },
  { id: 's20', offset: '0x00001D10', type: 'ascii', length: 15, value: 'struct section' },
  { id: 's21', offset: '0x00001DA0', type: 'ascii', length: 20, value: 'metadata descriptor' },
  { id: 's22', offset: '0x00001E30', type: 'ascii', length: 17, value: 'report generated' },
];

const mockImports = [
  { id: 'i1', library: 'libc.so.6', function: 'malloc' },
  { id: 'i2', library: 'libc.so.6', function: 'free' },
  { id: 'i3', library: 'libc.so.6', function: 'memcpy' },
  { id: 'i4', library: 'libc.so.6', function: 'strlen' },
  { id: 'i5', library: 'libc.so.6', function: 'fopen' },
  { id: 'i6', library: 'libc.so.6', function: 'fclose' },
  { id: 'i7', library: 'libc.so.6', function: 'snprintf' },
  { id: 'i8', library: 'libm.so.6', function: 'sqrt' },
  { id: 'i9', library: 'libm.so.6', function: 'pow' },
  { id: 'i10', library: 'libm.so.6', function: 'log10' },
  { id: 'i11', library: 'libpthread.so.0', function: 'pthread_create' },
  { id: 'i12', library: 'libpthread.so.0', function: 'pthread_join' },
  { id: 'i13', library: 'libdl.so.2', function: 'dlopen' },
  { id: 'i14', library: 'libdl.so.2', function: 'dlsym' },
  { id: 'i15', library: 'libz.so.1', function: 'inflate' },
  { id: 'i16', library: 'libz.so.1', function: 'deflate' },
];

const mockExports = [
  { id: 'e1', name: 'analyzer_init', address: '0x00401120', type: 'FUNC' },
  { id: 'e2', name: 'analyzer_run', address: '0x00401280', type: 'FUNC' },
  { id: 'e3', name: 'analyzer_free', address: '0x00401400', type: 'FUNC' },
  { id: 'e4', name: 'analyzer_version', address: '0x00402000', type: 'OBJECT' },
  { id: 'e5', name: 'section_walk', address: '0x00401520', type: 'FUNC' },
  { id: 'e6', name: 'section_lookup', address: '0x004016a0', type: 'FUNC' },
  { id: 'e7', name: 'entropy_sample', address: '0x00401790', type: 'FUNC' },
  { id: 'e8', name: 'entropy_threshold', address: '0x00401840', type: 'FUNC' },
  { id: 'e9', name: 'metadata_dump', address: '0x00401900', type: 'FUNC' },
  { id: 'e10', name: 'metadata_clear', address: '0x004019c0', type: 'FUNC' },
  { id: 'e11', name: 'report_render', address: '0x00401b00', type: 'FUNC' },
  { id: 'e12', name: 'report_export_json', address: '0x00401c60', type: 'FUNC' },
  { id: 'e13', name: 'helper_compute', address: '0x00401040', type: 'FUNC' },
  { id: 'e14', name: 'helper_normalize', address: '0x00401d20', type: 'FUNC' },
  { id: 'e15', name: 'g_config_defaults', address: '0x00601000', type: 'OBJECT' },
  { id: 'e16', name: 'g_cache_entries', address: '0x00601100', type: 'OBJECT' },
];

const mockBinaryMetadata = [
  { id: 'm1', k: 'Định dạng', v: 'ELF64', tone: 'info' },
  { id: 'm2', k: 'Kiến trúc', v: 'x86-64' },
  { id: 'm3', k: 'Endianness', v: 'Little endian' },
  { id: 'm4', k: 'Entry point', v: '0x00401000', mono: true },
  { id: 'm5', k: 'Base address', v: '0x00400000', mono: true },
  { id: 'm6', k: 'Kích thước', v: '1.84 MB (1,929,216 bytes)' },
  { id: 'm7', k: 'Số section', v: '32' },
  { id: 'm8', k: 'Số segment', v: '13' },
  { id: 'm9', k: 'Stripped', v: 'Không', tone: 'success' },
  { id: 'm10', k: 'PIE / NX', v: 'Bật / Bật', tone: 'success' },
  { id: 'm11', k: 'Interpreter', v: '/lib64/ld-linux-x86-64.so.2', mono: true },
  { id: 'm12', k: 'Build ID', v: 'a91f7c02e4', mono: true },
];

const mockEntropyData = Array.from({ length: 56 }, (_, i) => {
  const base = 3.2 + Math.sin(i / 3.1) * 0.7 + Math.cos(i / 1.7) * 0.35;
  const spike = i > 33 && i < 44 ? 2.6 : 0;
  return Math.min(8, Math.max(0.4, Number((base + spike).toFixed(2))));
});

/* --- 3.3. PACKED VIEW ---------------------------------------------------- */
const mockPackerInfo = [
  { id: 'p1',  k: 'Tên packer',          v: 'GenericProtector',         tone: 'warn' },
  { id: 'p2',  k: 'Phiên bản',           v: '2.4.1' },
  { id: 'p3',  k: 'Thuật toán nén',      v: 'deflate (level 9)' },
  { id: 'p4',  k: 'Lớp bảo vệ',          v: '2 lớp (nén + obfuscation)' },
  { id: 'p5',  k: 'Entropy trung bình',  v: '7.42 / 8.00',              tone: 'warn' },
  { id: 'p6',  k: 'Tỉ lệ nén',           v: '68.4%' },
  { id: 'p7',  k: 'Kích thước gốc',      v: '31.6 MB' },
  { id: 'p8',  k: 'Kích thước sau nén',  v: '13.9 MB' },
  { id: 'p9',  k: 'Signature hash',      v: 'sha256:3f9a4c…b218',       mono: true },
  { id: 'p10', k: 'Overlay',             v: 'Có (0x000A4000 – 0x00C1F000)', mono: true, tone: 'warn' },
];

const mockWarnings = [
  { id: 'w1', severity: 'error', message: 'Vùng overlay ngoài bảng section chuẩn',       location: '0x000A4000' },
  { id: 'w2', severity: 'error', message: 'Section header bị ghi đè sau khi nén',        location: '0x0000012C' },
  { id: 'w3', severity: 'warn',  message: 'Entropy vượt ngưỡng 7.5 tại 6 vùng liên tiếp', location: '0x000A1000' },
  { id: 'w4', severity: 'warn',  message: 'Import table chỉ còn 3 mục — bất thường',      location: '0x00042018' },
  { id: 'w5', severity: 'warn',  message: 'Entry point trỏ vào vùng giải nén động',       location: '0x000A5000' },
  { id: 'w6', severity: 'info',  message: 'Phát hiện 2 lớp nén lồng nhau',                location: '0x000A4000' },
  { id: 'w7', severity: 'info',  message: 'Bảng tài nguyên được mã hoá nhẹ (XOR 0x5A)',   location: '0x000C0000' },
  { id: 'w8', severity: 'warn',  message: 'Timestamp build không đồng nhất với header',   location: '0x00000088' },
  { id: 'w9', severity: 'info',  message: 'Có thể giải nén tĩnh — không cần chạy mẫu',    location: '—' },
];

const mockPackedBefore = {
  title: 'Trước giải nén (packed)',
  rows: [
    { k: 'Kích thước', v: '13.9 MB' },
    { k: 'Số section', v: '5' },
    { k: 'Entropy TB', v: '7.42' },
    { k: 'Imports',    v: '3' },
    { k: 'Exports',    v: '0' },
    { k: 'Symbols',    v: '0 (stripped)' },
  ],
  diff: [{ label: 'entropy', tone: 'error', text: '+2.31' }],
};

const mockPackedAfter = {
  title: 'Sau giải nén (unpacked)',
  rows: [
    { k: 'Kích thước', v: '31.6 MB' },
    { k: 'Số section', v: '32' },
    { k: 'Entropy TB', v: '5.11' },
    { k: 'Imports',    v: '48' },
    { k: 'Exports',    v: '16' },
    { k: 'Symbols',    v: '1,284' },
  ],
  diff: [{ label: 'section', tone: 'success', text: '+27' }],
};

const mockUnpackedTree = [
  {
    id: 'u0', name: 'bundle_v3.2/', type: 'folder',
    children: [
      {
        id: 'u1', name: 'app/', type: 'folder',
        children: [
          { id: 'u1a', name: 'main.elf',    type: 'file', size: '4.2 MB' },
          { id: 'u1b', name: 'helper.so',   type: 'file', size: '1.1 MB' },
          { id: 'u1c', name: 'config.json', type: 'file', size: '12 KB' },
        ],
      },
      {
        id: 'u2', name: 'lib/', type: 'folder',
        children: [
          { id: 'u2a', name: 'libcore.so',  type: 'file', size: '6.8 MB' },
          { id: 'u2b', name: 'libcodec.so', type: 'file', size: '2.4 MB' },
          { id: 'u2c', name: 'libz.so.1',   type: 'file', size: '104 KB' },
        ],
      },
      { id: 'u3', name: 'assets/pack.bin',        type: 'file', size: '9.7 MB' },
      { id: 'u4', name: 'META-INF/manifest.txt',  type: 'file', size: '3 KB' },
      { id: 'u5', name: 'LICENSE.txt',            type: 'file', size: '11 KB' },
      { id: 'u6', name: 'version.properties',     type: 'file', size: '1 KB' },
    ],
  },
];

/* --- 3.4. PYTHON VIEW ---------------------------------------------------- */
const mockPythonTree = [
  {
    id: 'py0', name: 'analytics_pkg/', type: 'folder',
    children: [
      { id: 'py1', name: '__init__.py', type: 'py',  size: '1.2 KB' },
      { id: 'py2', name: 'main.py',     type: 'py',  size: '6.4 KB' },
      { id: 'py3', name: 'report.py',   type: 'py',  size: '9.1 KB' },
      { id: 'py4', name: 'stats.py',    type: 'py',  size: '4.8 KB' },
      {
        id: 'py5', name: 'vendor/', type: 'folder',
        children: [
          { id: 'py5a', name: 'helpers.py',                    type: 'py',  size: '3.3 KB' },
          { id: 'py5b', name: 'helpers.pyc',                   type: 'pyc', size: '11 KB' },
          { id: 'py5c', name: 'accel.cpython-311.so',          type: 'so',  size: '512 KB' },
        ],
      },
      {
        id: 'py6', name: '__pycache__/', type: 'folder',
        children: [
          { id: 'py6a', name: 'main.cpython-311.pyc',   type: 'pyc', size: '8.2 KB' },
          { id: 'py6b', name: 'report.cpython-311.pyc', type: 'pyc', size: '14 KB' },
        ],
      },
      { id: 'py7', name: 'requirements.txt', type: 'txt',  size: '284 B' },
      { id: 'py8', name: 'metadata.json',    type: 'json', size: '1.9 KB' },
      { id: 'py9', name: 'dist-info/RECORD', type: 'txt',  size: '2.1 KB' },
    ],
  },
];

const mockPythonSource = [
  '"""Sample analytics package — minh hoạ cấu trúc tĩnh."""',
  '',
  'import math',
  'from dataclasses import dataclass',
  '',
  '',
  '@dataclass',
  'class Sample:',
  '    name: str',
  '    weight: float',
  '',
  '',
  'def mean(values):',
  '    """Trung bình cộng của danh sách."""',
  '    if not values:',
  '        return 0.0',
  '    return sum(values) / len(values)',
  '',
  '',
  'def spread(values):',
  '    """Độ lệch chuẩn đơn giản."""',
  '    avg = mean(values)',
  '    var = sum((v - avg) ** 2 for v in values) / max(len(values), 1)',
  '    return math.sqrt(var)',
  '',
  '',
  'class Report:',
  '    def __init__(self, title):',
  '        self.title = title',
  '        self.rows = []',
  '',
  '    def add(self, row):',
  '        self.rows.append(row)',
  '        return self',
  '',
  '    def summary(self):',
  '        return {"title": self.title, "count": len(self.rows)}',
  '',
  '',
  'def main():',
  '    report = Report("demo")',
  '    report.add(Sample("alpha", 1.5)).add(Sample("beta", 2.5))',
  '    print(report.summary())',
  '    print(mean([1, 2, 3, 4]))',
  '',
  '',
  'if __name__ == "__main__":',
  '    main()',
];

const mockPythonBytecode = [
  { id: 'b1',  offset: '0x0000', opname: 'RESUME',         arg: '0' },
  { id: 'b2',  offset: '0x0002', opname: 'LOAD_CONST',     arg: '0 ("""Sample…""")' },
  { id: 'b3',  offset: '0x0004', opname: 'STORE_NAME',     arg: '0 (__doc__)' },
  { id: 'b4',  offset: '0x0006', opname: 'LOAD_CONST',     arg: '1 (0)' },
  { id: 'b5',  offset: '0x0008', opname: 'LOAD_CONST',     arg: '2 (None)' },
  { id: 'b6',  offset: '0x000A', opname: 'IMPORT_NAME',    arg: '0 (math)' },
  { id: 'b7',  offset: '0x000C', opname: 'STORE_NAME',     arg: '1 (math)' },
  { id: 'b8',  offset: '0x000E', opname: 'IMPORT_NAME',    arg: '1 (dataclasses)' },
  { id: 'b9',  offset: '0x0010', opname: 'IMPORT_FROM',    arg: '1 (dataclass)' },
  { id: 'b10', offset: '0x0012', opname: 'STORE_NAME',     arg: '2 (dataclass)' },
  { id: 'b11', offset: '0x0014', opname: 'PUSH_NULL',      arg: '' },
  { id: 'b12', offset: '0x0016', opname: 'LOAD_NAME',      arg: '3 (dataclass)' },
  { id: 'b13', offset: '0x0018', opname: 'PRECALL',        arg: '0' },
  { id: 'b14', offset: '0x001A', opname: 'CALL',           arg: '0' },
  { id: 'b15', offset: '0x001C', opname: 'STORE_NAME',     arg: '4 (Sample)' },
  { id: 'b16', offset: '0x001E', opname: 'LOAD_CONST',     arg: '3 (<code mean>)' },
  { id: 'b17', offset: '0x0020', opname: 'MAKE_FUNCTION',  arg: '0' },
  { id: 'b18', offset: '0x0022', opname: 'STORE_NAME',     arg: '5 (mean)' },
  { id: 'b19', offset: '0x0024', opname: 'LOAD_CONST',     arg: '4 (<code spread>)' },
  { id: 'b20', offset: '0x0026', opname: 'MAKE_FUNCTION',  arg: '0' },
  { id: 'b21', offset: '0x0028', opname: 'STORE_NAME',     arg: '6 (spread)' },
  { id: 'b22', offset: '0x002A', opname: 'LOAD_BUILD_CLASS', arg: '' },
  { id: 'b23', offset: '0x002C', opname: 'STORE_NAME',     arg: '7 (Report)' },
  { id: 'b24', offset: '0x002E', opname: 'RETURN_VALUE',   arg: '' },
];

const mockDependencies = [
  { id: 'dp1',  name: 'numpy',    version: '1.26.4', license: 'BSD-3' },
  { id: 'dp2',  name: 'pandas',   version: '2.2.1',  license: 'BSD-3' },
  { id: 'dp3',  name: 'scipy',    version: '1.12.0', license: 'BSD-3' },
  { id: 'dp4',  name: 'requests', version: '2.31.0', license: 'Apache-2.0' },
  { id: 'dp5',  name: 'click',    version: '8.1.7',  license: 'BSD-3' },
  { id: 'dp6',  name: 'pyyaml',   version: '6.0.1',  license: 'MIT' },
  { id: 'dp7',  name: 'rich',     version: '13.7.1', license: 'MIT' },
  { id: 'dp8',  name: 'orjson',   version: '3.9.15', license: 'Apache-2.0' },
  { id: 'dp9',  name: 'pydantic', version: '2.6.3',  license: 'MIT' },
  { id: 'dp10', name: 'dateutil', version: '2.9.0',  license: 'Apache-2.0' },
  { id: 'dp11', name: 'tabulate', version: '0.9.0',  license: 'MIT' },
  { id: 'dp12', name: 'six',      version: '1.16.0', license: 'MIT' },
];

const mockPythonMetadata = [
  { id: 'pm1',  k: 'Tên gói',         v: 'analytics-pkg' },
  { id: 'pm2',  k: 'Phiên bản',       v: '1.4.2',                    tone: 'info' },
  { id: 'pm3',  k: 'Python yêu cầu',  v: '>=3.11,<3.13' },
  { id: 'pm4',  k: 'Bytecode magic',  v: '0x0A0D0D6F',               mono: true },
  { id: 'pm5',  k: 'Số module',       v: '9' },
  { id: 'pm6',  k: 'Native ext.',     v: '1 (accel.cpython-311.so)' },
  { id: 'pm7',  k: 'Entry point',     v: 'analytics_pkg.main:main',   mono: true },
  { id: 'pm8',  k: 'Kích thước',      v: '3.10 MB' },
  { id: 'pm9',  k: 'Đóng gói',        v: 'zipapp (.pyz)' },
  { id: 'pm10', k: 'Chữ ký số',       v: 'Không có',                 tone: 'warn' },
];

/* --- 3.5. MOBILE VIEW ---------------------------------------------------- */
const mockMobileTree = [
  {
    id: 'mb0', name: 'sample_app.apk', type: 'folder',
    children: [
      { id: 'mb1', name: 'AndroidManifest.xml', type: 'file', size: '18 KB' },
      { id: 'mb2', name: 'classes.dex',         type: 'file', size: '6.2 MB' },
      { id: 'mb3', name: 'classes2.dex',        type: 'file', size: '3.4 MB' },
      {
        id: 'mb4', name: 'lib/', type: 'folder',
        children: [
          { id: 'mb4a', name: 'arm64-v8a/libnative.so',   type: 'so', size: '1.8 MB' },
          { id: 'mb4b', name: 'armeabi-v7a/libnative.so', type: 'so', size: '1.4 MB' },
          { id: 'mb4c', name: 'x86_64/libnative.so',      type: 'so', size: '1.9 MB' },
        ],
      },
      {
        id: 'mb5', name: 'res/', type: 'folder',
        children: [
          { id: 'mb5a', name: 'layout/main_activity.xml', type: 'file', size: '6 KB' },
          { id: 'mb5b', name: 'drawable/ic_logo.png',     type: 'file', size: '24 KB' },
          { id: 'mb5c', name: 'values/strings.xml',       type: 'file', size: '12 KB' },
        ],
      },
      {
        id: 'mb6', name: 'assets/', type: 'folder',
        children: [
          { id: 'mb6a', name: 'config.json',      type: 'json', size: '3 KB' },
          { id: 'mb6b', name: 'models/tiny.tflite', type: 'file', size: '2.1 MB' },
        ],
      },
      { id: 'mb7', name: 'META-INF/CERT.RSA', type: 'file', size: '1 KB' },
      { id: 'mb8', name: 'resources.arsc',    type: 'file', size: '412 KB' },
    ],
  },
];

const mockManifest = {
  package: 'org.example.sampleapp',
  versionName: '2.8.1',
  versionCode: 2810,
  minSdkVersion: 24,
  targetSdkVersion: 34,
  compileSdkVersion: 34,
  application: {
    label: 'Sample App',
    debuggable: false,
    allowBackup: true,
    usesCleartextTraffic: false,
    activities: ['MainActivity', 'SettingsActivity', 'AboutActivity'],
  },
  signature: { scheme: 'v2+v3', algorithm: 'SHA256withRSA' },
};

const mockResources = [
  { id: 'r1',  name: 'ic_logo.png',           type: 'drawable', size: '24 KB' },
  { id: 'r2',  name: 'main_activity.xml',     type: 'layout',   size: '6 KB' },
  { id: 'r3',  name: 'strings.xml',           type: 'values',   size: '12 KB' },
  { id: 'r4',  name: 'colors.xml',            type: 'values',   size: '2 KB' },
  { id: 'r5',  name: 'bg_gradient.xml',       type: 'drawable', size: '1 KB' },
  { id: 'r6',  name: 'splash.png',            type: 'drawable', size: '88 KB' },
  { id: 'r7',  name: 'settings_activity.xml', type: 'layout',   size: '8 KB' },
  { id: 'r8',  name: 'ic_launcher.webp',      type: 'mipmap',   size: '14 KB' },
  { id: 'r9',  name: 'styles.xml',            type: 'values',   size: '5 KB' },
  { id: 'r10', name: 'menu_main.xml',         type: 'menu',     size: '2 KB' },
  { id: 'r11', name: 'raw_help.html',         type: 'raw',      size: '32 KB' },
  { id: 'r12', name: 'anim_slide.xml',        type: 'anim',     size: '1 KB' },
  { id: 'r13', name: 'dimens.xml',            type: 'values',   size: '3 KB' },
  { id: 'r14', name: 'icon_notify.png',       type: 'drawable', size: '6 KB' },
  { id: 'r15', name: 'themes.xml',            type: 'values',   size: '7 KB' },
  { id: 'r16', name: 'font_regular.ttf',      type: 'font',     size: '142 KB' },
];

const mockNativeLibs = [
  { id: 'n1',  name: 'libnative.so', arch: 'arm64-v8a',   size: '1.84 MB', stripped: 'Có' },
  { id: 'n2',  name: 'libnative.so', arch: 'armeabi-v7a', size: '1.42 MB', stripped: 'Có' },
  { id: 'n3',  name: 'libnative.so', arch: 'x86_64',      size: '1.91 MB', stripped: 'Có' },
  { id: 'n4',  name: 'libcodec.so',  arch: 'arm64-v8a',   size: '742 KB',  stripped: 'Không' },
  { id: 'n5',  name: 'libcodec.so',  arch: 'armeabi-v7a', size: '618 KB',  stripped: 'Không' },
  { id: 'n6',  name: 'libcrypto.so', arch: 'arm64-v8a',   size: '2.60 MB', stripped: 'Có' },
  { id: 'n7',  name: 'libssl.so',    arch: 'arm64-v8a',   size: '512 KB',  stripped: 'Có' },
  { id: 'n8',  name: 'libsqlite.so', arch: 'arm64-v8a',   size: '1.12 MB', stripped: 'Có' },
  { id: 'n9',  name: 'libml.so',     arch: 'arm64-v8a',   size: '3.84 MB', stripped: 'Không' },
  { id: 'n10', name: 'libml.so',     arch: 'x86_64',      size: '3.92 MB', stripped: 'Không' },
  { id: 'n11', name: 'liblog.so',    arch: 'arm64-v8a',   size: '24 KB',   stripped: 'Có' },
];

const mockPermissions = [
  { id: 'perm1',  name: 'android.permission.INTERNET',                 level: 'normal' },
  { id: 'perm2',  name: 'android.permission.ACCESS_NETWORK_STATE',     level: 'normal' },
  { id: 'perm3',  name: 'android.permission.CAMERA',                   level: 'warn' },
  { id: 'perm4',  name: 'android.permission.READ_EXTERNAL_STORAGE',    level: 'warn' },
  { id: 'perm5',  name: 'android.permission.WRITE_EXTERNAL_STORAGE',   level: 'warn' },
  { id: 'perm6',  name: 'android.permission.RECORD_AUDIO',             level: 'danger' },
  { id: 'perm7',  name: 'android.permission.ACCESS_FINE_LOCATION',     level: 'danger' },
  { id: 'perm8',  name: 'android.permission.POST_NOTIFICATIONS',       level: 'normal' },
  { id: 'perm9',  name: 'android.permission.WAKE_LOCK',                level: 'normal' },
  { id: 'perm10', name: 'android.permission.VIBRATE',                  level: 'normal' },
  { id: 'perm11', name: 'android.permission.RECEIVE_BOOT_COMPLETED',   level: 'warn' },
  { id: 'perm12', name: 'android.permission.READ_CONTACTS',            level: 'danger' },
  { id: 'perm13', name: 'android.permission.READ_PHONE_STATE',         level: 'warn' },
  { id: 'perm14', name: 'com.google.android.c2dm.permission.RECEIVE',  level: 'normal' },
  { id: 'perm15', name: 'android.permission.BLUETOOTH_CONNECT',        level: 'warn' },
  { id: 'perm16', name: 'android.permission.QUERY_ALL_PACKAGES',       level: 'danger' },
];

/* --- 3.6. FIRMWARE VIEW -------------------------------------------------- */
const mockFirmwareTree = [
  {
    id: 'fw0', name: 'rootfs/', type: 'folder',
    children: [
      {
        id: 'fw1', name: 'bin/', type: 'folder',
        children: [
          { id: 'fw1a', name: 'busybox', type: 'file', size: '1.1 MB' },
          { id: 'fw1b', name: 'init',    type: 'file', size: '42 KB' },
          { id: 'fw1c', name: 'agentd',  type: 'file', size: '184 KB' },
        ],
      },
      {
        id: 'fw2', name: 'etc/', type: 'folder',
        children: [
          { id: 'fw2a', name: 'config/network.conf', type: 'file', size: '3 KB' },
          { id: 'fw2b', name: 'init.d/rcS',          type: 'file', size: '1 KB' },
          { id: 'fw2c', name: 'passwd',              type: 'file', size: '2 KB' },
        ],
      },
      {
        id: 'fw3', name: 'lib/', type: 'folder',
        children: [
          { id: 'fw3a', name: 'libc.so.0',     type: 'so', size: '512 KB' },
          { id: 'fw3b', name: 'libmbedtls.so', type: 'so', size: '748 KB' },
        ],
      },
      { id: 'fw4', name: 'www/index.html',       type: 'file', size: '18 KB' },
      { id: 'fw5', name: 'www/static/app.js',    type: 'file', size: '96 KB' },
      { id: 'fw6', name: 'usr/sbin/telnetd',     type: 'file', size: '34 KB' },
      { id: 'fw7', name: 'var/log/messages',     type: 'file', size: '12 KB' },
    ],
  },
];

const mockPartitions = [
  { id: 'pt1',  name: 'bootloader', offset: '0x00000000', size: '0x00080000', type: 'raw',      flags: 'RO' },
  { id: 'pt2',  name: 'env',        offset: '0x00080000', size: '0x00020000', type: 'raw',      flags: 'RW' },
  { id: 'pt3',  name: 'kernel',     offset: '0x000A0000', size: '0x00400000', type: 'zImage',   flags: 'RO' },
  { id: 'pt4',  name: 'dtb',        offset: '0x004A0000', size: '0x00080000', type: 'dtb',      flags: 'RO' },
  { id: 'pt5',  name: 'rootfs',     offset: '0x00520000', size: '0x00A00000', type: 'squashfs', flags: 'RO' },
  { id: 'pt6',  name: 'overlay',    offset: '0x00F20000', size: '0x00200000', type: 'jffs2',    flags: 'RW' },
  { id: 'pt7',  name: 'config',     offset: '0x01120000', size: '0x00100000', type: 'jffs2',    flags: 'RW' },
  { id: 'pt8',  name: 'log',        offset: '0x01220000', size: '0x00080000', type: 'jffs2',    flags: 'RW' },
  { id: 'pt9',  name: 'factory',    offset: '0x012A0000', size: '0x00040000', type: 'raw',      flags: 'RO' },
  { id: 'pt10', name: 'reserved',   offset: '0x012E0000', size: '0x00D20000', type: 'empty',    flags: '—' },
];

const mockArchitecture = [
  { id: 'ar1',  k: 'Kiến trúc',      v: 'ARM Cortex-A53',    tone: 'info' },
  { id: 'ar2',  k: 'ISA',            v: 'ARMv7-A (32-bit)' },
  { id: 'ar3',  k: 'Endianness',     v: 'Little endian' },
  { id: 'ar4',  k: 'Base address',   v: '0x80008000',        mono: true },
  { id: 'ar5',  k: 'Entry point',    v: '0x80008000',        mono: true },
  { id: 'ar6',  k: 'Kernel',         v: 'Linux 4.19.108' },
  { id: 'ar7',  k: 'Bootloader',     v: 'U-Boot 2019.04' },
  { id: 'ar8',  k: 'Filesystem',     v: 'squashfs + jffs2' },
  { id: 'ar9',  k: 'Tổng dung lượng',v: '16.2 MB' },
  { id: 'ar10', k: 'Ký số image',    v: 'Có (RSA-2048)',     tone: 'success' },
];

const mockFirmwareStrings = [
  { id: 'fs1',  offset: '0x00008040', value: '/etc/config/network.conf' },
  { id: 'fs2',  offset: '0x00008120', value: 'U-Boot 2019.04 (Mar 12 2024)' },
  { id: 'fs3',  offset: '0x00008200', value: 'Linux version 4.19.108' },
  { id: 'fs4',  offset: '0x00008310', value: 'agentd:service started' },
  { id: 'fs5',  offset: '0x00008400', value: 'http://192.168.1.1/setup' },
  { id: 'fs6',  offset: '0x00008520', value: 'mqtt://broker.local:1883' },
  { id: 'fs7',  offset: '0x00008600', value: 'failed to mount overlay' },
  { id: 'fs8',  offset: '0x00008710', value: 'wlan0:link is up' },
  { id: 'fs9',  offset: '0x00008800', value: 'firmware build 2024.03.12' },
  { id: 'fs10', offset: '0x00008920', value: 'squashfs image verified' },
  { id: 'fs11', offset: '0x00008A00', value: 'telnetd listening on 23' },
  { id: 'fs12', offset: '0x00008B10', value: '/var/log/messages rotated' },
  { id: 'fs13', offset: '0x00008C00', value: 'ntp sync ok' },
  { id: 'fs14', offset: '0x00008D20', value: 'dhcp client bound 192.168.1.42' },
  { id: 'fs15', offset: '0x00008E00', value: 'board:sample-gw-v2' },
  { id: 'fs16', offset: '0x00008F10', value: 'watchdog timeout 30s' },
  { id: 'fs17', offset: '0x00009000', value: 'https://docs.example.org/gw' },
  { id: 'fs18', offset: '0x00009120', value: 'certificate expires 2026-01-01' },
  { id: 'fs19', offset: '0x00009200', value: 'upgrade slot B active' },
  { id: 'fs20', offset: '0x00009310', value: 'config checksum mismatch' },
];

const mockProtocols = [
  { id: 'pr1',  name: 'HTTP',    port: 80,   encrypted: false },
  { id: 'pr2',  name: 'HTTPS',   port: 443,  encrypted: true },
  { id: 'pr3',  name: 'MQTT',    port: 1883, encrypted: false },
  { id: 'pr4',  name: 'MQTTS',   port: 8883, encrypted: true },
  { id: 'pr5',  name: 'Telnet',  port: 23,   encrypted: false },
  { id: 'pr6',  name: 'SSH',     port: 22,   encrypted: true },
  { id: 'pr7',  name: 'DHCP',    port: 67,   encrypted: false },
  { id: 'pr8',  name: 'NTP',     port: 123,  encrypted: false },
  { id: 'pr9',  name: 'DNS',     port: 53,   encrypted: false },
  { id: 'pr10', name: 'TR-069',  port: 7547, encrypted: true },
  { id: 'pr11', name: 'SNMP',    port: 161,  encrypted: false },
  { id: 'pr12', name: 'CoAP',    port: 5683, encrypted: false },
];

/* --- 3.7. AI AGENT ------------------------------------------------------- */
const mockChatHistory = [
  { id: 'c1',  role: 'user', content: 'Phân tích giúp tôi cấu trúc tổng quan của tệp này.', time: '09:14' },
  { id: 'c2',  role: 'ai',   content: 'Tệp là ELF64 cho x86-64, entry point tại 0x00401000. Có 32 section và 13 program header. Tôi đã lập chỉ mục toàn bộ cây cấu trúc ở khung bên trái.', time: '09:14' },
  { id: 'c3',  role: 'user', content: 'Section nào có entropy cao bất thường?', time: '09:15' },
  { id: 'c4',  role: 'ai',   content: 'Vùng 0x000A1000 – 0x000A6000 có entropy trung bình 7.6/8.0, cao hơn 2.3 đơn vị so với phần còn lại. Đây thường là dấu hiệu dữ liệu đã nén hoặc bảng dữ liệu được mã hoá.', time: '09:15' },
  { id: 'c5',  role: 'user', content: 'Có nên xem thêm bảng imports không?', time: '09:16' },
  { id: 'c6',  role: 'ai',   content: 'Nên xem. Bảng imports hiện có 48 mục, tập trung ở libc, libm và libpthread. Tôi đã gắn nhãn 6 hàm liên quan tới xử lý tệp để bạn tiện đối chiếu.', time: '09:16' },
  { id: 'c7',  role: 'user', content: 'Tóm tắt metadata thành bảng giúp tôi.', time: '09:18' },
  { id: 'c8',  role: 'ai',   content: 'Đã tạo bảng metadata 12 dòng ở panel giữa. Các trường đáng chú ý: không stripped, PIE bật, NX bật, build ID a91f7c02e4.', time: '09:18' },
  { id: 'c9',  role: 'user', content: 'Gợi ý bước tiếp theo cho phiên học tập này?', time: '09:20' },
  { id: 'c10', role: 'ai',   content: 'Bạn có thể: (1) đối chiếu chuỗi trong .rodata với imports, (2) xem biểu đồ entropy theo offset, (3) xuất báo cáo JSON để lưu vào hồ sơ học tập.', time: '09:20' },
  { id: 'c11', role: 'user', content: 'Xuất báo cáo dạng nào phù hợp để nộp bài?', time: '09:22' },
  { id: 'c12', role: 'ai',   content: 'Với mục đích học thuật, PDF giữ được bố cục bảng; JSON phù hợp nếu cần đối chiếu bằng script. Tôi khuyến nghị PDF kèm phụ lục JSON.', time: '09:22' },
];

const mockSuggestions = [
  { id: 'sg1',  title: 'Đối chiếu chuỗi với imports',   desc: 'So khớp 22 chuỗi trong .rodata với 16 import đã lập chỉ mục.',                 confidence: 92, category: 'cross-check' },
  { id: 'sg2',  title: 'Xem lại vùng entropy cao',      desc: '6 vùng liên tiếp vượt ngưỡng 7.5 — nên mở chế độ so sánh.',                    confidence: 88, category: 'entropy' },
  { id: 'sg3',  title: 'Kiểm tra bảng symbol',          desc: '.symtab còn 1,284 symbol, có thể dựng lại call graph.',                        confidence: 81, category: 'structure' },
  { id: 'sg4',  title: 'Gắn nhãn section .dynamic',     desc: '3 mục DT_NEEDED xác định phụ thuộc runtime trực tiếp.',                        confidence: 76, category: 'structure' },
  { id: 'sg5',  title: 'So sánh với target T-11',       desc: 'sensor_hub.elf có cùng kiến trúc, phù hợp để diff cấu trúc.',                   confidence: 74, category: 'compare' },
  { id: 'sg6',  title: 'Xuất phụ lục JSON',             desc: 'Kèm báo cáo PDF để đối chiếu bằng script nội bộ.',                             confidence: 70, category: 'export' },
  { id: 'sg7',  title: 'Rà soát quyền hạn',             desc: '4 quyền mức danger trong manifest cần ghi chú vào báo cáo.',                    confidence: 67, category: 'mobile' },
  { id: 'sg8',  title: 'Kiểm tra tính toàn vẹn',        desc: 'Đối chiếu build ID với bản build chính thức trong hồ sơ.',                      confidence: 63, category: 'integrity' },
  { id: 'sg9',  title: 'Lập bảng phân vùng firmware',   desc: '10 phân vùng đã đọc; nên đánh dấu 3 phân vùng RW.',                             confidence: 59, category: 'firmware' },
  { id: 'sg10', title: 'Ghi chú giả thuyết',            desc: 'Tạo ghi chú cho 2 giả thuyết đang mở trong phiên này.',                         confidence: 55, category: 'note' },
  { id: 'sg11', title: 'Chạy lại phân tích tĩnh',       desc: 'Lần chạy trước hoàn tất sau 41 giây, không có lỗi.',                            confidence: 52, category: 'process' },
  { id: 'sg12', title: 'Đọc hướng dẫn định dạng',       desc: 'Mở trang tài liệu về cấu trúc ELF trong module Trợ giúp.',                      confidence: 48, category: 'docs' },
];

const mockNotes = [
  { id: 'nt1', content: 'Vùng 0x000A1000 cần xem lại trong buổi thực hành tuần sau.', time: '09:21' },
  { id: 'nt2', content: 'Đối chiếu build ID với danh sách phát hành nội bộ.',          time: '09:19' },
  { id: 'nt3', content: 'Giả thuyết 1: overlay chứa tài nguyên của bản build cũ.',     time: '09:17' },
  { id: 'nt4', content: 'Ghi chú cho báo cáo: NX + PIE đều bật, đánh giá tích cực.',  time: '09:12' },
  { id: 'nt5', content: 'Cần bổ sung cột "stripped" vào bảng native libs.',            time: '08:58' },
];

/* --- 3.8. DRAWERS -------------------------------------------------------- */
const mockNotifications = [
  { id: 'no1',  level: 'error',   title: 'Phân tích thất bại',   message: 'client_helper.dll không đọc được bảng section.',       time: '5 phút trước',  read: false },
  { id: 'no2',  level: 'warn',    title: 'Entropy vượt ngưỡng',  message: '6 vùng liên tiếp trong bundle_v3.2.zip.',              time: '22 phút trước', read: false },
  { id: 'no3',  level: 'success', title: 'Hoàn tất giải nén',    message: 'Đã trích xuất 12 tệp từ gói packed.',                   time: '1 giờ trước',   read: false },
  { id: 'no4',  level: 'info',    title: 'AI Agent trả lời',     message: '3 gợi ý mới cho phiên RE-2024-118.',                    time: '1 giờ trước',   read: true },
  { id: 'no5',  level: 'warn',    title: 'Thiếu chữ ký số',      message: 'analytics_pkg.pyz không có chữ ký.',                    time: '2 giờ trước',   read: true },
  { id: 'no6',  level: 'success', title: 'Báo cáo đã xuất',      message: 'report_RE-2024-117.pdf đã lưu vào Downloads.',          time: '3 giờ trước',   read: true },
  { id: 'no7',  level: 'info',    title: 'Cập nhật bộ phân tích', message: 'Rule set cho firmware tăng từ 84 lên 97 mục.',          time: 'Hôm qua',       read: true },
  { id: 'no8',  level: 'error',   title: 'Vượt hạn mức phiên',   message: 'Đã đạt 8/10 phiên đồng thời.',                          time: 'Hôm qua',       read: true },
  { id: 'no9',  level: 'info',    title: 'Đồng bộ hoàn tất',     message: '12 target đã đồng bộ với thư viện mẫu.',                time: '2 ngày trước',  read: true },
  { id: 'no10', level: 'warn',    title: 'Quyền nguy hiểm',      message: 'sample_app.apk yêu cầu 4 quyền mức danger.',            time: '2 ngày trước',  read: true },
  { id: 'no11', level: 'success', title: 'Sao lưu ghi chú',      message: '5 ghi chú đã sao lưu lên kho lưu trữ nội bộ.',          time: '3 ngày trước',  read: true },
];

const mockLogs = [
  { id: 'lg1',  time: '09:24:11', level: 'INFO',  source: 'core',    message: 'Bắt đầu phiên phân tích S-118' },
  { id: 'lg2',  time: '09:24:11', level: 'DEBUG', source: 'loader',  message: 'Đọc header 0x40 byte đầu tiên' },
  { id: 'lg3',  time: '09:24:12', level: 'INFO',  source: 'loader',  message: 'Nhận dạng định dạng ELF64 · x86-64' },
  { id: 'lg4',  time: '09:24:12', level: 'DEBUG', source: 'section', message: 'Lập chỉ mục 32 section' },
  { id: 'lg5',  time: '09:24:13', level: 'INFO',  source: 'section', message: 'Đã dựng cây cấu trúc (25 nút)' },
  { id: 'lg6',  time: '09:24:14', level: 'DEBUG', source: 'disasm',  message: 'Giải mã 22 dòng trong .text' },
  { id: 'lg7',  time: '09:24:15', level: 'INFO',  source: 'strings', message: 'Trích xuất 22 chuỗi (ascii + unicode)' },
  { id: 'lg8',  time: '09:24:16', level: 'WARN',  source: 'entropy', message: 'Entropy 7.6 tại 0x000A1000 vượt ngưỡng 7.5' },
  { id: 'lg9',  time: '09:24:17', level: 'DEBUG', source: 'imports', message: 'Đọc 48 mục từ .dynsym' },
  { id: 'lg10', time: '09:24:18', level: 'INFO',  source: 'metadata',message: 'Hoàn tất 12 trường metadata' },
  { id: 'lg11', time: '09:24:20', level: 'DEBUG', source: 'agent',   message: 'Gửi ngữ cảnh 4,120 token tới AI Agent' },
  { id: 'lg12', time: '09:24:22', level: 'INFO',  source: 'agent',   message: 'Nhận phản hồi trong 1.8s' },
  { id: 'lg13', time: '09:24:23', level: 'WARN',  source: 'agent',   message: 'Cắt bớt ngữ cảnh do vượt hạn mức 8k token' },
  { id: 'lg14', time: '09:24:25', level: 'DEBUG', source: 'ui',      message: 'Render view Binary (layout grid)' },
  { id: 'lg15', time: '09:24:26', level: 'ERROR', source: 'loader',  message: 'Không đọc được overlay tại 0x00C1F000' },
  { id: 'lg16', time: '09:24:27', level: 'INFO',  source: 'core',    message: 'Bỏ qua overlay, tiếp tục phần còn lại' },
  { id: 'lg17', time: '09:24:30', level: 'DEBUG', source: 'cache',   message: 'Ghi cache kết quả phân tích (412 KB)' },
  { id: 'lg18', time: '09:24:31', level: 'INFO',  source: 'report',  message: 'Sẵn sàng xuất báo cáo PDF/HTML/JSON' },
  { id: 'lg19', time: '09:24:33', level: 'WARN',  source: 'ui',      message: 'Chuỗi dài bị cắt trong bảng Strings' },
  { id: 'lg20', time: '09:24:35', level: 'INFO',  source: 'core',    message: 'Phiên S-118 hoàn tất sau 24 giây' },
  { id: 'lg21', time: '09:24:36', level: 'DEBUG', source: 'agent',   message: 'Đồng bộ 3 gợi ý vào tab Gợi ý' },
  { id: 'lg22', time: '09:24:38', level: 'INFO',  source: 'core',    message: 'Trạng thái: sẵn sàng cho target tiếp theo' },
];

const mockChatSessions = [
  { id: 'cs1', title: 'Tổng quan cấu trúc ELF',   snippet: 'Tệp là ELF64 cho x86-64, entry point tại…',           time: '09:24' },
  { id: 'cs2', title: 'Truy vấn vùng entropy cao', snippet: 'Vùng 0x000A1000 – 0x000A6000 có entropy…',            time: '09:15' },
  { id: 'cs3', title: 'Đối chiếu imports',         snippet: 'Bảng imports hiện có 48 mục, tập trung ở…',            time: '09:16' },
  { id: 'cs4', title: 'Tóm tắt metadata',          snippet: 'Đã tạo bảng metadata 12 dòng ở panel giữa…',          time: '09:18' },
  { id: 'cs5', title: 'Gợi ý bước tiếp theo',      snippet: 'Bạn có thể: (1) đối chiếu chuỗi trong .rodata…',       time: '09:20' },
  { id: 'cs6', title: 'Định dạng báo cáo',         snippet: 'Với mục đích học thuật, PDF giữ được bố cục…',         time: '09:22' },
  { id: 'cs7', title: 'Kiểm tra manifest APK',     snippet: '4 quyền mức danger cần ghi chú vào báo cáo…',          time: 'Hôm qua' },
  { id: 'cs8', title: 'So sánh hai target',        snippet: 'sensor_hub.elf có cùng kiến trúc, phù hợp…',           time: 'Hôm qua' },
  { id: 'cs9', title: 'Bảng phân vùng firmware',   snippet: '10 phân vùng đã đọc; nên đánh dấu 3 phân…',            time: '2 ngày trước' },
];

/* --- 3.9. STATUS --------------------------------------------------------- */
const mockStatusMessages = [
  'Sẵn sàng · 12 target trong thư viện phiên',
  'Đã lập chỉ mục 32 section · 0 lỗi',
  'AI Agent đang phân tích ngữ cảnh (4,120 token)',
  'Entropy: 6 vùng vượt ngưỡng cần xem lại',
  'Cache kết quả: 412 KB · đồng bộ 2 phút trước',
  'Phiên S-118 hoàn tất sau 24 giây · không có cảnh báo mới',
];

/* --- 3.10. BẢNG MÃ MÀU / NHÃN DÙNG CHUNG -------------------------------- */
const STATUS_META = {
  ok:         { tone: 'success', label: 'Sẵn sàng' },
  done:       { tone: 'success', label: 'Hoàn tất' },
  processing: { tone: 'info',    label: 'Đang xử lý' },
  warn:       { tone: 'warn',    label: 'Cảnh báo' },
  error:      { tone: 'error',   label: 'Lỗi' },
};

/* ============================================================================
 * 4. COMPONENT CON
 * ========================================================================== */

/* --- 4.1. Hạ tầng: style toàn cục, hook tiện ích, icon ------------------- */
const GLOBAL_CSS = `
:root { color-scheme: dark }
* { -webkit-font-smoothing: antialiased }
.scroll-thin::-webkit-scrollbar { width: 8px; height: 8px }
.scroll-thin::-webkit-scrollbar-track { background: transparent }
.scroll-thin::-webkit-scrollbar-thumb { background: #26263a; border-radius: 8px }
.scroll-thin::-webkit-scrollbar-thumb:hover { background: #34344f }

@keyframes ui-spin    { to { transform: rotate(360deg) } }
@keyframes ui-pulse   { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
@keyframes ui-blink   { 0%, 80%, 100% { opacity: .15 } 40% { opacity: 1 } }
@keyframes ui-marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
@keyframes ui-fade    { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
@keyframes ui-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }

.ui-spin    { animation: ui-spin .9s linear infinite }
.ui-pulse   { animation: ui-pulse 1.8s ease-in-out infinite }
.ui-dot     { display: inline-block; animation: ui-blink 1.3s infinite }
.ui-fade    { animation: ui-fade .18s ease both }
.ui-marquee { display: inline-block; animation: ui-marquee 28s linear infinite }
.ui-shimmer {
  background-image: linear-gradient(90deg, rgba(139,109,255,0) 0%, rgba(139,109,255,.35) 50%, rgba(139,109,255,0) 100%);
  background-size: 200% 100%;
  animation: ui-shimmer 2.2s linear infinite;
}

.btn { transition: background-color .15s ease, color .15s ease, border-color .15s ease, filter .15s ease, transform .1s ease }
.btn:active { transform: scale(.98) }
.btn-primary:hover { filter: brightness(1.12) }
.btn-danger:hover  { filter: brightness(1.12) }
.btn-ghost:hover   { background: rgb(23,23,40); color: rgb(244,244,251) }
.btn-outline:hover { background: rgb(23,23,40); border-color: rgb(58,58,86) }
.hv-row:hover    { background: rgb(23,23,40) }
.hv-item:hover   { background: rgb(26,26,45) }
.hv-card:hover   { background: rgb(23,23,40) }
.hv-border:hover { border-color: rgba(139,109,255,.5) }
.row-sel { background: rgba(139,109,255,.10) }
.sel     { background: rgba(139,109,255,.14) }
.focus-ring:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(139,109,255,.38) }
input[type=range] { accent-color: rgb(139,109,255) }
`;

/** Dev hook: đóng popup khi click ra ngoài. */
function useOutside(ref, onOutside) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
}

const ICONS = {
  logo: (
    <>
      <path d="M12 3l8 4.6v8.8L12 21l-8-4.6V7.6z" />
      <path d="M12 12l8-4.4M12 12v9M12 12L4 7.6" />
    </>
  ),
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-3.6-3.6" /></>),
  plus:   (<><path d="M12 5v14M5 12h14" /></>),
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </>
  ),
  chevronDown:  (<><path d="M6 9l6 6 6-6" /></>),
  chevronRight: (<><path d="M9 6l6 6-6 6" /></>),
  chevronLeft:  (<><path d="M15 6l-6 6 6 6" /></>),
  x:      (<><path d="M6 6l12 12M18 6L6 18" /></>),
  check:  (<><path d="M5 13l4 4L19 7" /></>),
  upload: (<><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></>),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </>
  ),
  fileCode: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M10 12.5l-1.8 1.8 1.8 1.8M14 12.5l1.8 1.8-1.8 1.8" />
    </>
  ),
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </>
  ),
  package: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
    </>
  ),
  smartphone: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  folder: (
    <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </>
  ),
  message: (<path d="M4 5h16v11H8l-4 4z" />),
  sparkles: (
    <>
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
      <path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" />
    </>
  ),
  note: (
    <>
      <path d="M4 4h16v12l-4 4H4z" />
      <path d="M20 16h-4v4" />
    </>
  ),
  send: (<><path d="M21 3L10 14M21 3l-6.5 18-4.5-7-7-4.5z" /></>),
  refresh: (<><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v4h-4" /></>),
  filter: (<path d="M3 5h18l-7 8v6l-4 2v-8z" />),
  download: (<><path d="M12 4v12M7 11l5 5 5-5M4 20h16" /></>),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  list: (<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />),
  zoomIn: (<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-3.6-3.6M8 11h6M11 8v6" /></>),
  zoomOut: (<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-3.6-3.6M8 11h6" /></>),
  copy: (
    <>
      <rect x="3" y="3" width="12" height="12" rx="2" />
      <path d="M9 21h10a2 2 0 0 0 2-2V9" />
    </>
  ),
  trash: (<><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></>),
  edit: (<><path d="M4 20h4l10-10-4-4L4 16z" /><path d="M14 6l4 4" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>),
  warning: (<><path d="M12 3l9 16H3z" /><path d="M12 9v5M12 17h.01" /></>),
  alertCircle: (<><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>),
  checkCircle: (<><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></>),
  shield: (<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />),
  terminal: (<><path d="M4 5h16v14H4z" /><path d="M8 10l2.5 2L8 14M13 14h3" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </>
  ),
  bookmark: (<path d="M6 3h12v18l-6-4-6 4z" />),
  code: (<path d="M8 8l-4 4 4 4M16 8l4 4-4 4" />),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  wifi: (
    <path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 16a6 6 0 0 1 7 0M12 20h.01" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
  play: (<path d="M7 4l12 8-12 8z" />),
  stop: (<rect x="6" y="6" width="12" height="12" rx="2" />),
  arrowRight: (<><path d="M4 12h16M14 6l6 6-6 6" /></>),
  hash: (<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />),
  link: (
    <path d="M9 15l6-6M8 12l-2 2a3.5 3.5 0 0 0 5 5l2-2M16 12l2-2a3.5 3.5 0 0 0-5-5l-2 2" />
  ),
  eye: (
    <>
      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  split: (<path d="M12 3v18M6 6L2 10l4 4M18 6l4 4-4 4" />),
  menu: (<path d="M4 7h16M4 12h16M4 17h16" />),
  save: (
    <>
      <path d="M5 3h11l3 3v15H5z" />
      <path d="M8 3v6h8V3M8 15h8" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01" />
    </>
  ),
};

/** Icon SVG inline — không phụ thuộc thư viện ngoài. */
function Icon({ name, size = 14, strokeWidth = 1.75, className = '', style }) {
  const node = ICONS[name];
  if (!node) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      style={style}
      aria-hidden="true"
    >
      {node}
    </svg>
  );
}

/* --- 4.2. Nguyên thuỷ UI ------------------------------------------------- */

/** Badge trạng thái với 6 tông màu. */
function Badge({ tone = 'neutral', children, dot = false, className = '' }) {
  const color = tone === 'neutral' ? C.textSecondary : C[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-[1px] text-[9.5px] font-semibold uppercase tracking-wide ${className}`}
      style={{
        color,
        background: alpha(color, 0.12),
        border: `1px solid ${alpha(color, 0.28)}`,
      }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}

const BTN_SIZES = {
  xs: 'h-5 px-1.5 text-[10px] gap-1 rounded-md',
  sm: 'h-7 px-2.5 text-[11px] gap-1.5 rounded-lg',
  md: 'h-8 px-3 text-[12px] gap-1.5 rounded-lg',
};

/** Nút với 5 biến thể, có focus ring + active scale. */
function Btn({
  children,
  variant = 'ghost',
  size = 'sm',
  icon,
  iconRight,
  onClick,
  full = false,
  disabled = false,
  title,
}) {
  const base =
    'btn focus-ring inline-flex select-none items-center justify-center font-semibold disabled:opacity-40 disabled:pointer-events-none';
  const variants = {
    primary: { background: C.primary, color: C.textForeground, border: `1px solid ${C.primary}` },
    outline: { background: 'transparent', color: C.textSecondary, border: `1px solid ${C.border}` },
    ghost: { background: 'transparent', color: C.textSecondary, border: '1px solid transparent' },
    danger: { background: C.error, color: C.textForeground, border: `1px solid ${C.error}` },
    dangerGhost: {
      background: alpha(C.error, 0.12),
      color: C.error,
      border: `1px solid ${alpha(C.error, 0.3)}`,
    },
    successGhost: {
      background: alpha(C.success, 0.12),
      color: C.success,
      border: `1px solid ${alpha(C.success, 0.3)}`,
    },
  };
  const cls = {
    primary: 'btn-primary',
    danger: 'btn-danger',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    dangerGhost: 'btn-ghost',
    successGhost: 'btn-ghost',
  }[variant];

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      aria-label={title || (typeof children === 'string' ? children : undefined)}
      className={`${base} ${BTN_SIZES[size]} ${cls} ${full ? 'w-full' : ''}`}
      style={variants[variant]}
    >
      {icon && <Icon name={icon} size={size === 'xs' ? 10 : 12} />}
      {children}
      {iconRight && <Icon name={iconRight} size={12} />}
    </button>
  );
}

/** Nút chỉ có icon, dùng cho action bar trong panel. */
function IconBtn({ icon, label, onClick, active = false, size = 24, tone }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`btn focus-ring inline-flex items-center justify-center rounded-md ${active ? 'sel' : 'btn-ghost'}`}
      style={{
        width: size,
        height: size,
        color: tone ? C[tone] : active ? C.primary : C.textSecondary,
      }}
    >
      <Icon name={icon} size={12.5} />
    </button>
  );
}

/** Ô nhập liệu có icon, helper text, trạng thái lỗi, gợi ý phím tắt. */
function Input({
  icon,
  value,
  onChange,
  placeholder,
  helper,
  error,
  shortcut,
  mono = false,
  size = 'sm',
  disabled = false,
  onEnter,
}) {
  const height = size === 'sm' ? 'h-7' : 'h-8';
  const borderColor = error ? C.error : C.border;
  return (
    <div className="min-w-0">
      <div
        className={`flex ${height} items-center gap-1.5 rounded-lg border px-2 transition-colors ${error ? '' : 'hv-border'}`}
        style={{ background: C.inputBackground, borderColor }}
      >
        {icon && <Icon name={icon} size={12} style={{ color: error ? C.error : C.textSecondary }} />}
        <input
          value={value}
          disabled={disabled}
          onChange={(e) => onChange && onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onEnter && onEnter()}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-describedby={helper || error ? 'field-helper' : undefined}
          className="h-full w-full min-w-0 border-0 bg-transparent text-[11px] outline-none focus-visible:outline-none disabled:opacity-50"
          style={{
            color: C.textPrimary,
            fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
          }}
        />
        {shortcut && (
          <kbd
            className="rounded border px-1 text-[9px] font-medium"
            style={{ borderColor: C.border, color: C.textSecondary }}
          >
            {shortcut}
          </kbd>
        )}
      </div>
      {error && <p className="mt-1 text-[10px]" style={{ color: C.error }}>{error}</p>}
      {!error && helper && <p className="mt-1 text-[10px]" style={{ color: C.textSecondary }}>{helper}</p>}
    </div>
  );
}

/** Textarea có label + helper. */
function TextArea({ value, onChange, placeholder, rows = 3, mono = false }) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(e) => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="focus-ring w-full resize-none rounded-lg border px-2 py-1.5 text-[11px] leading-[1.5] outline-none"
      style={{
        background: C.inputBackground,
        borderColor: C.border,
        color: C.textPrimary,
        fontFamily: mono ? 'ui-monospace, monospace' : undefined,
      }}
    />
  );
}

/**
 * Dropdown custom — menu render với position:fixed để không bị cắt bởi
 * container có overflow:hidden.
 */
function Dropdown({
  value,
  options,
  onChange,
  icon,
  placeholder = 'Chọn…',
  width = 190,
  align = 'left',
  tone,
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const ref = useRef(null);
  useOutside(ref, useCallback(() => setOpen(false), []));

  const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const current = normalized.find((o) => o.value === value);

  const toggle = () => {
    if (!open && ref.current) setRect(ref.current.getBoundingClientRect());
    setOpen((v) => !v);
  };

  return (
    <div ref={ref} className="relative inline-block min-w-0">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="btn btn-outline focus-ring flex h-7 w-full items-center gap-1.5 rounded-lg border px-2 text-[11px]"
        style={{
          background: C.inputBackground,
          borderColor: open ? alpha(C.primary, 0.5) : C.border,
          color: tone ? C[tone] : C.textPrimary,
        }}
      >
        {icon && <Icon name={icon} size={12} style={{ color: C.textSecondary }} />}
        <span className="truncate">{current ? current.label : placeholder}</span>
        <Icon
          name="chevronDown"
          size={11}
          className="ml-auto"
          style={{
            color: C.textSecondary,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .15s ease',
          }}
        />
      </button>
      {open && rect && (
        <div
          role="listbox"
          className="ui-fade fixed z-[80] overflow-auto rounded-lg border p-1 shadow-xl scroll-thin"
          style={{
            top: rect.bottom + 4,
            left: align === 'right' ? undefined : rect.left,
            right: align === 'right' ? window.innerWidth - rect.right : undefined,
            width: Math.max(width, rect.width),
            maxHeight: 260,
            background: C.dropdownBackground,
            borderColor: C.border,
            boxShadow: '0 12px 32px rgba(0,0,0,.55)',
          }}
        >
          {normalized.map((o) => {
            const isActive = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onChange && onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${isActive ? 'sel' : 'hv-item'}`}
                style={{ color: isActive ? C.primary : C.textPrimary }}
              >
                {o.icon && (
                  <Icon name={o.icon} size={12} style={{ color: isActive ? C.primary : C.textSecondary }} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{o.label}</span>
                  {o.desc && (
                    <span className="block truncate text-[10px]" style={{ color: C.textSecondary }}>
                      {o.desc}
                    </span>
                  )}
                </span>
                {isActive && <Icon name="check" size={12} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Switch bật/tắt. */
function Toggle({ checked, onChange, label, helper }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange && onChange(!checked)}
      className="focus-ring flex w-full items-center gap-2 rounded-md px-1 py-1 text-left"
    >
      <span
        className="relative inline-flex h-4 w-8 shrink-0 items-center rounded-full transition-colors"
        style={{ background: checked ? C.primary : C.border }}
      >
        <span
          className="absolute h-3 w-3 rounded-full transition-all"
          style={{ left: checked ? 17 : 2, background: checked ? C.textForeground : C.textSecondary }}
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px]" style={{ color: C.textPrimary }}>{label}</span>
        {helper && (
          <span className="block truncate text-[10px]" style={{ color: C.textSecondary }}>{helper}</span>
        )}
      </span>
    </button>
  );
}

/** Checkbox tuỳ biến. */
function Checkbox({ checked, onChange, label, tone = 'primary' }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange && onChange(!checked)}
      className="focus-ring flex w-full items-center gap-2 rounded-md px-1 py-[3px] text-left"
    >
      <span
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors"
        style={{
          borderColor: checked ? C[tone] : C.border,
          background: checked ? C[tone] : 'transparent',
          color: C.background,
        }}
      >
        {checked && <Icon name="check" size={9} strokeWidth={3} />}
      </span>
      <span className="truncate text-[11px]" style={{ color: C.textPrimary }}>{label}</span>
    </button>
  );
}

/** Radio tuỳ biến. */
function Radio({ checked, onChange, label, desc, value }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={() => onChange && onChange(value)}
      className={`focus-ring flex w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${checked ? 'sel' : 'hv-item'}`}
      style={{ borderColor: checked ? alpha(C.primary, 0.45) : C.border }}
    >
      <span
        className="mt-[2px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border"
        style={{ borderColor: checked ? C.primary : C.border }}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.primary }} />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-medium" style={{ color: C.textPrimary }}>
          {label}
        </span>
        {desc && (
          <span className="block text-[10px]" style={{ color: C.textSecondary }}>{desc}</span>
        )}
      </span>
    </button>
  );
}

/** Slider nhiệt độ — dùng input range gốc với accentColor. */
function Slider({ value, onChange, min = 0, max = 2, step = 0.1, label, suffix = '' }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px]" style={{ color: C.textPrimary }}>{label}</span>
        <span
          className="rounded px-1.5 py-[1px] font-mono text-[10px]"
          style={{ background: alpha(C.primary, 0.14), color: C.primary }}
        >
          {typeof value === 'number' ? value.toFixed(1) : value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange && onChange(Number(e.target.value))}
        className="focus-ring h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none"
        style={{
          background: `linear-gradient(to right, ${C.primary} ${((value - min) / (max - min)) * 100}%, ${C.border} ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
      <div className="mt-1 flex justify-between text-[9px]" style={{ color: C.textSecondary }}>
        <span>Chính xác</span><span>Cân bằng</span><span>Sáng tạo</span>
      </div>
    </div>
  );
}

/** Tooltip thuần CSS hover. */
function Tooltip({ text, children, side = 'top' }) {
  const pos =
    side === 'top' ? 'bottom-full mb-1.5 left-1/2 -translate-x-1/2' : 'top-full mt-1.5 left-0';
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-[90] w-max max-w-[220px] rounded-md border px-2 py-1 text-[10px] leading-[1.4] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 ${pos}`}
        style={{ background: C.tooltipBackground, borderColor: C.border, color: C.textPrimary }}
      >
        {text}
      </span>
    </span>
  );
}

/** Khung panel có header/body/footer. */
function Panel({
  title,
  subtitle,
  icon,
  tone = 'primary',
  actions,
  children,
  className = '',
  bodyClass = '',
  footer,
  noPad = false,
}) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border ${className}`}
      style={{ background: C.cardBackground, borderColor: C.border }}
    >
      {title && (
        <header
          className="flex h-8 shrink-0 items-center gap-1.5 border-b px-2.5"
          style={{ borderColor: C.border, background: C.tableHeaderBackground }}
        >
          {icon && <Icon name={icon} size={12} style={{ color: C[tone] }} />}
          <h3 className="truncate text-[11px] font-semibold tracking-wide" style={{ color: C.textPrimary }}>
            {title}
          </h3>
          {subtitle && (
            <span className="truncate text-[10px]" style={{ color: C.textSecondary }}>{subtitle}</span>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-0.5">{actions}</div>
        </header>
      )}
      <div className={`min-h-0 flex-1 overflow-auto scroll-thin ${noPad ? '' : 'p-2'} ${bodyClass}`}>
        {children}
      </div>
      {footer && (
        <div
          className="shrink-0 border-t px-2.5 py-1.5"
          style={{ borderColor: C.border, background: C.tableFooterBackground }}
        >
          {footer}
        </div>
      )}
    </section>
  );
}

/** Danh sách key-value có nút copy. */
function KVList({ items, dense = false, onCopy }) {
  return (
    <dl className="divide-y" style={{ borderColor: alpha(C.border, 0.55) }}>
      {items.map((it) => (
        <div key={it.id || it.k} className="group flex items-start gap-2 py-[3px]">
          <dt className="w-[42%] shrink-0 truncate text-[10.5px]" style={{ color: C.textSecondary }}>
            {it.k}
          </dt>
          <dd className="flex min-w-0 flex-1 items-center gap-1">
            <span
              className="min-w-0 truncate text-[10.5px]"
              style={{
                color: it.tone ? C[it.tone] : C.textPrimary,
                fontFamily: it.mono ? 'ui-monospace, monospace' : undefined,
              }}
              title={String(it.v)}
            >
              {it.v}
            </span>
            {it.mono && (
              <button
                type="button"
                aria-label={`Sao chép ${it.k}`}
                onClick={() => onCopy && onCopy(`${it.k}: ${it.v}`)}
                className="btn btn-ghost focus-ring ml-auto rounded p-0.5 opacity-0 group-hover:opacity-100"
                style={{ color: C.textSecondary }}
              >
                <Icon name="copy" size={10} />
              </button>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Bảng dữ liệu tối giản, sticky header. */
function DataTable({
  columns,
  rows,
  rowKey = 'id',
  onRowClick,
  selectedKey,
  emptyText = 'Không có bản ghi phù hợp',
  maxHeight,
}) {
  return (
    <div className="overflow-auto scroll-thin" style={{ maxHeight }}>
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10">
          <tr style={{ background: C.tableHeaderBackground }}>
            {columns.map((c) => (
              <th
                key={c.key}
                className="whitespace-nowrap border-b px-1.5 py-1 text-[9.5px] font-semibold uppercase tracking-wide"
                style={{
                  color: C.textSecondary,
                  borderColor: C.border,
                  width: c.width,
                  textAlign: c.align || 'left',
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-2 py-5 text-center text-[10.5px]"
                style={{ color: C.textSecondary }}
              >
                {emptyText}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr
              key={r[rowKey] ?? i}
              onClick={() => onRowClick && onRowClick(r)}
              className={`${selectedKey === r[rowKey] ? 'row-sel' : 'hv-row'} cursor-default transition-colors`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className="truncate border-b px-1.5 py-[3px] text-[10.5px]"
                  style={{
                    color: c.mono ? C.textSecondary : C.textPrimary,
                    borderColor: alpha(C.border, 0.5),
                    textAlign: c.align || 'left',
                    fontFamily: c.mono ? 'ui-monospace, monospace' : undefined,
                    maxWidth: c.width,
                  }}
                  title={typeof r[c.key] === 'string' ? r[c.key] : undefined}
                >
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Cây thư mục/cấu trúc đệ quy, tự quản lý trạng thái mở. */
function TreeNode({ node, depth, onSelect, selectedId, defaultOpen }) {
  const [open, setOpen] = useState(depth < defaultOpen);
  const hasChildren = node.children && node.children.length > 0;
  const iconMap = {
    header: 'hash',
    section: 'layers',
    segment: 'grid',
    folder: 'folder',
    py: 'fileCode',
    pyc: 'fileCode',
    so: 'cpu',
    json: 'code',
    txt: 'file',
    file: 'file',
  };
  const toneMap = {
    header: C.primary,
    section: C.info,
    segment: C.textSecondary,
    folder: C.warn,
    py: C.info,
    pyc: C.warn,
    so: C.primary,
    json: C.success,
  };
  const tone = toneMap[node.type] || C.textSecondary;
  return (
    <div>
      <div
        onClick={() => {
          onSelect && onSelect(node);
          if (hasChildren) setOpen((v) => !v);
        }}
        className={`flex cursor-pointer items-center gap-1 rounded px-1 py-[2px] transition-colors ${selectedId === node.id ? 'row-sel' : 'hv-row'}`}
        style={{ paddingLeft: 4 + depth * 12 }}
      >
        <span className="flex h-3 w-3 shrink-0 items-center justify-center" style={{ color: C.textSecondary }}>
          {hasChildren ? <Icon name={open ? 'chevronDown' : 'chevronRight'} size={9} /> : null}
        </span>
        <Icon name={iconMap[node.type] || 'file'} size={11} style={{ color: tone }} />
        <span className="min-w-0 flex-1 truncate text-[10.5px]" style={{ color: C.textPrimary }}>
          {node.name}
        </span>
        {node.badge && <Badge tone="info">{node.badge}</Badge>}
        {node.size && (
          <span className="shrink-0 font-mono text-[9.5px]" style={{ color: C.textSecondary }}>
            {node.size}
          </span>
        )}
      </div>
      {hasChildren && open && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              defaultOpen={defaultOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Tree({ nodes, onSelect, selectedId, defaultOpen = 1 }) {
  return (
    <div>
      {nodes.map((n) => (
        <TreeNode
          key={n.id}
          node={n}
          depth={0}
          onSelect={onSelect}
          selectedId={selectedId}
          defaultOpen={defaultOpen}
        />
      ))}
    </div>
  );
}

/** Biểu đồ entropy dạng SVG, hỗ trợ nhiều series. */
function EntropyChart({ series, height = 132, yMax = 8 }) {
  const W = 620;
  const H = 110;
  const buildPath = (data) =>
    data
      .map(
        (v, i) =>
          `${i === 0 ? 'M' : 'L'}${((i / (data.length - 1)) * W).toFixed(1)},${(H - (v / yMax) * H).toFixed(1)}`,
      )
      .join(' ');
  return (
    <div className="flex h-full w-full gap-2">
      <div
        className="flex flex-col justify-between py-1 text-[9px] font-mono"
        style={{ color: C.textSecondary }}
      >
        <span>8.0</span><span>6.0</span><span>4.0</span><span>2.0</span><span>0.0</span>
      </div>
      <div className="relative min-w-0 flex-1" style={{ height }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-label="Biểu đồ entropy theo offset"
        >
          {[0.25, 0.5, 0.75].map((k) => (
            <line
              key={k}
              x1="0"
              y1={H * k}
              x2={W}
              y2={H * k}
              stroke={C.border}
              strokeWidth="0.7"
              strokeDasharray="3 5"
            />
          ))}
          <line
            x1="0"
            y1={H * 0.0625}
            x2={W}
            y2={H * 0.0625}
            stroke={alpha(C.warn, 0.5)}
            strokeWidth="0.8"
            strokeDasharray="6 4"
          />
          {series.map((s) => (
            <g key={s.label}>
              {s.fill !== false && (
                <path
                  d={`${buildPath(s.data)} L${W},${H} L0,${H} Z`}
                  fill={alpha(s.color, s.fillOpacity ?? 0.16)}
                />
              )}
              <path
                d={buildPath(s.data)}
                fill="none"
                stroke={s.color}
                strokeWidth={s.width ?? 1.4}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
              />
            </g>
          ))}
        </svg>
        <div
          className="absolute inset-x-0 -bottom-0.5 flex justify-between font-mono text-[9px]"
          style={{ color: C.textSecondary }}
        >
          <span>0x00000000</span><span>0x00600000</span><span>0x00C00000</span>
        </div>
      </div>
    </div>
  );
}

/** Bảng hex 3 cột có chọn dòng. */
function HexView({ rows, selected, onSelect }) {
  const fmt = (bytes) => `${bytes.slice(0, 8).join(' ')}  ${bytes.slice(8).join(' ')}`;
  return (
    <div className="font-mono text-[10px] leading-[15px]">
      {rows.map((r) => (
        <div
          key={r.id}
          onClick={() => onSelect(r.id)}
          className={`grid cursor-pointer items-center gap-2 rounded px-1 ${selected === r.id ? 'row-sel' : 'hv-row'}`}
          style={{ gridTemplateColumns: '62px 1fr 84px' }}
        >
          <span style={{ color: C.textSecondary }}>{r.offset}</span>
          <span className="truncate" style={{ color: C.textPrimary }}>{fmt(r.bytes)}</span>
          <span className="truncate" style={{ color: C.success }}>{r.ascii}</span>
        </div>
      ))}
    </div>
  );
}

/** Khung code giả lập có số dòng + highlight Python. */
const PY_KEYWORDS = new Set([
  'def', 'class', 'return', 'import', 'from', 'if', 'else', 'elif', 'for', 'while',
  'in', 'not', 'and', 'or', 'None', 'True', 'False', 'lambda', 'with', 'as',
  'try', 'except', 'pass', 'self', 'print',
]);

function highlightPython(line) {
  const tokens = [];
  const re =
    /(#.*$)|("""[\s\S]*?"""|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(\d+\.?\d*)\b|\b([A-Za-z_][A-Za-z0-9_]*)\b/g;
  let last = 0;
  let m = re.exec(line);
  while (m) {
    if (m.index > last) tokens.push({ text: line.slice(last, m.index), color: C.textPrimary });
    if (m[1]) tokens.push({ text: m[1], color: C.textSecondary });
    else if (m[2]) tokens.push({ text: m[2], color: C.success });
    else if (m[3]) tokens.push({ text: m[3], color: C.warn });
    else if (m[4]) {
      const w = m[4];
      const color = PY_KEYWORDS.has(w) ? C.primary : line[m.index + w.length] === '(' ? C.info : C.textPrimary;
      tokens.push({ text: w, color });
    }
    last = m.index + m[0].length;
    m = re.exec(line);
  }
  if (last < line.length) tokens.push({ text: line.slice(last), color: C.textPrimary });
  return tokens;
}

function CodeView({ lines }) {
  return (
    <div className="font-mono text-[10px] leading-[16px]">
      {lines.map((code, i) => (
        <div key={`ln-${i}`} className="flex gap-2 hv-row rounded px-1">
          <span
            className="w-5 shrink-0 select-none text-right"
            style={{ color: alpha(C.textSecondary, 0.7) }}
          >
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 whitespace-pre">
            {highlightPython(code).map((t, ti) => (
              <span key={ti} style={{ color: t.color }}>{t.text}</span>
            ))}
            {code === '' ? ' ' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Xem JSON dạng cây có màu + copy. */
function JsonNode({ label, value, depth }) {
  const [open, setOpen] = useState(depth < 2);
  const isObj = value !== null && typeof value === 'object';
  const pad = 4 + depth * 12;
  if (!isObj) {
    const color =
      typeof value === 'string' ? C.success : typeof value === 'number' ? C.warn : C.info;
    return (
      <div
        className="flex gap-1 rounded px-1 py-[1px] font-mono text-[10px] leading-[15px] hover:bg-transparent"
        style={{ paddingLeft: pad }}
      >
        <span style={{ color: C.info }}>{label}</span>
        <span style={{ color: C.textSecondary }}>:</span>
        <span className="truncate" style={{ color }}>
          {typeof value === 'string' ? `"${value}"` : String(value)}
        </span>
      </div>
    );
  }
  const entries = Object.entries(value);
  return (
    <div>
      <div
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer items-center gap-1 rounded px-1 py-[1px] font-mono text-[10px] leading-[15px] hv-row"
        style={{ paddingLeft: pad }}
      >
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={9} style={{ color: C.textSecondary }} />
        <span style={{ color: C.info }}>{label}</span>
        <span style={{ color: C.textSecondary }}>
          {Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </div>
      {open &&
        entries.map(([k, v]) => <JsonNode key={k} label={k} value={v} depth={depth + 1} />)}
    </div>
  );
}

/** Danh sách dòng disassembly với syntax highlight giả lập. */
function DisassemblyList({ rows }) {
  return (
    <div className="font-mono text-[10px] leading-[16px]">
      {rows.map((r) => (
        <div
          key={r.id}
          className="grid items-baseline gap-2 rounded px-1 hv-row"
          style={{ gridTemplateColumns: '66px 84px 1fr' }}
        >
          <span style={{ color: C.textSecondary }}>{r.address}</span>
          <span className="truncate" style={{ color: alpha(C.textSecondary, 0.8) }}>{r.bytes}</span>
          <span className="min-w-0 truncate">
            <span style={{ color: C.primary }}>{r.opcode}</span>
            {r.operand && <span style={{ color: C.textPrimary }}> {r.operand}</span>}
            {r.comment && <span style={{ color: C.success }}> {r.comment}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Thanh tiến trình nhỏ dùng lại nhiều nơi. */
function ProgressBar({ value, tone = 'primary', height = 4, animated = false }) {
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height, background: C.border }}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${animated ? 'ui-shimmer' : ''}`}
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: animated ? undefined : C[tone],
          backgroundColor: animated ? C[tone] : undefined,
        }}
      />
    </div>
  );
}

/* --- 4.3. TOPBAR --------------------------------------------------------- */
function TopBar({
  targetId,
  setTargetId,
  search,
  setSearch,
  onUpload,
  onOpenUser,
  notifCount,
}) {
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);
  useOutside(userRef, useCallback(() => setUserOpen(false), []));

  return (
    <header
      className="flex h-14 shrink-0 items-center gap-2 border-b px-3"
      style={{ background: C.panelBackground, borderColor: C.border }}
    >
      {/* Logo */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
        style={{
          background: `linear-gradient(140deg, ${alpha(C.primary, 0.28)}, ${alpha(C.info, 0.12)})`,
          borderColor: alpha(C.primary, 0.4),
          color: C.primary,
        }}
      >
        <Icon name="logo" size={17} strokeWidth={1.6} />
      </div>

      {/* Tên module */}
      <div className="hidden min-w-0 md:block">
        <div className="flex items-center gap-1.5">
          <h1 className="truncate text-[12.5px] font-bold" style={{ color: C.textPrimary }}>
            Phân tích Cấu trúc Tệp tin
          </h1>
          <Badge tone="primary">AI Agent</Badge>
        </div>
        <p className="truncate text-[9.5px]" style={{ color: C.textSecondary }}>
          Module học thuật · phân tích tĩnh phục vụ đào tạo an toàn thông tin
        </p>
      </div>

      <div className="flex-1" />

      {/* Dropdown target */}
      <div className="hidden w-[190px] shrink-0 lg:block">
        <Dropdown
          value={targetId}
          onChange={setTargetId}
          icon="cpu"
          width={250}
          options={mockTargets.map((t) => ({
            value: t.id,
            label: t.name,
            desc: `${TARGET_TYPES.find((x) => x.value === t.type)?.label} · ${t.size}`,
            icon: TARGET_TYPES.find((x) => x.value === t.type)?.icon,
          }))}
        />
      </div>

      {/* Tìm kiếm */}
      <div className="hidden w-[210px] shrink-0 sm:block">
        <Input
          icon="search"
          value={search}
          onChange={setSearch}
          placeholder="Tìm section, hàm, chuỗi…"
          shortcut="⌘K"
        />
      </div>

      {/* Tải target mới */}
      <Btn variant="primary" size="sm" icon="plus" onClick={onUpload}>
        Tải target mới
      </Btn>

      {/* Thông báo */}
      <Tooltip text="11 thông báo · 3 chưa đọc">
        <button
          type="button"
          aria-label="Mở trung tâm thông báo"
          className="btn btn-ghost focus-ring relative flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ color: C.textSecondary }}
        >
          <Icon name="bell" size={14} />
          {notifCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[8.5px] font-bold"
              style={{ background: C.error, color: C.textForeground }}
            >
              {notifCount}
            </span>
          )}
        </button>
      </Tooltip>

      {/* Avatar + menu */}
      <div ref={userRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setUserOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={userOpen}
          className="btn btn-outline focus-ring flex h-7 items-center gap-1.5 rounded-lg border px-1.5"
          style={{
            background: C.inputBackground,
            borderColor: userOpen ? alpha(C.primary, 0.5) : C.border,
          }}
        >
          <span
            className="flex items-center justify-center rounded-full text-[9px] font-bold"
            style={{
              background: alpha(C.primary, 0.25),
              color: C.primary,
              height: 18,
              width: 18,
            }}
          >
            NA
          </span>
          <span className="hidden text-[11px] md:inline" style={{ color: C.textPrimary }}>
            nguyen.an
          </span>
          <Icon name="chevronDown" size={10} style={{ color: C.textSecondary }} />
        </button>
        {userOpen && (
          <div
            role="menu"
            className="ui-fade absolute right-0 top-full z-[70] mt-1 w-56 rounded-lg border p-1 shadow-xl"
            style={{
              background: C.dropdownBackground,
              borderColor: C.border,
              boxShadow: '0 12px 32px rgba(0,0,0,.55)',
            }}
          >
            <div className="border-b px-2 py-1.5" style={{ borderColor: C.border }}>
              <p className="text-[11px] font-semibold" style={{ color: C.textPrimary }}>Nguyễn An</p>
              <p className="text-[10px]" style={{ color: C.textSecondary }}>
                nguyen.an@lab.edu.vn · Giảng viên
              </p>
            </div>
            {[
              { icon: 'user',     label: 'Hồ sơ cá nhân' },
              { icon: 'settings', label: 'Cài đặt giao diện', onClick: onOpenUser },
              { icon: 'shield',   label: 'Chính sách sử dụng' },
              { icon: 'help',     label: 'Trợ giúp module' },
            ].map((it) => (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setUserOpen(false);
                  it.onClick && it.onClick();
                }}
                className="hv-item flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors"
                style={{ color: C.textPrimary }}
              >
                <Icon name={it.icon} size={12} style={{ color: C.textSecondary }} />
                {it.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

/* --- 4.4. SIDEBAR -------------------------------------------------------- */
function Sidebar({ sessionId, setSessionId, targetId, setTargetId, onUpload, onOpenAgent }) {
  return (
    <aside
      className="flex min-h-0 flex-col border-r"
      style={{ background: C.panelBackground, borderColor: C.border }}
    >
      {/* Bản đầy đủ — hiển thị từ lg */}
      <div className="hidden min-h-0 flex-1 flex-col lg:flex">
        <div className="p-2.5 pb-1.5">
          <Btn variant="primary" size="sm" icon="plus" full onClick={onUpload}>
            Tải target mới
          </Btn>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-thin px-2 pb-2">
          {/* Phiên phân tích */}
          <div className="mb-1 mt-2 flex items-center gap-1.5 px-1">
            <Icon name="clock" size={11} style={{ color: C.textSecondary }} />
            <span
              className="text-[9.5px] font-bold uppercase tracking-wider"
              style={{ color: C.textSecondary }}
            >
              Phiên phân tích
            </span>
            <Badge tone="neutral" className="ml-auto">{mockSessions.length}</Badge>
          </div>
          <ul className="space-y-0.5">
            {mockSessions.map((s) => {
              const active = s.id === sessionId;
              const meta = STATUS_META[s.status];
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSessionId(s.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full rounded-lg border px-1.5 py-1.5 text-left transition-colors ${active ? 'sel' : 'hv-row'}`}
                    style={{ borderColor: active ? alpha(C.primary, 0.45) : 'transparent' }}
                  >
                    <div className="flex items-center gap-1">
                      <Icon
                        name={TARGET_TYPES.find((t) => t.value === s.targetType)?.icon || 'file'}
                        size={10}
                        style={{ color: active ? C.primary : C.textSecondary }}
                      />
                      <span
                        className="min-w-0 flex-1 truncate text-[10.5px] font-medium"
                        style={{ color: active ? C.primary : C.textPrimary }}
                      >
                        {s.name}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 pl-3.5">
                      <span className="truncate text-[9px]" style={{ color: C.textSecondary }}>
                        {s.time}
                      </span>
                      <Badge tone={meta.tone} className="ml-auto">{meta.label}</Badge>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Target đã tải */}
          <div className="mb-1 mt-3 flex items-center gap-1.5 px-1">
            <Icon name="database" size={11} style={{ color: C.textSecondary }} />
            <span
              className="text-[9.5px] font-bold uppercase tracking-wider"
              style={{ color: C.textSecondary }}
            >
              Target đã tải
            </span>
            <Badge tone="neutral" className="ml-auto">{mockTargets.length}</Badge>
          </div>
          <ul className="space-y-0.5">
            {mockTargets.map((t) => {
              const active = t.id === targetId;
              const meta = STATUS_META[t.status];
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setTargetId(t.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex w-full items-center gap-1.5 rounded-lg border px-1.5 py-1 text-left transition-colors ${active ? 'sel' : 'hv-row'}`}
                    style={{ borderColor: active ? alpha(C.primary, 0.45) : 'transparent' }}
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                      style={{ background: alpha(C.primary, 0.12), color: C.primary }}
                    >
                      <Icon
                        name={TARGET_TYPES.find((x) => x.value === t.type)?.icon || 'file'}
                        size={9}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-[10.5px]"
                        style={{ color: active ? C.primary : C.textPrimary }}
                      >
                        {t.name}
                      </span>
                      <span
                        className="block truncate font-mono text-[9px]"
                        style={{ color: C.textSecondary }}
                      >
                        {t.size} · {t.uploadedAt}
                      </span>
                    </span>
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: C[meta.tone] }}
                      title={meta.label}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t p-2.5" style={{ borderColor: C.border }}>
          <Btn variant="outline" size="sm" icon="sparkles" full onClick={onOpenAgent}>
            Mở AI Agent
          </Btn>
        </div>
      </div>

      {/* Bản thu gọn — chỉ icon (md → lg) */}
      <div className="flex flex-col items-center gap-1.5 py-2 lg:hidden">
        <IconBtn icon="plus" label="Tải target mới" onClick={onUpload} size={28} tone="primary" />
        <IconBtn icon="clock" label="Phiên phân tích" size={28} />
        <IconBtn icon="database" label="Target đã tải" size={28} />
        <div className="my-1 h-px w-6" style={{ background: C.border }} />
        <IconBtn icon="sparkles" label="Mở AI Agent" onClick={onOpenAgent} size={28} />
      </div>
    </aside>
  );
}

/* --- 4.5. TOOLBAR VIEW --------------------------------------------------- */
function ViewToolbar({
  zoom,
  setZoom,
  filter,
  setFilter,
  onExport,
  onRefresh,
  layout,
  setLayout,
  filterOptions,
  onNotify,
}) {
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5"
      style={{ background: C.cardBackground, borderColor: C.border }}
    >
      {/* Zoom */}
      <div
        className="flex items-center gap-0.5 rounded-md border px-0.5"
        style={{ borderColor: C.border }}
      >
        <IconBtn icon="zoomOut" label="Thu nhỏ" onClick={() => setZoom(Math.max(50, zoom - 10))} />
        <span className="w-9 text-center font-mono text-[10px]" style={{ color: C.textPrimary }}>
          {zoom}%
        </span>
        <IconBtn icon="zoomIn" label="Phóng to" onClick={() => setZoom(Math.min(200, zoom + 10))} />
      </div>

      {/* Filter */}
      <div className="w-[136px]">
        <Dropdown value={filter} onChange={setFilter} options={filterOptions} icon="filter" width={190} />
      </div>

      {/* Export */}
      <Dropdown
        value=""
        placeholder="Xuất view"
        onChange={(v) => onExport(v)}
        icon="download"
        width={180}
        options={[
          { value: 'pdf',  label: 'PDF',      desc: 'Bố cục in ấn',        icon: 'file' },
          { value: 'html', label: 'HTML',     desc: 'Báo cáo tương tác',   icon: 'code' },
          { value: 'json', label: 'JSON',     desc: 'Đối chiếu bằng script', icon: 'terminal' },
          { value: 'md',   label: 'Markdown', desc: 'Ghi chú học tập',     icon: 'note' },
        ]}
      />

      <IconBtn icon="refresh" label="Làm mới view" onClick={onRefresh} />

      {/* Toggle layout */}
      <div
        className="ml-auto flex items-center gap-0.5 rounded-md border p-0.5"
        style={{ borderColor: C.border }}
      >
        <IconBtn icon="grid" label="Bố cục lưới"    active={layout === 'grid'} onClick={() => setLayout('grid')} />
        <IconBtn icon="list" label="Bố cục danh sách" active={layout === 'list'} onClick={() => setLayout('list')} />
      </div>

      <Tooltip text="Zoom và bố cục được lưu theo từng phiên phân tích.">
        <IconBtn icon="info" label="Thông tin view" onClick={onNotify} />
      </Tooltip>
    </div>
  );
}

/* --- 4.6. VIEW 1: BINARY ------------------------------------------------- */
function BinaryView() {
  const [hexSel, setHexSel] = useState('h2');
  const [ioTab, setIoTab] = useState('imports');
  const [minLen, setMinLen] = useState(4);
  const [q, setQ] = useState('');

  const stringRows = useMemo(
    () =>
      mockStrings.filter(
        (s) => s.length >= minLen && s.value.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [minLen, q],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 lg:grid-cols-3 md:grid-cols-2">
        <Panel
          className="h-[252px]"
          title="Cấu trúc tệp"
          icon="layers"
          subtitle="ELF64"
          actions={<IconBtn icon="copy" label="Sao chép cây cấu trúc" />}
        >
          <Tree nodes={mockBinaryTree} defaultOpen={1} />
        </Panel>
        <Panel
          className="h-[252px]"
          title="Disassembly"
          icon="terminal"
          subtitle=".text"
          actions={<Badge tone="info">x86-64</Badge>}
        >
          <DisassemblyList rows={mockDisassembly} />
        </Panel>
        <Panel
          className="h-[252px]"
          title="Hex view"
          icon="hash"
          subtitle="0x00001000 – 0x00001200"
          actions={<Badge tone="neutral">16 byte/dòng</Badge>}
        >
          <HexView rows={mockHexRows} selected={hexSel} onSelect={setHexSel} />
        </Panel>
      </div>

      <div className="grid gap-2 lg:grid-cols-3 md:grid-cols-2">
        <Panel
          className="h-[236px]"
          title="Strings"
          icon="code"
          subtitle={`${stringRows.length}/${mockStrings.length}`}
          actions={
            <div className="w-[86px]">
              <Dropdown
                value={minLen}
                onChange={(v) => setMinLen(Number(v))}
                width={130}
                options={[
                  { value: 4,  label: '≥ 4 ký tự' },
                  { value: 8,  label: '≥ 8 ký tự' },
                  { value: 12, label: '≥ 12 ký tự' },
                  { value: 16, label: '≥ 16 ký tự' },
                ]}
              />
            </div>
          }
          footer={
            <div className="flex items-center gap-2 text-[9.5px]" style={{ color: C.textSecondary }}>
              <Icon name="info" size={10} />
              <span>ascii: {stringRows.filter((s) => s.type === 'ascii').length}</span>
              <span>unicode: {stringRows.filter((s) => s.type === 'unicode').length}</span>
            </div>
          }
        >
          <div className="mb-1.5">
            <Input icon="search" value={q} onChange={setQ} placeholder="Lọc chuỗi…" />
          </div>
          <DataTable
            rowKey="id"
            rows={stringRows}
            columns={[
              { key: 'offset', label: 'Offset', width: 74, mono: true },
              {
                key: 'type',
                label: 'Loại',
                width: 54,
                render: (r) => <Badge tone={r.type === 'unicode' ? 'info' : 'neutral'}>{r.type}</Badge>,
              },
              { key: 'value', label: 'Giá trị', render: (r) => <span className="font-mono">{r.value}</span> },
            ]}
          />
        </Panel>

        <Panel
          className="h-[236px]"
          title="Imports / Exports"
          icon="link"
          actions={
            <Badge tone="primary">
              {ioTab === 'imports' ? mockImports.length : mockExports.length}
            </Badge>
          }
        >
          <div
            className="mb-1.5 flex gap-0.5 rounded-md border p-0.5"
            style={{ borderColor: C.border }}
          >
            {[
              { id: 'imports', label: 'Imports', count: mockImports.length },
              { id: 'exports', label: 'Exports', count: mockExports.length },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setIoTab(t.id)}
                className={`focus-ring flex-1 rounded px-2 py-[3px] text-[10px] font-semibold transition-colors ${ioTab === t.id ? 'sel' : 'btn-ghost'}`}
                style={{ color: ioTab === t.id ? C.primary : C.textSecondary }}
              >
                {t.label} <span className="opacity-70">({t.count})</span>
              </button>
            ))}
          </div>
          {ioTab === 'imports' ? (
            <DataTable
              rows={mockImports}
              columns={[
                { key: 'library',  label: 'Thư viện', width: 116, mono: true },
                {
                  key: 'function',
                  label: 'Hàm',
                  render: (r) => <span className="font-mono" style={{ color: C.info }}>{r.function}</span>,
                },
              ]}
            />
          ) : (
            <DataTable
              rows={mockExports}
              columns={[
                {
                  key: 'name',
                  label: 'Tên',
                  render: (r) => <span className="font-mono" style={{ color: C.info }}>{r.name}</span>,
                },
                { key: 'address', label: 'Địa chỉ', width: 76, mono: true },
                {
                  key: 'type',
                  label: 'Loại',
                  width: 54,
                  render: (r) => <Badge tone={r.type === 'FUNC' ? 'primary' : 'warn'}>{r.type}</Badge>,
                },
              ]}
            />
          )}
        </Panel>

        <Panel
          className="h-[236px]"
          title="Metadata"
          icon="database"
          subtitle="12 trường"
          actions={<IconBtn icon="copy" label="Sao chép metadata" />}
        >
          <KVList items={mockBinaryMetadata} />
        </Panel>
      </div>

      <Panel
        className="h-[186px]"
        title="Entropy theo offset"
        icon="split"
        subtitle="ngưỡng cảnh báo 7.5"
        actions={<Badge tone="warn" dot>6 vùng vượt ngưỡng</Badge>}
      >
        <EntropyChart
          series={[{ data: mockEntropyData, color: C.primary, label: 'entropy' }]}
          height={118}
        />
      </Panel>
    </div>
  );
}

/* --- 4.7. VIEW 2: PACKED ------------------------------------------------- */
function PackedView({ onNotify }) {
  const [selectedWarn, setSelectedWarn] = useState('w1');

  const packedEntropy = useMemo(
    () => mockEntropyData.map((v, i) => Math.min(8, v + (i > 20 && i < 48 ? 1.1 : 0.2))),
    [],
  );
  const unpackedEntropy = useMemo(() => mockEntropyData.map((v) => Math.max(1.4, v - 0.9)), []);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 lg:grid-cols-2">
        <Panel
          className="h-[226px]"
          title="Thông tin packer"
          icon="package"
          subtitle="GenericProtector"
          actions={<Badge tone="warn" dot>2 lớp bảo vệ</Badge>}
        >
          <KVList items={mockPackerInfo} onCopy={() => onNotify('Đã sao chép giá trị vào clipboard')} />
        </Panel>
        <Panel
          className="h-[226px]"
          title="Cảnh báo"
          icon="warning"
          subtitle={`${mockWarnings.length} mục`}
          actions={<Badge tone="error">{mockWarnings.filter((w) => w.severity === 'error').length} lỗi</Badge>}
        >
          <div className="space-y-1">
            {mockWarnings.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWarn(w.id)}
                className={`flex w-full items-start gap-1.5 rounded-md border px-1.5 py-1 text-left transition-colors ${selectedWarn === w.id ? 'row-sel' : 'hv-row'}`}
                style={{
                  borderColor: selectedWarn === w.id ? alpha(C[w.severity], 0.4) : 'transparent',
                }}
              >
                <Icon
                  name={w.severity === 'error' ? 'alertCircle' : w.severity === 'warn' ? 'warning' : 'info'}
                  size={11}
                  style={{ color: C[w.severity], marginTop: 1 }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10.5px] leading-[1.4]" style={{ color: C.textPrimary }}>
                    {w.message}
                  </span>
                  <span className="block font-mono text-[9px]" style={{ color: C.textSecondary }}>
                    {w.location}
                  </span>
                </span>
                <Badge tone={w.severity}>{w.severity}</Badge>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        {[mockPackedBefore, mockPackedAfter].map((side, idx) => (
          <Panel
            key={side.title}
            className="h-[210px]"
            title={side.title}
            icon={idx === 0 ? 'lock' : 'checkCircle'}
            tone={idx === 0 ? 'error' : 'success'}
            actions={side.diff.map((d) => (
              <Badge key={d.label} tone={d.tone}>{d.label} {d.text}</Badge>
            ))}
          >
            <div className="grid grid-cols-2 gap-x-3">
              {side.rows.map((r) => (
                <div
                  key={r.k}
                  className="flex items-center justify-between border-b py-[3px]"
                  style={{ borderColor: alpha(C.border, 0.5) }}
                >
                  <span className="truncate text-[10px]" style={{ color: C.textSecondary }}>{r.k}</span>
                  <span className="ml-2 shrink-0 font-mono text-[10px]" style={{ color: C.textPrimary }}>
                    {r.v}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <div
                className="mb-1 flex items-center justify-between text-[9.5px]"
                style={{ color: C.textSecondary }}
              >
                <span>Entropy trung bình</span>
                <span className="font-mono">{idx === 0 ? '7.42' : '5.11'} / 8.00</span>
              </div>
              <ProgressBar value={idx === 0 ? 92 : 64} tone={idx === 0 ? 'error' : 'success'} height={5} />
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <Panel
          className="h-[228px]"
          title="Cây sau giải nén"
          icon="folder"
          subtitle="12 tệp · 3 thư mục"
          actions={<Badge tone="info" dot>đang xử lý</Badge>}
          footer={
            <div className="space-y-1">
              <div
                className="flex items-center justify-between text-[9.5px]"
                style={{ color: C.textSecondary }}
              >
                <span>Trích xuất tệp 9/12</span>
                <span className="font-mono">78%</span>
              </div>
              <ProgressBar value={78} tone="info" height={4} animated />
            </div>
          }
        >
          <Tree nodes={mockUnpackedTree} defaultOpen={2} />
        </Panel>
        <Panel
          className="h-[228px]"
          title="So sánh entropy"
          icon="split"
          subtitle="packed vs unpacked"
          actions={
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[9px]" style={{ color: C.textSecondary }}>
                <span className="h-1.5 w-3 rounded-full" style={{ background: C.error }} /> packed
              </span>
              <span className="flex items-center gap-1 text-[9px]" style={{ color: C.textSecondary }}>
                <span className="h-1.5 w-3 rounded-full" style={{ background: C.success }} /> unpacked
              </span>
            </div>
          }
        >
          <EntropyChart
            height={150}
            series={[
              { data: packedEntropy,   color: C.error,   label: 'packed',   fillOpacity: 0.12 },
              { data: unpackedEntropy, color: C.success, label: 'unpacked', fillOpacity: 0.1 },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}

/* --- 4.8. VIEW 3: PYTHON ------------------------------------------------- */
function PythonView() {
  const [selectedNode, setSelectedNode] = useState('py2');

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 lg:grid-cols-3 md:grid-cols-2">
        <Panel
          className="h-[300px]"
          title="Cây tệp"
          icon="folder"
          subtitle="9 module"
          actions={<Badge tone="primary">zipapp</Badge>}
        >
          <Tree
            nodes={mockPythonTree}
            defaultOpen={2}
            selectedId={selectedNode}
            onSelect={(n) => setSelectedNode(n.id)}
          />
        </Panel>
        <Panel
          className="h-[300px]"
          title="Source view"
          icon="fileCode"
          subtitle="main.py"
          actions={
            <div className="flex items-center gap-1">
              <Badge tone="info">UTF-8</Badge>
              <IconBtn icon="copy" label="Sao chép mã nguồn" />
            </div>
          }
        >
          <CodeView lines={mockPythonSource} />
        </Panel>
        <Panel
          className="h-[300px]"
          title="Bytecode"
          icon="terminal"
          subtitle="CPython 3.11"
          actions={<Badge tone="warn">magic 0x0A0D0D6F</Badge>}
        >
          <DataTable
            rows={mockPythonBytecode}
            columns={[
              { key: 'offset', label: 'Offset', width: 54, mono: true },
              {
                key: 'opname',
                label: 'Opcode',
                width: 116,
                render: (r) => <span className="font-mono" style={{ color: C.primary }}>{r.opname}</span>,
              },
              { key: 'arg', label: 'Arg', mono: true },
            ]}
          />
        </Panel>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <Panel
          className="h-[238px]"
          title="Dependencies"
          icon="package"
          subtitle={`${mockDependencies.length} gói`}
          actions={<IconBtn icon="external" label="Mở bảng phụ thuộc đầy đủ" />}
        >
          <DataTable
            rows={mockDependencies}
            columns={[
              {
                key: 'name',
                label: 'Gói',
                width: 92,
                render: (r) => <span className="font-mono" style={{ color: C.info }}>{r.name}</span>,
              },
              { key: 'version', label: 'Phiên bản', width: 68, mono: true },
              {
                key: 'license',
                label: 'Giấy phép',
                width: 82,
                render: (r) => (
                  <Badge tone={r.license === 'MIT' ? 'success' : r.license === 'Apache-2.0' ? 'info' : 'neutral'}>
                    {r.license}
                  </Badge>
                ),
              },
            ]}
          />
        </Panel>
        <Panel
          className="h-[238px]"
          title="Metadata gói"
          icon="database"
          subtitle="10 trường"
          actions={<Badge tone="warn">thiếu chữ ký</Badge>}
        >
          <KVList items={mockPythonMetadata} />
        </Panel>
      </div>
    </div>
  );
}

/* --- 4.9. VIEW 4: MOBILE ------------------------------------------------- */
function MobileView({ onNotify }) {
  const [permFilter, setPermFilter] = useState('all');
  const perms = useMemo(
    () => (permFilter === 'all' ? mockPermissions : mockPermissions.filter((p) => p.level === permFilter)),
    [permFilter],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 lg:grid-cols-2">
        <Panel
          className="h-[290px]"
          title="Cấu trúc gói"
          icon="smartphone"
          subtitle="sample_app.apk"
          actions={<Badge tone="success" dot>APK hợp lệ</Badge>}
        >
          <Tree nodes={mockMobileTree} defaultOpen={1} />
        </Panel>
        <Panel
          className="h-[290px]"
          title="Manifest"
          icon="code"
          subtitle="AndroidManifest.xml"
          actions={
            <div className="flex items-center gap-1">
              <Badge tone="info">v2+v3</Badge>
              <IconBtn
                icon="copy"
                label="Sao chép manifest"
                onClick={() => onNotify('Đã sao chép manifest dạng JSON')}
              />
            </div>
          }
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 font-mono text-[10px]" style={{ color: C.textSecondary }}>
              <Icon name="file" size={10} /> {'{'}
            </div>
            {Object.entries(mockManifest).map(([k, v]) => (
              <JsonNode key={k} label={k} value={v} depth={1} />
            ))}
            <div className="font-mono text-[10px]" style={{ color: C.textSecondary }}>{'}'}</div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-2 xl:grid-cols-3 lg:grid-cols-2">
        <Panel
          className="h-[262px]"
          title="Resources"
          icon="grid"
          subtitle={`${mockResources.length} mục`}
          actions={<IconBtn icon="filter" label="Lọc tài nguyên" />}
        >
          <div className="mb-2 grid grid-cols-6 gap-1">
            {mockResources.slice(0, 12).map((r) => (
              <div
                key={`th-${r.id}`}
                className="flex aspect-square items-center justify-center rounded-md border"
                style={{
                  background: alpha(C.primary, 0.08),
                  borderColor: alpha(C.border, 0.9),
                  color: C.textSecondary,
                }}
                title={`${r.name} · ${r.size}`}
              >
                <Icon name={r.type === 'font' ? 'code' : r.type === 'raw' ? 'file' : 'grid'} size={11} />
              </div>
            ))}
          </div>
          <DataTable
            rows={mockResources}
            columns={[
              { key: 'name', label: 'Tên', mono: true },
              {
                key: 'type',
                label: 'Loại',
                width: 60,
                render: (r) => <Badge tone="neutral">{r.type}</Badge>,
              },
              { key: 'size', label: 'K.thước', width: 52, align: 'right', mono: true },
            ]}
          />
        </Panel>
        <Panel
          className="h-[262px]"
          title="Native libs"
          icon="cpu"
          subtitle={`${mockNativeLibs.length} tệp`}
          actions={<Badge tone="info">3 ABI</Badge>}
        >
          <DataTable
            rows={mockNativeLibs}
            columns={[
              { key: 'name',   label: 'Thư viện', mono: true },
              { key: 'arch',   label: 'ABI',      width: 82, mono: true },
              { key: 'size',   label: 'K.thước',  width: 54, align: 'right', mono: true },
              {
                key: 'stripped',
                label: 'Stripped',
                width: 58,
                align: 'center',
                render: (r) => <Badge tone={r.stripped === 'Có' ? 'success' : 'warn'}>{r.stripped}</Badge>,
              },
            ]}
          />
        </Panel>
        <Panel
          className="h-[262px]"
          title="Permissions"
          icon="shield"
          subtitle={`${perms.length}/${mockPermissions.length}`}
          actions={
            <div className="w-[92px]">
              <Dropdown
                value={permFilter}
                onChange={setPermFilter}
                width={150}
                options={[
                  { value: 'all',    label: 'Tất cả mức' },
                  { value: 'danger', label: 'Danger' },
                  { value: 'warn',   label: 'Warn' },
                  { value: 'normal', label: 'Normal' },
                ]}
              />
            </div>
          }
        >
          <div className="space-y-0.5">
            {perms.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 rounded px-1 py-[2px] hv-row">
                <Icon
                  name={p.level === 'danger' ? 'alertCircle' : p.level === 'warn' ? 'warning' : 'checkCircle'}
                  size={10}
                  style={{
                    color: p.level === 'danger' ? C.error : p.level === 'warn' ? C.warn : C.success,
                  }}
                />
                <span
                  className="min-w-0 flex-1 truncate font-mono text-[10px]"
                  style={{ color: C.textPrimary }}
                  title={p.name}
                >
                  {p.name}
                </span>
                <Badge tone={p.level === 'danger' ? 'error' : p.level === 'warn' ? 'warn' : 'success'}>
                  {p.level}
                </Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* --- 4.10. VIEW 5: FIRMWARE --------------------------------------------- */
function FirmwareView() {
  const [q, setQ] = useState('');
  const strings = useMemo(
    () => mockFirmwareStrings.filter((s) => s.value.toLowerCase().includes(q.trim().toLowerCase())),
    [q],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 lg:grid-cols-2">
        <Panel
          className="h-[286px]"
          title="Cây filesystem"
          icon="folder"
          subtitle="rootfs"
          actions={<Badge tone="success" dot>squashfs</Badge>}
        >
          <Tree nodes={mockFirmwareTree} defaultOpen={1} />
        </Panel>
        <Panel
          className="h-[286px]"
          title="Bảng phân vùng"
          icon="database"
          subtitle={`${mockPartitions.length} phân vùng`}
          actions={<Badge tone="warn">3 phân vùng RW</Badge>}
        >
          <DataTable
            rows={mockPartitions}
            columns={[
              {
                key: 'name',
                label: 'Tên',
                width: 76,
                render: (r) => <span className="font-mono" style={{ color: C.info }}>{r.name}</span>,
              },
              { key: 'offset', label: 'Offset',   width: 78, mono: true },
              { key: 'size',   label: 'K.thước',  width: 78, mono: true },
              { key: 'type',   label: 'Định dạng', width: 68, mono: true },
              {
                key: 'flags',
                label: 'Flags',
                width: 46,
                align: 'center',
                render: (r) => (
                  <Badge tone={r.flags === 'RW' ? 'warn' : r.flags === 'RO' ? 'success' : 'neutral'}>
                    {r.flags}
                  </Badge>
                ),
              },
            ]}
          />
        </Panel>
      </div>

      <div className="grid gap-2 xl:grid-cols-3 lg:grid-cols-2">
        <Panel
          className="h-[252px]"
          title="Thông tin kiến trúc"
          icon="cpu"
          subtitle="ARMv7-A"
        >
          <KVList items={mockArchitecture} />
        </Panel>
        <Panel
          className="h-[252px]"
          title="Strings"
          icon="code"
          subtitle={`${strings.length}/${mockFirmwareStrings.length}`}
          actions={<IconBtn icon="copy" label="Sao chép danh sách chuỗi" />}
        >
          <div className="mb-1.5">
            <Input icon="search" value={q} onChange={setQ} placeholder="Lọc chuỗi firmware…" />
          </div>
          <div className="space-y-[1px] font-mono text-[10px]">
            {strings.map((s) => (
              <div key={s.id} className="flex gap-2 rounded px-1 hv-row">
                <span className="w-[68px] shrink-0" style={{ color: C.textSecondary }}>{s.offset}</span>
                <span className="truncate" style={{ color: C.success }}>{s.value}</span>
              </div>
            ))}
            {strings.length === 0 && (
              <p className="py-4 text-center text-[10.5px]" style={{ color: C.textSecondary }}>
                Không có chuỗi phù hợp
              </p>
            )}
          </div>
        </Panel>
        <Panel
          className="h-[252px]"
          title="Giao thức"
          icon="wifi"
          subtitle={`${mockProtocols.length} cổng`}
          actions={
            <Badge tone="error">
              {mockProtocols.filter((p) => !p.encrypted).length} không mã hoá
            </Badge>
          }
        >
          <div className="space-y-0.5">
            {mockProtocols.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 rounded px-1 py-[2px] hv-row">
                <Icon
                  name={p.encrypted ? 'lock' : 'wifi'}
                  size={10}
                  style={{ color: p.encrypted ? C.success : C.warn }}
                />
                <span className="min-w-0 flex-1 truncate text-[10.5px]" style={{ color: C.textPrimary }}>
                  {p.name}
                </span>
                <span className="font-mono text-[9.5px]" style={{ color: C.textSecondary }}>
                  :{p.port}
                </span>
                <Badge tone={p.encrypted ? 'success' : 'warn'}>
                  {p.encrypted ? 'TLS' : 'plain'}
                </Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* --- 4.11. RIGHT PANEL --------------------------------------------------- */
const CANNED_REPLIES = [
  'Đã ghi nhận. Tôi đã lập chỉ mục thêm 12 mục trong cấu trúc hiện tại và cập nhật panel bên trái.',
  'Dựa trên dữ liệu tĩnh hiện có, tôi đề xuất đối chiếu bảng imports với các chuỗi trong .rodata trước.',
  'Tôi đã tạo một ghi chú nháp cho nội dung này. Bạn có thể chỉnh sửa trong tab Ghi chú.',
  'Vùng dữ liệu này nằm ngoài phạm vi đã lập chỉ mục. Bạn có muốn tôi phân tích thêm phần overlay không?',
];

function RightPanel({ tab, setTab, onNotify }) {
  const [messages, setMessages] = useState(mockChatHistory);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(true);
  const [notes, setNotes] = useState(mockNotes);
  const [noteDraft, setNoteDraft] = useState('');
  const scrollRef = useRef(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setMessages((m) => [...m, { id: `c-${Date.now()}`, role: 'user', content: text, time: hhmm }]);
    setDraft('');
    setThinking(true);
    const t = setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: `c-${Date.now()}-r`,
          role: 'ai',
          content: CANNED_REPLIES[m.length % CANNED_REPLIES.length],
          time: hhmm,
        },
      ]);
      setThinking(false);
    }, 1500);
    timers.current.push(t);
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [draft]);

  const addNote = useCallback(() => {
    const text = noteDraft.trim();
    if (!text) return;
    setNotes((n) => [{ id: `nt-${Date.now()}`, content: text, time: 'vừa xong' }, ...n]);
    setNoteDraft('');
    onNotify('Đã thêm ghi chú vào phiên hiện tại');
  }, [noteDraft, onNotify]);

  const tabs = [
    { id: 'agent',   label: 'AI Agent', icon: 'sparkles' },
    { id: 'suggest', label: 'Gợi ý',    icon: 'play' },
    { id: 'notes',   label: 'Ghi chú',  icon: 'note' },
  ];

  return (
    <aside
      className="flex min-h-0 flex-col border-l"
      style={{ background: C.panelBackground, borderColor: C.border }}
    >
      {/* Tab bar */}
      <div
        className="flex shrink-0 items-center gap-0.5 border-b px-1.5"
        style={{ borderColor: C.border }}
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-selected={active}
              className="focus-ring relative flex items-center gap-1 px-2 py-2 text-[11px] font-semibold transition-colors"
              style={{ color: active ? C.primary : C.textSecondary }}
            >
              <Icon name={t.icon} size={11} />
              {t.label}
              {active && (
                <span
                  className="absolute inset-x-1 -bottom-px h-[2px] rounded-full"
                  style={{ background: C.primary }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB: AI AGENT */}
      {tab === 'agent' && (
        <>
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto scroll-thin p-2.5"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-1.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[8.5px] font-bold"
                  style={{
                    background: m.role === 'ai' ? alpha(C.primary, 0.18) : alpha(C.info, 0.14),
                    borderColor: m.role === 'ai' ? alpha(C.primary, 0.35) : alpha(C.info, 0.3),
                    color: m.role === 'ai' ? C.primary : C.info,
                  }}
                >
                  {m.role === 'ai' ? 'AI' : 'NA'}
                </span>
                <div
                  className={`max-w-[86%] rounded-xl border px-2 py-1.5 text-[11px] leading-[1.5] ${m.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                  style={{
                    background: m.role === 'user' ? alpha(C.primary, 0.12) : C.cardBackground,
                    borderColor: m.role === 'user' ? alpha(C.primary, 0.28) : C.border,
                    color: C.textPrimary,
                  }}
                >
                  {m.content}
                  <span
                    className="mt-1 block text-right font-mono text-[8.5px]"
                    style={{ color: C.textSecondary }}
                  >
                    {m.time}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* AI đang xử lý */}
          {thinking && (
            <div
              className="mx-2.5 mb-1.5 shrink-0 rounded-lg border p-2"
              style={{ background: alpha(C.primary, 0.07), borderColor: alpha(C.primary, 0.3) }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="ui-spin h-3 w-3 shrink-0 rounded-full border-2 border-transparent"
                  style={{ borderTopColor: C.primary, borderRightColor: alpha(C.primary, 0.5) }}
                />
                <span
                  className="min-w-0 flex-1 truncate text-[10.5px]"
                  style={{ color: C.textPrimary }}
                >
                  Đang phân tích cấu trúc section
                  <span className="ui-dot" style={{ animationDelay: '0s' }}>.</span>
                  <span className="ui-dot" style={{ animationDelay: '.15s' }}>.</span>
                  <span className="ui-dot" style={{ animationDelay: '.3s' }}>.</span>
                </span>
                <Btn
                  size="xs"
                  variant="dangerGhost"
                  icon="stop"
                  onClick={() => {
                    setThinking(false);
                    onNotify('Đã huỷ yêu cầu phân tích');
                  }}
                >
                  Hủy
                </Btn>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <ProgressBar value={64} tone="primary" height={3} animated />
                <span className="shrink-0 font-mono text-[8.5px]" style={{ color: C.textSecondary }}>
                  4,120 tok
                </span>
              </div>
            </div>
          )}

          {/* Ô nhập */}
          <div className="shrink-0 border-t p-2" style={{ borderColor: C.border }}>
            <div className="mb-1.5 flex gap-1 overflow-x-auto scroll-thin">
              {['Tóm tắt cấu trúc', 'Vùng entropy cao', 'Gợi ý bước tiếp'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setDraft(chip)}
                  className="btn btn-outline focus-ring shrink-0 rounded-full border px-2 py-[2px] text-[9.5px] transition-colors"
                  style={{ color: C.textSecondary, borderColor: C.border }}
                >
                  {chip}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-1.5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                placeholder="Hỏi AI Agent về cấu trúc tệp…"
                aria-label="Nhập câu hỏi cho AI Agent"
                className="focus-ring min-w-0 flex-1 resize-none rounded-lg border px-2 py-1.5 text-[11px] leading-[1.45] outline-none"
                style={{ background: C.inputBackground, borderColor: C.border, color: C.textPrimary }}
              />
              <Btn variant="primary" size="md" icon="send" onClick={send} disabled={!draft.trim()}>
                Gửi
              </Btn>
            </div>
            <p className="mt-1 text-[9px]" style={{ color: C.textSecondary }}>
              AI Agent chỉ đọc dữ liệu phân tích tĩnh trong phiên hiện tại.
            </p>
          </div>
        </>
      )}

      {/* TAB: GỢI Ý */}
      {tab === 'suggest' && (
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto scroll-thin p-2.5">
          <div className="mb-1 flex items-center justify-between">
            <span
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: C.textSecondary }}
            >
              {mockSuggestions.length} gợi ý từ AI
            </span>
            <Badge tone="info">dựa trên 4,120 tok</Badge>
          </div>
          {mockSuggestions.map((s) => (
            <div
              key={s.id}
              className="group rounded-lg border p-2 transition-colors hv-card"
              style={{ background: C.cardBackground, borderColor: C.border }}
            >
              <div className="flex items-start gap-1.5">
                <Icon name="sparkles" size={11} style={{ color: C.primary, marginTop: 1 }} />
                <p
                  className="min-w-0 flex-1 text-[11px] font-semibold leading-[1.35]"
                  style={{ color: C.textPrimary }}
                >
                  {s.title}
                </p>
                <Badge tone="neutral">{s.category}</Badge>
              </div>
              <p
                className="mt-1 pl-4 text-[10px] leading-[1.45]"
                style={{ color: C.textSecondary }}
              >
                {s.desc}
              </p>
              <div className="mt-1.5 flex items-center gap-2 pl-4">
                <div className="min-w-0 flex-1">
                  <ProgressBar
                    value={s.confidence}
                    tone={s.confidence > 80 ? 'success' : s.confidence > 60 ? 'primary' : 'warn'}
                    height={3}
                  />
                </div>
                <span className="shrink-0 font-mono text-[9px]" style={{ color: C.textSecondary }}>
                  {s.confidence}%
                </span>
                <Btn
                  size="xs"
                  variant="ghost"
                  icon="arrowRight"
                  onClick={() => onNotify(`Đã áp dụng gợi ý: ${s.title}`)}
                >
                  Áp dụng
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: GHI CHÚ */}
      {tab === 'notes' && (
        <>
          <div className="shrink-0 border-b p-2" style={{ borderColor: C.border }}>
            <TextArea
              value={noteDraft}
              onChange={setNoteDraft}
              rows={2}
              placeholder="Soạn ghi chú cho phiên phân tích…"
            />
            <div className="mt-1.5 flex items-center gap-1.5">
              <Btn
                size="xs"
                variant="primary"
                icon="save"
                onClick={addNote}
                disabled={!noteDraft.trim()}
              >
                Lưu ghi chú
              </Btn>
              <Btn size="xs" variant="ghost" icon="x" onClick={() => setNoteDraft('')}>
                Xoá nháp
              </Btn>
              <span className="ml-auto text-[9px]" style={{ color: C.textSecondary }}>
                {notes.length} ghi chú
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto scroll-thin p-2.5">
            {notes.map((n) => (
              <div
                key={n.id}
                className="rounded-lg border p-2 hv-card"
                style={{ background: C.cardBackground, borderColor: C.border }}
              >
                <p className="text-[11px] leading-[1.5]" style={{ color: C.textPrimary }}>
                  {n.content}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <Icon name="clock" size={9} style={{ color: C.textSecondary }} />
                  <span className="font-mono text-[9px]" style={{ color: C.textSecondary }}>
                    {n.time}
                  </span>
                  <button
                    type="button"
                    aria-label="Xoá ghi chú"
                    onClick={() => {
                      setNotes((x) => x.filter((i) => i.id !== n.id));
                      onNotify('Đã xoá ghi chú');
                    }}
                    className="btn btn-ghost focus-ring ml-auto rounded p-0.5 opacity-0 transition-opacity hover:opacity-100"
                    style={{ color: C.textSecondary }}
                  >
                    <Icon name="trash" size={10} />
                  </button>
                </div>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="py-6 text-center text-[10.5px]" style={{ color: C.textSecondary }}>
                Chưa có ghi chú nào trong phiên này.
              </p>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

/* --- 4.12. STATUS BAR ---------------------------------------------------- */
function StatusBar({ targetType }) {
  const [progress, setProgress] = useState(72);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const p = setInterval(() => setProgress((v) => (v >= 96 ? 42 : v + 1)), 2400);
    const m = setInterval(() => setMsgIndex((v) => (v + 1) % mockStatusMessages.length), 5200);
    return () => {
      clearInterval(p);
      clearInterval(m);
    };
  }, []);

  const targetLabel = TARGET_TYPES.find((t) => t.value === targetType)?.full || '';

  return (
    <footer
      className="flex h-8 shrink-0 items-center gap-3 border-t px-3"
      style={{ background: C.panelBackground, borderColor: C.border }}
    >
      {/* Trạng thái */}
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="ui-pulse h-1.5 w-1.5 rounded-full" style={{ background: C.success }} />
        <span className="text-[10px] font-semibold" style={{ color: C.textPrimary }}>
          Sẵn sàng
        </span>
        <span className="h-3 w-px" style={{ background: C.border }} />
        <span className="hidden text-[10px] md:inline" style={{ color: C.textSecondary }}>
          {targetLabel}
        </span>
      </div>

      {/* Tiến trình */}
      <div className="flex min-w-0 max-w-[220px] flex-1 items-center gap-1.5">
        <ProgressBar value={progress} tone="primary" height={4} />
        <span className="shrink-0 font-mono text-[9px]" style={{ color: C.textSecondary }}>
          {progress}%
        </span>
      </div>

      {/* Log ngắn */}
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-hidden">
        <Icon name="terminal" size={10} style={{ color: C.textSecondary }} />
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <span
            className="ui-marquee whitespace-nowrap text-[10px]"
            style={{ color: C.textSecondary }}
          >
            {mockStatusMessages[msgIndex]}
            {'   ·   '}
            {mockStatusMessages[(msgIndex + 1) % mockStatusMessages.length]}
            {'   ·   '}
            {mockStatusMessages[msgIndex]}
            {'   ·   '}
            {mockStatusMessages[(msgIndex + 1) % mockStatusMessages.length]}
          </span>
        </div>
      </div>

      <span className="hidden shrink-0 font-mono text-[9px] lg:inline" style={{ color: C.textSecondary }}>
        09:24 ICT
      </span>
    </footer>
  );
}

/* --- 4.13. KHUNG WORKSPACE ---------------------------------------------- */
function Workspace({
  targetType,
  setTargetType,
  layout,
  setLayout,
  zoom,
  setZoom,
  search,
  onNotify,
  onUpload,
}) {
  const [filter, setFilter] = useState('all');
  const active = TARGET_TYPES.find((t) => t.value === targetType);

  const filterOptions = useMemo(() => {
    const base = [{ value: 'all', label: 'Tất cả nội dung', icon: 'layers' }];
    const map = {
      binary: [
        { value: 'exec',        label: 'Section thực thi', icon: 'code' },
        { value: 'data',        label: 'Section dữ liệu',  icon: 'database' },
        { value: 'high-entropy', label: 'Entropy cao',     icon: 'split' },
      ],
      packed: [
        { value: 'warn', label: 'Chỉ cảnh báo', icon: 'warning' },
        { value: 'diff', label: 'Có khác biệt', icon: 'split' },
      ],
      python: [
        { value: 'py',  label: 'Tệp .py',      icon: 'fileCode' },
        { value: 'pyc', label: 'Tệp .pyc',     icon: 'terminal' },
        { value: 'so',  label: 'Native ext.',  icon: 'cpu' },
      ],
      mobile: [
        { value: 'danger', label: 'Quyền nguy hiểm', icon: 'shield' },
        { value: 'lib',    label: 'Native libs',      icon: 'cpu' },
      ],
      firmware: [
        { value: 'rw',    label: 'Phân vùng RW',     icon: 'database' },
        { value: 'plain', label: 'Giao thức plain', icon: 'wifi' },
      ],
    };
    return [...base, ...(map[targetType] || [])];
  }, [targetType]);

  const targetName = mockTargets.find((t) => t.type === targetType)?.name || 'sample.bin';

  return (
    <main className="flex min-h-0 min-w-0 flex-col" style={{ background: C.background }}>
      {/* Tab chọn loại target */}
      <div
        className="flex shrink-0 items-center gap-0.5 overflow-x-auto scroll-thin border-b px-2"
        style={{ borderColor: C.border, background: C.panelBackground }}
      >
        {TARGET_TYPES.map((t, i) => {
          const isActive = t.value === targetType;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTargetType(t.value)}
              aria-selected={isActive}
              role="tab"
              className="focus-ring relative flex shrink-0 items-center gap-1.5 px-2.5 py-2 text-[11px] font-semibold transition-colors"
              style={{ color: isActive ? C.primary : C.textSecondary }}
            >
              <span
                className="flex h-4 w-4 items-center justify-center rounded text-[8.5px] font-bold"
                style={{
                  background: isActive ? alpha(C.primary, 0.18) : alpha(C.textSecondary, 0.12),
                  color: isActive ? C.primary : C.textSecondary,
                }}
              >
                {i + 1}
              </span>
              <Icon name={t.icon} size={11} />
              <span className="hidden sm:inline">{t.label}</span>
              {isActive && (
                <span
                  className="absolute inset-x-1.5 bottom-0 h-[2px] rounded-t-full"
                  style={{ background: C.primary }}
                />
              )}
            </button>
          );
        })}
        <div className="ml-auto hidden shrink-0 items-center gap-1.5 pr-1 md:flex">
          <Badge tone="neutral">
            {mockTargets.filter((t) => t.type === targetType).length} target
          </Badge>
          <IconBtn icon="plus" label="Tải target mới" onClick={onUpload} />
        </div>
      </div>

      {/* Breadcrumb */}
      <div
        className="flex shrink-0 items-center gap-1 overflow-x-auto scroll-thin border-b px-3 py-1.5"
        style={{ borderColor: alpha(C.border, 0.7) }}
      >
        <Icon name="clock" size={10} style={{ color: C.textSecondary }} />
        <span className="whitespace-nowrap text-[10px]" style={{ color: C.textSecondary }}>
          Phiên RE-2024-118
        </span>
        <Icon name="chevronRight" size={9} style={{ color: C.textSecondary }} />
        <span
          className="truncate whitespace-nowrap text-[10px] font-medium"
          style={{ color: C.textPrimary }}
        >
          {targetName}
        </span>
        <Icon name="chevronRight" size={9} style={{ color: C.textSecondary }} />
        <span className="whitespace-nowrap text-[10px]" style={{ color: C.primary }}>
          {active?.full}
        </span>
        <Tooltip text="Sao chép đường dẫn ngữ cảnh hiện tại">
          <IconBtn
            icon="copy"
            label="Sao chép đường dẫn"
            onClick={() => onNotify('Đã sao chép đường dẫn ngữ cảnh')}
          />
        </Tooltip>
        <div className="ml-auto hidden shrink-0 items-center gap-1.5 sm:flex">
          <Badge tone="success" dot>phân tích tĩnh</Badge>
          <Badge tone="info">24 giây</Badge>
        </div>
      </div>

      {/* Toolbar + nội dung */}
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin p-2">
        <div className="mb-2">
          <ViewToolbar
            zoom={zoom}
            setZoom={setZoom}
            filter={filter}
            setFilter={setFilter}
            filterOptions={filterOptions}
            layout={layout}
            setLayout={setLayout}
            onExport={(fmt) => onNotify(`Đang chuẩn bị xuất view dạng ${fmt.toUpperCase()}…`)}
            onRefresh={() => onNotify('Đã làm mới view phân tích')}
            onNotify={() => onNotify('Zoom và bố cục được lưu theo từng phiên')}
          />
        </div>
        <div className={layout === 'list' ? 'max-w-[1040px]' : ''}>
          {targetType === 'binary'   && <BinaryView />}
          {targetType === 'packed'   && <PackedView onNotify={onNotify} />}
          {targetType === 'python'   && <PythonView />}
          {targetType === 'mobile'   && <MobileView onNotify={onNotify} />}
          {targetType === 'firmware' && <FirmwareView />}
        </div>

        {/* Dòng thông tin dưới cùng của workspace */}
        <div
          className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1.5"
          style={{ background: C.cardBackground, borderColor: C.border }}
        >
          <Icon name="info" size={11} style={{ color: C.info }} />
          <span className="min-w-0 flex-1 text-[10px]" style={{ color: C.textSecondary }}>
            {search.trim()
              ? `Đang lọc theo từ khoá “${search}” trong view ${active?.label}.`
              : 'Dữ liệu hiển thị là cấu trúc tĩnh phục vụ nghiên cứu và đào tạo an toàn thông tin.'}
          </span>
          <Badge tone="neutral">layout: {layout}</Badge>
          <Badge tone="primary">zoom: {zoom}%</Badge>
        </div>
      </div>
    </main>
  );
}

/* --- 4.14. MODAL SHOWCASE ------------------------------------------------ */

/**
 * Khung modal tái sử dụng — header + body + footer.
 * Render inline (không fixed overlay) để phù hợp với fakeUI showcase.
 */
function ModalShell({ title, subtitle, icon, tone = 'primary', badge, onClose, children, footer }) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={title}
      className="flex max-h-[560px] flex-col overflow-hidden rounded-xl border"
      style={{
        background: C.modalBackground,
        borderColor: C.border,
        boxShadow: '0 12px 40px rgba(0,0,0,.45)',
      }}
    >
      <header
        className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5"
        style={{ borderColor: C.border }}
      >
        {icon && (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: alpha(C[tone], 0.16), color: C[tone] }}
          >
            <Icon name={icon} size={12} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[12px] font-bold" style={{ color: C.textPrimary }}>
            {title}
          </h3>
          {subtitle && (
            <p className="truncate text-[10px]" style={{ color: C.textSecondary }}>{subtitle}</p>
          )}
        </div>
        {badge}
        <IconBtn icon="x" label="Đóng modal" onClick={onClose} />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin p-3">{children}</div>
      {footer && (
        <footer
          className="flex shrink-0 items-center justify-end gap-1.5 border-t px-3 py-2"
          style={{ borderColor: C.border, background: C.tableFooterBackground }}
        >
          {footer}
        </footer>
      )}
    </div>
  );
}

/** Modal 1: Tải target mới — dropzone + list file đã chọn. */
function ModalUpload({ onNotify }) {
  const [type, setType] = useState('binary');
  const [files, setFiles] = useState([{ id: 'f1', name: 'libnative.so', size: '1.84 MB', type: 'binary' }]);
  const [drag, setDrag] = useState(false);

  const simulatePick = () => {
    const demo = mockTargets[files.length % mockTargets.length];
    const next = { id: `f-${Date.now()}`, name: demo.name, size: demo.size, type: demo.type };
    setFiles((x) => [...x, next]);
    onNotify && onNotify(`Đã thêm tệp ảo: ${next.name}`, 'success');
  };

  return (
    <ModalShell
      title="Tải target mới"
      subtitle="Phân tích tĩnh · dữ liệu không rời khỏi môi trường lab"
      icon="upload"
      tone="primary"
      badge={<Badge tone="info">tĩnh</Badge>}
      onClose={() => onNotify && onNotify('Đóng modal tải lên', 'info')}
      footer={
        <>
          <Btn size="sm" variant="ghost" onClick={() => onNotify && onNotify('Đã huỷ tải target', 'info')}>
            Hủy
          </Btn>
          <Btn
            size="sm"
            variant="primary"
            icon="upload"
            onClick={() => onNotify && onNotify(`Đã xếp hàng ${files.length} target để phân tích`, 'success')}
          >
            Tải lên
          </Btn>
        </>
      }
    >
      <div className="space-y-2.5">
        <div>
          <label className="mb-1 block text-[10.5px] font-semibold" style={{ color: C.textSecondary }}>
            Loại target
          </label>
          <Dropdown
            value={type}
            onChange={setType}
            width={220}
            icon="cpu"
            options={TARGET_TYPES.map((t) => ({ value: t.value, label: t.full, icon: t.icon }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-[10.5px] font-semibold" style={{ color: C.textSecondary }}>
            Tệp cần tải
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); simulatePick(); }}
            onMouseEnter={() => setDrag(true)}
            onMouseLeave={() => setDrag(false)}
            className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed py-5 text-center transition-colors"
            style={{
              borderColor: drag ? C.primary : alpha(C.border, 0.9),
              background: drag ? alpha(C.primary, 0.06) : 'transparent',
            }}
          >
            <Icon name="upload" size={18} style={{ color: drag ? C.primary : C.textSecondary }} />
            <p className="text-[11px]" style={{ color: C.textPrimary }}>Kéo & thả tệp vào đây</p>
            <p className="text-[9.5px]" style={{ color: C.textSecondary }}>
              Hỗ trợ .elf, .dll, .so, .apk, .zip, .bin · tối đa 200 MB
            </p>
            <Btn size="xs" variant="outline" icon="folder" onClick={simulatePick} className="mt-1">
              Chọn từ máy
            </Btn>
          </div>
        </div>

        {files.length > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10.5px] font-semibold" style={{ color: C.textSecondary }}>
                Đã chọn {files.length} tệp
              </span>
              <button
                type="button"
                onClick={() => setFiles([])}
                className="btn btn-ghost focus-ring rounded px-1.5 py-[1px] text-[9.5px]"
                style={{ color: C.textSecondary }}
              >
                Bỏ chọn tất cả
              </button>
            </div>
            <ul className="space-y-1">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-1.5 rounded-md border px-1.5 py-1"
                  style={{ borderColor: C.border, background: C.cardBackground }}
                >
                  <Icon name="file" size={11} style={{ color: C.info }} />
                  <span className="min-w-0 flex-1 truncate text-[10.5px]" style={{ color: C.textPrimary }}>
                    {f.name}
                  </span>
                  <span className="shrink-0 font-mono text-[9.5px]" style={{ color: C.textSecondary }}>
                    {f.size}
                  </span>
                  <Badge tone="neutral">{TARGET_TYPES.find((x) => x.value === f.type)?.label}</Badge>
                  <IconBtn
                    icon="x"
                    label={`Xoá ${f.name}`}
                    onClick={() => setFiles((x) => x.filter((i) => i.id !== f.id))}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        <p
          className="rounded-md border px-2 py-1.5 text-[9.5px] leading-[1.5]"
          style={{
            borderColor: alpha(C.info, 0.3),
            background: alpha(C.info, 0.06),
            color: C.textSecondary,
          }}
        >
          Mọi tệp chỉ được phân tích tĩnh cục bộ. Không có dữ liệu nào rời khỏi phiên làm việc.
        </p>
      </div>
    </ModalShell>
  );
}

/** Modal 2: Cấu hình AI Agent. */
function ModalAIConfig({ onNotify }) {
  const [model, setModel] = useState('sonnet-5.5');
  const [temp, setTemp] = useState(0.7);
  const [ctx, setCtx] = useState(
    'Tập trung vào cấu trúc section, entropy và bảng import. Ghi chú bằng tiếng Việt.',
  );
  const [perms, setPerms] = useState({ read: true, suggest: true, notes: true, export: false });
  const toggle = (k) => setPerms((p) => ({ ...p, [k]: !p[k] }));

  return (
    <ModalShell
      title="Cấu hình AI Agent"
      subtitle="Điều chỉnh hành vi phân tích trong phiên hiện tại"
      icon="settings"
      tone="primary"
      badge={<Badge tone="success" dot>đang hoạt động</Badge>}
      onClose={() => onNotify && onNotify('Đã đóng cấu hình AI Agent', 'info')}
      footer={
        <>
          <Btn size="sm" variant="ghost" onClick={() => onNotify && onNotify('Đã huỷ thay đổi', 'info')}>
            Hủy
          </Btn>
          <Btn
            size="sm"
            variant="primary"
            icon="save"
            onClick={() => onNotify && onNotify(`Đã lưu cấu hình · model ${model}`, 'success')}
          >
            Lưu
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[10.5px] font-semibold" style={{ color: C.textSecondary }}>
            Model
          </label>
          <Dropdown
            value={model}
            onChange={setModel}
            width={230}
            icon="sparkles"
            options={[
              { value: 'sonnet-5.5',     label: 'Claude Sonnet 5.5',           desc: 'cân bằng · 4k ngữ cảnh' },
              { value: 'sonnet-5.5-ext', label: 'Claude Sonnet 5.5 · extended', desc: 'phân tích sâu hơn' },
              { value: 'local-guard',    label: 'Local guard model',           desc: 'chỉ đọc · offline' },
            ]}
          />
        </div>

        <Slider label="Nhiệt độ phản hồi" value={temp} onChange={setTemp} min={0} max={2} step={0.1} />

        <div>
          <label className="mb-1 block text-[10.5px] font-semibold" style={{ color: C.textSecondary }}>
            Ngữ cảnh bổ sung
          </label>
          <TextArea
            value={ctx}
            onChange={setCtx}
            rows={3}
            placeholder="Mô tả bối cảnh phân tích, thuật ngữ ưa dùng…"
          />
          <p className="mt-1 flex items-center gap-1 text-[9.5px]" style={{ color: C.textSecondary }}>
            <Icon name="info" size={10} /> Ngữ cảnh được tính vào hạn mức token của phiên (hiện ~4,120 tok đã dùng).
          </p>
        </div>

        <fieldset>
          <legend className="mb-1 block text-[10.5px] font-semibold" style={{ color: C.textSecondary }}>
            Quyền truy cập
          </legend>
          <div className="space-y-0.5">
            <Checkbox checked={perms.read}    onChange={() => toggle('read')}    label="Đọc dữ liệu phân tích tĩnh" />
            <Checkbox checked={perms.suggest} onChange={() => toggle('suggest')} label="Đưa ra gợi ý bước tiếp theo" />
            <Checkbox checked={perms.notes}   onChange={() => toggle('notes')}   label="Tạo & chỉnh sửa ghi chú" />
            <Checkbox checked={perms.export}  onChange={() => toggle('export')}  label="Kích hoạt xuất báo cáo (thủ công xác nhận)" tone="warn" />
          </div>
        </fieldset>
      </div>
    </ModalShell>
  );
}

/** Modal 3: Xuất báo cáo. */
function ModalExport({ onNotify }) {
  const [format, setFormat] = useState('pdf');
  const [areas, setAreas] = useState({
    tree: true, strings: true, imports: true, entropy: false, metadata: true, chat: false,
  });

  const areaList = [
    { key: 'tree',     label: 'Cây cấu trúc' },
    { key: 'strings',  label: 'Bảng Strings' },
    { key: 'imports',  label: 'Imports / Exports' },
    { key: 'entropy',  label: 'Biểu đồ Entropy' },
    { key: 'metadata', label: 'Metadata' },
    { key: 'chat',     label: 'Lịch sử hội thoại AI' },
  ];
  const toggle = (k) => setAreas((a) => ({ ...a, [k]: !a[k] }));
  const selected = Object.values(areas).filter(Boolean).length;

  return (
    <ModalShell
      title="Xuất báo cáo"
      subtitle={`${selected}/${areaList.length} vùng được chọn`}
      icon="download"
      tone="info"
      badge={<Badge tone="info">{format.toUpperCase()}</Badge>}
      onClose={() => onNotify && onNotify('Đã đóng hộp thoại xuất báo cáo', 'info')}
      footer={
        <>
          <Btn size="sm" variant="ghost" onClick={() => onNotify && onNotify('Đã huỷ xuất báo cáo', 'info')}>
            Hủy
          </Btn>
          <Btn
            size="sm"
            variant="primary"
            icon="download"
            disabled={selected === 0}
            onClick={() => onNotify && onNotify(`Đang chuẩn bị báo cáo ${format.toUpperCase()}…`, 'success')}
          >
            Xuất
          </Btn>
        </>
      }
    >
      <div className="space-y-2.5">
        <div>
          <label className="mb-1 block text-[10.5px] font-semibold" style={{ color: C.textSecondary }}>
            Định dạng
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { v: 'pdf',  label: 'PDF',      desc: 'Bố cục in · bảng đẹp' },
              { v: 'html', label: 'HTML',     desc: 'Tương tác · mở trên trình duyệt' },
              { v: 'json', label: 'JSON',     desc: 'Đối chiếu bằng script' },
              { v: 'md',   label: 'Markdown', desc: 'Ghi chú học tập' },
            ].map((o) => (
              <Radio
                key={o.v}
                value={o.v}
                checked={format === o.v}
                onChange={setFormat}
                label={o.label}
                desc={o.desc}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[10.5px] font-semibold" style={{ color: C.textSecondary }}>
              Vùng dữ liệu
            </label>
            <button
              type="button"
              className="btn btn-ghost focus-ring rounded px-1.5 py-[1px] text-[9.5px]"
              style={{ color: C.textSecondary }}
              onClick={() => {
                const all = Object.keys(areas).reduce((acc, k) => ({ ...acc, [k]: true }), {});
                setAreas(all);
              }}
            >
              Chọn tất cả
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {areaList.map((a) => (
              <Checkbox key={a.key} checked={areas[a.key]} onChange={() => toggle(a.key)} label={a.label} />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10.5px] font-semibold" style={{ color: C.textSecondary }}>
            Xem trước
          </label>
          <div
            className="rounded-lg border p-2"
            style={{ borderColor: C.border, background: C.cardBackground }}
          >
            <div
              className="mb-1 flex items-center justify-between text-[9.5px]"
              style={{ color: C.textSecondary }}
            >
              <span className="flex items-center gap-1">
                <Icon name="file" size={10} /> report_RE-2024-118.{format}
              </span>
              <span className="font-mono">~ 412 KB</span>
            </div>
            <div className="space-y-1">
              {[74, 88, 62, 46, 81].map((w, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full"
                  style={{ width: `${w}%`, background: alpha(C.textSecondary, 0.14) }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

/** Modal 4: Xác nhận xoá phiên. */
function ModalConfirmDelete({ onNotify }) {
  return (
    <ModalShell
      title="Xác nhận xoá phiên"
      subtitle="Hành động không thể hoàn tác"
      icon="trash"
      tone="error"
      badge={<Badge tone="error" dot>nguy hiểm</Badge>}
      onClose={() => onNotify && onNotify('Đã đóng hộp thoại xác nhận', 'info')}
      footer={
        <>
          <Btn size="sm" variant="ghost" onClick={() => onNotify && onNotify('Đã huỷ thao tác xoá', 'info')}>
            Hủy
          </Btn>
          <Btn
            size="sm"
            variant="danger"
            icon="trash"
            onClick={() => onNotify && onNotify('Đã xoá phiên RE-2024-118 khỏi thư viện', 'error')}
          >
            Xóa
          </Btn>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <span
          className="mb-2 flex h-11 w-11 items-center justify-center rounded-full"
          style={{
            background: alpha(C.error, 0.14),
            color: C.error,
            border: `1px solid ${alpha(C.error, 0.35)}`,
          }}
        >
          <Icon name="warning" size={20} />
        </span>
        <p className="text-[12px] font-semibold" style={{ color: C.textPrimary }}>
          Bạn có chắc muốn xoá phiên này?
        </p>
        <p className="mt-1 max-w-sm text-[10.5px] leading-[1.5]" style={{ color: C.textSecondary }}>
          Phiên <span className="font-mono" style={{ color: C.textPrimary }}>RE-2024-118</span> cùng toàn bộ
          dữ liệu phân tích đã lập chỉ mục, ghi chú và lịch sử hội thoại sẽ bị xoá vĩnh viễn.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <Badge tone="neutral">3 target</Badge>
          <Badge tone="neutral">5 ghi chú</Badge>
          <Badge tone="neutral">12 tin nhắn AI</Badge>
        </div>
      </div>
    </ModalShell>
  );
}

/** Modal 5: Trợ giúp / hướng dẫn sử dụng. */
function ModalHelp({ onNotify }) {
  const topics = [
    {
      id: 'h1',
      title: 'Bắt đầu: tải & chọn target',
      body: 'Từ Topbar nhấn "Tải target mới" hoặc dùng nút trong sidebar. Sau khi tải, target xuất hiện ở mục "Target đã tải" và tự động được gán vào phiên đang mở.',
    },
    {
      id: 'h2',
      title: 'Chuyển view theo loại target',
      body: 'Năm tab Binary, Packed, Python, Mobile, Firmware tương ứng với 5 loại cấu trúc tĩnh. Mỗi view có toolbar riêng với zoom, filter, export và bố cục lưới/danh sách.',
    },
    {
      id: 'h3',
      title: 'Trao đổi với AI Agent',
      body: 'Panel phải có 3 tab: AI Agent (chat), Gợi ý (đề xuất phân tích), Ghi chú cá nhân. AI chỉ đọc dữ liệu trong phiên hiện tại và không gọi API bên ngoài.',
    },
    {
      id: 'h4',
      title: 'Xuất báo cáo',
      body: 'Dùng toolbar của view để xuất view hiện tại, hoặc mở modal Xuất báo cáo để chọn nhiều vùng dữ liệu với định dạng PDF/HTML/JSON/Markdown.',
    },
    {
      id: 'h5',
      title: 'Phím tắt nhanh',
      body: '⌘K / Ctrl+K: focus ô tìm kiếm.\n⌘U / Ctrl+U: mở modal tải target.\n⌘/ / Ctrl+/: mở trợ giúp.\nEsc: đóng modal hoặc drawer đang mở.',
    },
  ];
  const [open, setOpen] = useState('h1');

  return (
    <ModalShell
      title="Trợ giúp module"
      subtitle="Hướng dẫn sử dụng & phím tắt"
      icon="help"
      tone="info"
      badge={<Badge tone="primary">v1.4.2</Badge>}
      onClose={() => onNotify && onNotify('Đã đóng trợ giúp', 'info')}
    >
      <div className="grid gap-2 md:grid-cols-[160px_1fr]">
        <nav
          aria-label="Mục lục hướng dẫn"
          className="space-y-0.5 md:border-r md:pr-2"
          style={{ borderColor: C.border }}
        >
          {topics.map((t, i) => {
            const isOpen = open === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setOpen(t.id)}
                className={`focus-ring flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[10.5px] transition-colors ${isOpen ? 'sel' : 'hv-item'}`}
                style={{ color: isOpen ? C.primary : C.textPrimary }}
              >
                <span
                  className="font-mono text-[9px]"
                  style={{ color: isOpen ? C.primary : C.textSecondary }}
                >
                  0{i + 1}
                </span>
                <span className="truncate">{t.title}</span>
              </button>
            );
          })}
        </nav>
        <div className="space-y-1">
          {topics.map((t) => {
            const isOpen = open === t.id;
            return (
              <div
                key={t.id}
                className="rounded-lg border"
                style={{ borderColor: C.border, background: C.cardBackground }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : t.id)}
                  aria-expanded={isOpen}
                  className="focus-ring flex w-full items-center gap-1.5 px-2 py-1.5 text-left"
                >
                  <Icon
                    name={isOpen ? 'chevronDown' : 'chevronRight'}
                    size={10}
                    style={{ color: C.textSecondary }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold" style={{ color: C.textPrimary }}>
                    {t.title}
                  </span>
                </button>
                {isOpen && (
                  <div
                    className="whitespace-pre-line px-2 pb-2 text-[10.5px] leading-[1.55]"
                    style={{ color: C.textSecondary }}
                  >
                    {t.body}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}

/** Modal 6: Chi tiết một mục (hàm/tệp). */
function ModalItemDetail({ onNotify }) {
  const [tab, setTab] = useState('info');

  return (
    <ModalShell
      title="helper_compute"
      subtitle="FUNC · .text · 0x00401040"
      icon="code"
      tone="primary"
      badge={<Badge tone="info">function</Badge>}
      onClose={() => onNotify && onNotify('Đã đóng chi tiết mục', 'info')}
      footer={
        <>
          <Btn
            size="sm"
            variant="outline"
            icon="external"
            onClick={() => onNotify && onNotify('Đã nhảy tới 0x00401040 trong Disassembly view', 'info')}
          >
            Mở trong view gốc
          </Btn>
          <Btn
            size="sm"
            variant="primary"
            icon="sparkles"
            onClick={() => onNotify && onNotify('Đã gửi ngữ cảnh mục này cho AI Agent', 'success')}
          >
            Hỏi AI Agent về mục này
          </Btn>
        </>
      }
    >
      <div className="space-y-2">
        <div className="flex gap-1 rounded-md border p-0.5" style={{ borderColor: C.border }}>
          {[
            { id: 'info',   label: 'Thông tin', icon: 'info' },
            { id: 'detail', label: 'Chi tiết',  icon: 'terminal' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`focus-ring flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[10.5px] font-semibold transition-colors ${tab === t.id ? 'sel' : 'btn-ghost'}`}
              style={{ color: tab === t.id ? C.primary : C.textSecondary }}
            >
              <Icon name={t.icon} size={10} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { k: 'Địa chỉ',    v: '0x00401040', mono: true },
                { k: 'Kích thước', v: '0x16 byte',   mono: true },
                { k: 'Section',    v: '.text',       mono: true },
                { k: 'Được gọi bởi', v: 'analyzer_run', mono: true },
                { k: 'Gọi tới',    v: 'không có' },
                { k: 'Điểm vào',   v: 'Không', tone: 'warn' },
              ].map((it) => (
                <div
                  key={it.k}
                  className="rounded-md border px-1.5 py-1"
                  style={{ borderColor: alpha(C.border, 0.8), background: C.cardBackground }}
                >
                  <p className="text-[9.5px]" style={{ color: C.textSecondary }}>{it.k}</p>
                  <p
                    className="truncate font-mono text-[10.5px]"
                    style={{ color: it.tone ? C[it.tone] : C.textPrimary }}
                  >
                    {it.v}
                  </p>
                </div>
              ))}
            </div>
            <div
              className="rounded-md border px-2 py-1.5"
              style={{ borderColor: alpha(C.info, 0.3), background: alpha(C.info, 0.06) }}
            >
              <p className="text-[10px] leading-[1.55]" style={{ color: C.textSecondary }}>
                Hàm trợ giúp tính toán nội bộ, được gọi từ{' '}
                <span className="font-mono" style={{ color: C.info }}>analyzer_run + 0x1D</span>.
                Không ghi ra biến toàn cục, không tham chiếu DLL ngoài.
              </p>
            </div>
          </div>
        )}

        {tab === 'detail' && (
          <div className="space-y-1.5">
            <div
              className="rounded-md border p-1.5"
              style={{ borderColor: C.border, background: C.cardBackground }}
            >
              <p
                className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider"
                style={{ color: C.textSecondary }}
              >
                Disassembly snippet
              </p>
              <DisassemblyList rows={mockDisassembly.slice(3, 11)} />
            </div>
            <div
              className="rounded-md border p-1.5"
              style={{ borderColor: C.border, background: C.cardBackground }}
            >
              <p
                className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider"
                style={{ color: C.textSecondary }}
              >
                Chuỗi tham chiếu
              </p>
              <p className="font-mono text-[10px]" style={{ color: C.success }}>
                0x00001400 · Không thể mở cấu hình
              </p>
              <p className="font-mono text-[10px]" style={{ color: C.success }}>
                0x00001520 · %s:%d:%s
              </p>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

/** Nhãn tiêu đề section trong showcase. */
function SectionLabel({ index, title, tone = 'primary', desc }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span
        className="flex h-5 w-5 items-center justify-center rounded text-[9.5px] font-bold"
        style={{ background: alpha(C[tone], 0.16), color: C[tone] }}
      >
        {index}
      </span>
      <div className="min-w-0">
        <p
          className="truncate text-[11px] font-bold uppercase tracking-wider"
          style={{ color: C.textPrimary }}
        >
          {title}
        </p>
        {desc && (
          <p className="truncate text-[9.5px]" style={{ color: C.textSecondary }}>{desc}</p>
        )}
      </div>
    </div>
  );
}

/** Showcase của 6 modal — render inline dạng grid 2 cột. */
function ModalShowcase({ onNotify }) {
  const modals = [
    { key: 'upload', label: 'Modal Tải target mới',        render: () => <ModalUpload onNotify={onNotify} /> },
    { key: 'ai',     label: 'Modal Cấu hình AI Agent',      render: () => <ModalAIConfig onNotify={onNotify} /> },
    { key: 'export', label: 'Modal Xuất báo cáo',           render: () => <ModalExport onNotify={onNotify} /> },
    { key: 'delete', label: 'Modal Xác nhận xoá phiên',     render: () => <ModalConfirmDelete onNotify={onNotify} /> },
    { key: 'help',   label: 'Modal Trợ giúp / hướng dẫn',   render: () => <ModalHelp onNotify={onNotify} /> },
    { key: 'detail', label: 'Modal Chi tiết mục',           render: () => <ModalItemDetail onNotify={onNotify} /> },
  ];

  return (
    <section aria-labelledby="showcase-modal">
      <h2
        id="showcase-modal"
        className="mb-2 flex items-center gap-1.5 text-[12px] font-bold"
        style={{ color: C.textPrimary }}
      >
        <Icon name="layers" size={12} style={{ color: C.primary }} /> Modal Showcase
        <Badge tone="primary">{modals.length}</Badge>
      </h2>
      <div className="grid gap-2.5 lg:grid-cols-2">
        {modals.map((m, i) => (
          <div key={m.key}>
            <SectionLabel index={`M${i + 1}`} title={m.label} desc={`render đồng thời · ${m.key}`} />
            {m.render()}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Khung drawer tái sử dụng — panel bên phải với border trái. */
function DrawerShell({ title, subtitle, icon, tone = 'primary', actions, children, footer }) {
  return (
    <div
      role="complementary"
      aria-label={title}
      className="flex max-h-[400px] flex-col overflow-hidden rounded-xl border"
      style={{
        background: C.panelBackground,
        borderColor: C.border,
        boxShadow: '0 8px 24px rgba(0,0,0,.35)',
      }}
    >
      <header
        className="flex shrink-0 items-center gap-2 border-b px-2.5 py-2"
        style={{ borderColor: C.border }}
      >
        <span
          className="flex h-5 w-5 items-center justify-center rounded-md"
          style={{ background: alpha(C[tone], 0.16), color: C[tone] }}
        >
          <Icon name={icon} size={11} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold" style={{ color: C.textPrimary }}>
            {title}
          </p>
          {subtitle && (
            <p className="truncate text-[9.5px]" style={{ color: C.textSecondary }}>{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5">{actions}</div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin p-2">{children}</div>
      {footer && (
        <div
          className="shrink-0 border-t px-2.5 py-1.5"
          style={{ borderColor: C.border, background: C.tableFooterBackground }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

/** Drawer 1: Lịch sử phiên phân tích. */
function DrawerSessions({ sessionId, setSessionId }) {
  const [range, setRange] = useState('7d');
  return (
    <DrawerShell
      title="Lịch sử phiên"
      subtitle={`${mockSessions.length} phiên`}
      icon="clock"
      actions={
        <div className="w-[92px]">
          <Dropdown
            value={range}
            onChange={setRange}
            width={150}
            options={[
              { value: 'today', label: 'Hôm nay' },
              { value: '7d',    label: '7 ngày qua' },
              { value: '30d',   label: '30 ngày qua' },
              { value: 'all',   label: 'Tất cả' },
            ]}
          />
        </div>
      }
    >
      <ul className="space-y-0.5">
        {mockSessions.map((s) => {
          const active = s.id === sessionId;
          const meta = STATUS_META[s.status];
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSessionId(s.id)}
                className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors ${active ? 'sel' : 'hv-row'}`}
              >
                <Icon
                  name={TARGET_TYPES.find((t) => t.value === s.targetType)?.icon || 'file'}
                  size={10}
                  style={{ color: active ? C.primary : C.textSecondary }}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[10.5px]"
                    style={{ color: active ? C.primary : C.textPrimary }}
                  >
                    {s.name}
                  </p>
                  <p className="truncate text-[9px]" style={{ color: C.textSecondary }}>
                    {s.time} · {s.targetCount} target
                  </p>
                </div>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </button>
            </li>
          );
        })}
      </ul>
    </DrawerShell>
  );
}

/** Drawer 2: Lịch sử hội thoại AI. */
function DrawerChatHistory() {
  const [q, setQ] = useState('');
  const list = useMemo(
    () =>
      mockChatSessions.filter((c) =>
        `${c.title} ${c.snippet}`.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [q],
  );
  return (
    <DrawerShell
      title="Lịch sử hội thoại"
      subtitle={`${list.length}/${mockChatSessions.length} phiên chat`}
      icon="message"
    >
      <div className="mb-1.5">
        <Input icon="search" value={q} onChange={setQ} placeholder="Tìm trong hội thoại…" />
      </div>
      <ul className="space-y-0.5">
        {list.length === 0 && (
          <p className="py-4 text-center text-[10.5px]" style={{ color: C.textSecondary }}>
            Không có hội thoại phù hợp.
          </p>
        )}
        {list.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="w-full rounded-md px-1.5 py-1 text-left transition-colors hv-row"
            >
              <div className="flex items-center gap-1">
                <Icon name="message" size={10} style={{ color: C.textSecondary }} />
                <p
                  className="min-w-0 flex-1 truncate text-[10.5px] font-medium"
                  style={{ color: C.textPrimary }}
                >
                  {c.title}
                </p>
                <span className="shrink-0 font-mono text-[9px]" style={{ color: C.textSecondary }}>
                  {c.time}
                </span>
              </div>
              <p
                className="truncate pl-3.5 text-[9.5px]"
                style={{ color: C.textSecondary }}
              >
                {c.snippet}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </DrawerShell>
  );
}

/** Drawer 3: Thông báo / cảnh báo. */
function DrawerNotifications({ onNotify }) {
  const [tab, setTab] = useState('all');
  const [items, setItems] = useState(mockNotifications);

  const list = useMemo(
    () =>
      tab === 'warn'
        ? items.filter((n) => n.level === 'warn' || n.level === 'error')
        : items,
    [items, tab],
  );

  const markRead = (id) => setItems((arr) => arr.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <DrawerShell
      title="Thông báo"
      subtitle={`${items.filter((n) => !n.read).length} chưa đọc`}
      icon="bell"
      actions={
        <IconBtn
          icon="check"
          label="Đánh dấu tất cả đã đọc"
          onClick={() => {
            setItems((arr) => arr.map((n) => ({ ...n, read: true })));
            onNotify && onNotify('Đã đánh dấu tất cả đã đọc', 'success');
          }}
        />
      }
    >
      <div
        className="mb-1.5 flex gap-0.5 rounded-md border p-0.5"
        style={{ borderColor: C.border }}
      >
        {[
          { id: 'all',  label: 'Tất cả' },
          { id: 'warn', label: 'Cảnh báo' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`focus-ring flex-1 rounded px-2 py-[3px] text-[10px] font-semibold transition-colors ${tab === t.id ? 'sel' : 'btn-ghost'}`}
            style={{ color: tab === t.id ? C.primary : C.textSecondary }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ul className="space-y-1">
        {list.map((n) => (
          <li
            key={n.id}
            className="flex items-start gap-1.5 rounded-md border px-1.5 py-1"
            style={{
              borderColor: n.read ? alpha(C.border, 0.7) : alpha(C.primary, 0.28),
              background: n.read ? 'transparent' : alpha(C.primary, 0.05),
            }}
          >
            <Icon
              name={
                n.level === 'error'
                  ? 'alertCircle'
                  : n.level === 'warn'
                  ? 'warning'
                  : n.level === 'success'
                  ? 'checkCircle'
                  : 'info'
              }
              size={11}
              style={{ color: C[n.level], marginTop: 1 }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="truncate text-[10.5px] font-semibold" style={{ color: C.textPrimary }}>
                  {n.title}
                </p>
                {!n.read && (
                  <span className="h-1 w-1 shrink-0 rounded-full" style={{ background: C.primary }} />
                )}
              </div>
              <p className="truncate text-[9.5px]" style={{ color: C.textSecondary }}>{n.message}</p>
              <p className="mt-0.5 font-mono text-[9px]" style={{ color: C.textSecondary }}>{n.time}</p>
            </div>
            {!n.read && (
              <IconBtn icon="check" label="Đánh dấu đã đọc" onClick={() => markRead(n.id)} />
            )}
          </li>
        ))}
      </ul>
    </DrawerShell>
  );
}

/** Drawer 4: Log chi tiết. */
function DrawerLogs() {
  const [levels, setLevels] = useState({ INFO: true, WARN: true, ERROR: true, DEBUG: false });
  const [autoScroll, setAutoScroll] = useState(true);
  const list = useMemo(() => mockLogs.filter((l) => levels[l.level]), [levels]);
  const toggle = (k) => setLevels((x) => ({ ...x, [k]: !x[k] }));

  return (
    <DrawerShell
      title="Log chi tiết"
      subtitle={`${list.length}/${mockLogs.length} dòng`}
      icon="terminal"
      actions={<IconBtn icon="download" label="Tải log" />}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        {['INFO', 'WARN', 'ERROR', 'DEBUG'].map((lv) => {
          const active = levels[lv];
          const color =
            lv === 'ERROR' ? C.error : lv === 'WARN' ? C.warn : lv === 'INFO' ? C.info : C.textSecondary;
          return (
            <button
              key={lv}
              type="button"
              onClick={() => toggle(lv)}
              className="focus-ring rounded-full px-2 py-[2px] text-[9.5px] font-bold uppercase tracking-wider transition-opacity"
              style={{
                color,
                background: alpha(color, 0.12),
                border: `1px solid ${alpha(color, 0.3)}`,
                opacity: active ? 1 : 0.4,
              }}
            >
              {lv}
            </button>
          );
        })}
        <Toggle checked={autoScroll} onChange={setAutoScroll} label="Auto-scroll" />
      </div>
      <div
        className="rounded-md border p-1.5 font-mono text-[10px] leading-[1.6]"
        style={{ borderColor: C.border, background: C.cardBackground }}
      >
        {list.map((l) => {
          const color =
            l.level === 'ERROR'
              ? C.error
              : l.level === 'WARN'
              ? C.warn
              : l.level === 'DEBUG'
              ? C.textSecondary
              : C.info;
          return (
            <div key={l.id} className="flex gap-1.5 rounded px-1 hv-row">
              <span className="shrink-0" style={{ color: C.textSecondary }}>{l.time}</span>
              <span className="w-[44px] shrink-0 font-bold" style={{ color }}>{l.level}</span>
              <span className="w-[54px] shrink-0" style={{ color: C.primary }}>{l.source}</span>
              <span
                className="min-w-0 flex-1 truncate"
                style={{ color: C.textPrimary }}
                title={l.message}
              >
                {l.message}
              </span>
            </div>
          );
        })}
        {list.length === 0 && (
          <p className="py-3 text-center" style={{ color: C.textSecondary }}>
            Không có log ở mức đã chọn.
          </p>
        )}
      </div>
    </DrawerShell>
  );
}

/** Drawer 5: Cài đặt giao diện. */
function DrawerAppearance() {
  const [theme, setTheme] = useState('dark');
  const [lang, setLang] = useState('vi');
  const [compact, setCompact] = useState(false);
  const [anim, setAnim] = useState(true);

  return (
    <DrawerShell
      title="Cài đặt giao diện"
      subtitle="Chủ đề · ngôn ngữ · hiệu ứng"
      icon="settings"
    >
      <div className="space-y-2.5">
        <div>
          <label className="mb-1 block text-[10.5px] font-semibold" style={{ color: C.textSecondary }}>
            Chủ đề
          </label>
          <div className="space-y-1">
            {[
              { v: 'dark',   label: 'Dark',           desc: 'Mặc định · được khuyến nghị' },
              { v: 'light',  label: 'Light',          desc: 'Đang phát triển' },
              { v: 'system', label: 'Theo hệ thống',  desc: 'Theo cài đặt OS' },
            ].map((o) => (
              <Radio
                key={o.v}
                value={o.v}
                checked={theme === o.v}
                onChange={setTheme}
                label={o.label}
                desc={o.desc}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10.5px] font-semibold" style={{ color: C.textSecondary }}>
            Ngôn ngữ
          </label>
          <Dropdown
            value={lang}
            onChange={setLang}
            width={180}
            options={[
              { value: 'vi', label: 'Tiếng Việt' },
              { value: 'en', label: 'English' },
              { value: 'ja', label: 'Japanese' },
            ]}
          />
        </div>

        <div className="space-y-0.5 pt-1">
          <Toggle checked={compact} onChange={setCompact} label="Chế độ compact" helper="Giảm padding & chiều cao dòng" />
          <Toggle checked={anim}    onChange={setAnim}    label="Hiệu ứng chuyển cảnh" helper="Tắt khi cần hiệu năng cao" />
        </div>
      </div>
    </DrawerShell>
  );
}

/** Drawer 6: Quản lý target. */
function DrawerTargetManager({ onNotify }) {
  const [selected, setSelected] = useState(new Set());
  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const allSelected = selected.size === mockTargets.length;

  return (
    <DrawerShell
      title="Quản lý target"
      subtitle={`${selected.size}/${mockTargets.length} đã chọn`}
      icon="database"
      actions={
        <button
          type="button"
          onClick={() => setSelected(allSelected ? new Set() : new Set(mockTargets.map((t) => t.id)))}
          className="btn btn-ghost focus-ring rounded px-1.5 py-[1px] text-[9.5px]"
          style={{ color: C.primary }}
        >
          {allSelected ? 'Bỏ chọn' : 'Chọn tất cả'}
        </button>
      }
      footer={
        <div className="flex flex-wrap items-center gap-1">
          <Btn
            size="xs"
            variant="outline"
            icon="edit"
            disabled={selected.size !== 1}
            onClick={() => onNotify('Đổi tên target (demo)', 'info')}
          >
            Đổi tên
          </Btn>
          <Btn
            size="xs"
            variant="dangerGhost"
            icon="trash"
            disabled={selected.size === 0}
            onClick={() => onNotify(`Xoá ${selected.size} target (demo)`, 'error')}
          >
            Xoá
          </Btn>
          <Btn
            size="xs"
            variant="ghost"
            icon="eye"
            disabled={selected.size !== 1}
            onClick={() => onNotify('Xem chi tiết target', 'info')}
          >
            Chi tiết
          </Btn>
          <Btn
            size="xs"
            variant="ghost"
            icon="plus"
            disabled={selected.size !== 1}
            onClick={() => onNotify('Mở phiên mới từ target', 'success')}
          >
            Phiên mới
          </Btn>
          <Btn
            size="xs"
            variant="ghost"
            icon="split"
            disabled={selected.size !== 2}
            onClick={() => onNotify('So sánh 2 target', 'info')}
          >
            So sánh
          </Btn>
        </div>
      }
    >
      <ul className="space-y-0.5">
        {mockTargets.map((t) => (
          <li
            key={t.id}
            className={`rounded-md transition-colors ${selected.has(t.id) ? 'row-sel' : 'hv-row'}`}
          >
            <div className="flex items-center gap-1.5 px-1 py-1">
              <Checkbox checked={selected.has(t.id)} onChange={() => toggle(t.id)} label="" />
              <span
                className="flex h-4 w-4 items-center justify-center rounded"
                style={{ background: alpha(C.primary, 0.12), color: C.primary }}
              >
                <Icon
                  name={TARGET_TYPES.find((x) => x.value === t.type)?.icon || 'file'}
                  size={9}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10.5px]" style={{ color: C.textPrimary }}>{t.name}</p>
                <p className="truncate font-mono text-[9px]" style={{ color: C.textSecondary }}>
                  {t.size} · {t.uploadedAt}
                </p>
              </div>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: C[STATUS_META[t.status].tone] }}
                title={STATUS_META[t.status].label}
              />
            </div>
          </li>
        ))}
      </ul>
    </DrawerShell>
  );
}

/** Showcase 6 drawer dạng grid 3 cột. */
function DrawerShowcase({ sessionId, setSessionId, onNotify }) {
  return (
    <section aria-labelledby="showcase-drawer">
      <h2
        id="showcase-drawer"
        className="mb-2 flex items-center gap-1.5 text-[12px] font-bold"
        style={{ color: C.textPrimary }}
      >
        <Icon name="layers" size={12} style={{ color: C.info }} /> Drawer Showcase
        <Badge tone="info">6</Badge>
      </h2>
      <div className="grid gap-2 xl:grid-cols-3 lg:grid-cols-2">
        <DrawerSessions sessionId={sessionId} setSessionId={setSessionId} />
        <DrawerChatHistory />
        <DrawerNotifications onNotify={onNotify} />
        <DrawerLogs />
        <DrawerAppearance />
        <DrawerTargetManager onNotify={onNotify} />
      </div>
    </section>
  );
}

/** Khung showcase tổng — hiển thị trong workspace khi ở chế độ showcase. */
function ShowcaseWorkspace({
  modalsRef,
  drawersRef,
  componentsRef,
  section,
  setSection,
  onClose,
  sessionId,
  setSessionId,
  onNotify,
}) {
  const tabs = [
    { id: 'modals',     label: 'Modal',      icon: 'layers' },
    { id: 'drawers',    label: 'Drawer',     icon: 'split' },
    { id: 'components', label: 'Components', icon: 'grid' },
  ];

  const scrollTo = (key) => {
    setSection(key);
    const ref = key === 'modals' ? modalsRef : key === 'drawers' ? drawersRef : componentsRef;
    requestAnimationFrame(() => {
      ref.current && ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <main className="flex min-h-0 min-w-0 flex-col" style={{ background: C.background }}>
      <div
        className="flex shrink-0 items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: C.border, background: C.panelBackground }}
      >
        <Btn size="sm" variant="outline" icon="chevronLeft" onClick={onClose}>
          Quay lại app
        </Btn>
        <h1 className="truncate text-[12px] font-bold" style={{ color: C.textPrimary }}>
          UI Showcase
        </h1>
        <Badge tone="primary">fakeUI</Badge>
        <div
          className="ml-auto flex items-center gap-0.5 rounded-md border p-0.5"
          style={{ borderColor: C.border }}
        >
          {tabs.map((t) => {
            const active = section === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => scrollTo(t.id)}
                className={`focus-ring flex items-center gap-1 rounded px-2 py-[3px] text-[10.5px] font-semibold transition-colors ${active ? 'sel' : 'btn-ghost'}`}
                style={{ color: active ? C.primary : C.textSecondary }}
              >
                <Icon name={t.icon} size={10} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto scroll-thin p-3">
        <div ref={modalsRef}>
          <ModalShowcase onNotify={onNotify} />
        </div>
        <div ref={drawersRef}>
          <DrawerShowcase sessionId={sessionId} setSessionId={setSessionId} onNotify={onNotify} />
        </div>
        <div ref={componentsRef}>
          <ComponentShowcase onNotify={onNotify} />
        </div>
      </div>
    </main>
  );
}

/** Empty state — hiển thị khi chưa có target. */
function EmptyState({ onUpload }) {
  return (
    <div
      className="flex flex-col items-center rounded-xl border p-5 text-center"
      style={{ background: C.cardBackground, borderColor: C.border }}
    >
      <span
        className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background: alpha(C.primary, 0.12),
          color: C.primary,
          border: `1px solid ${alpha(C.primary, 0.25)}`,
        }}
      >
        <Icon name="layers" size={22} strokeWidth={1.5} />
      </span>
      <p className="text-[12px] font-semibold" style={{ color: C.textPrimary }}>
        Chưa có target nào trong phiên
      </p>
      <p className="mt-1 max-w-xs text-[10.5px] leading-[1.5]" style={{ color: C.textSecondary }}>
        Tải lên một tệp thực thi, gói ứng dụng hoặc firmware để bắt đầu phân tích cấu trúc tĩnh với AI Agent.
      </p>
      <div className="mt-2 flex gap-1.5">
        <Btn size="sm" variant="primary" icon="plus" onClick={onUpload}>
          Tải target mới
        </Btn>
        <Btn size="sm" variant="outline" icon="help">
          Xem hướng dẫn
        </Btn>
      </div>
    </div>
  );
}

/** AI thinking — demo trạng thái đang phân tích. */
function AIThinkingDemo({ onCancel }) {
  return (
    <div
      className="rounded-xl border p-2.5"
      style={{ borderColor: alpha(C.primary, 0.3), background: alpha(C.primary, 0.06) }}
    >
      <div className="flex items-center gap-2">
        <span
          className="ui-spin h-3.5 w-3.5 shrink-0 rounded-full border-2 border-transparent"
          style={{ borderTopColor: C.primary, borderRightColor: alpha(C.primary, 0.5) }}
        />
        <span className="min-w-0 flex-1 truncate text-[11px]" style={{ color: C.textPrimary }}>
          Đang phân tích cấu trúc section
          <span className="ui-dot">.</span>
          <span className="ui-dot" style={{ animationDelay: '.15s' }}>.</span>
          <span className="ui-dot" style={{ animationDelay: '.3s' }}>.</span>
        </span>
        <Btn size="xs" variant="dangerGhost" icon="stop" onClick={onCancel}>
          Hủy
        </Btn>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <ProgressBar value={64} tone="primary" height={3} animated />
        <span className="shrink-0 font-mono text-[9px]" style={{ color: C.textSecondary }}>
          4,120 tok
        </span>
      </div>
    </div>
  );
}

/** Toast — 3 mức success/warn/error. */
function Toast({ tone, title, message, onClose, onUndo }) {
  const color = C[tone];
  return (
    <div
      className="flex items-start gap-2 rounded-lg border px-2.5 py-2"
      style={{ borderColor: alpha(color, 0.35), background: C.cardBackground }}
    >
      <Icon
        name={tone === 'success' ? 'checkCircle' : tone === 'warn' ? 'warning' : 'alertCircle'}
        size={13}
        style={{ color, marginTop: 1 }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold" style={{ color: C.textPrimary }}>
          {title}
        </p>
        <p className="truncate text-[10px]" style={{ color: C.textSecondary }}>{message}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onUndo && (
          <Btn size="xs" variant="ghost" onClick={onUndo}>
            Hoàn tác
          </Btn>
        )}
        <IconBtn icon="x" label="Đóng thông báo" onClick={onClose} />
      </div>
    </div>
  );
}

/** Context menu mẫu. */
function ContextMenuDemo() {
  const items = [
    { icon: 'eye',      label: 'Mở chi tiết',        shortcut: '↵' },
    { icon: 'external', label: 'Mở trong view gốc',  shortcut: '⇧↵' },
    { icon: 'sparkles', label: 'Hỏi AI Agent',       shortcut: '⌘A' },
    { icon: 'copy',     label: 'Copy địa chỉ',       shortcut: '⌘C' },
    { icon: 'bookmark', label: 'Bookmark mục này',   shortcut: '⌘B' },
  ];

  return (
    <div
      role="menu"
      className="rounded-lg border p-1"
      style={{
        background: C.dropdownBackground,
        borderColor: C.border,
        boxShadow: '0 12px 32px rgba(0,0,0,.55)',
      }}
    >
      {items.map((it, i) => (
        <React.Fragment key={it.label}>
          {i === 3 && <div className="my-1 h-px" style={{ background: C.border }} />}
          <button
            type="button"
            role="menuitem"
            className="focus-ring flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors hv-item"
            style={{ color: C.textPrimary }}
          >
            <Icon name={it.icon} size={11} style={{ color: C.textSecondary }} />
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
            <kbd
              className="rounded border px-1 font-mono text-[9px]"
              style={{ borderColor: C.border, color: C.textSecondary }}
            >
              {it.shortcut}
            </kbd>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

/** Bộ sưu tập badge. */
function BadgeShowcase() {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 rounded-lg border p-2.5"
      style={{ borderColor: C.border, background: C.cardBackground }}
    >
      <Badge tone="primary">primary</Badge>
      <Badge tone="success">success</Badge>
      <Badge tone="warn">warn</Badge>
      <Badge tone="error">error</Badge>
      <Badge tone="info">info</Badge>
      <Badge tone="neutral">neutral</Badge>
      <Badge tone="success" dot>đang hoạt động</Badge>
      <Badge tone="warn" dot>cảnh báo</Badge>
      <Badge tone="error" dot>lỗi</Badge>
      <Badge tone="info" dot>đang xử lý</Badge>
    </div>
  );
}

/** Showcase của các component phụ. */
function ComponentShowcase({ onNotify }) {
  const [toasts, setToasts] = useState([
    { id: 't1', tone: 'success', title: 'Đã xuất báo cáo',       message: 'report_RE-2024-118.pdf đã lưu vào Downloads.' },
    { id: 't2', tone: 'warn',    title: 'Entropy vượt ngưỡng',    message: '6 vùng liên tiếp vượt 7.5 — nên xem lại.' },
    { id: 't3', tone: 'error',   title: 'Không đọc được overlay', message: 'client_helper.dll tại 0x00C1F000.' },
  ]);

  const remove = (id) => setToasts((x) => x.filter((t) => t.id !== id));

  return (
    <section aria-labelledby="showcase-components">
      <h2
        id="showcase-components"
        className="mb-2 flex items-center gap-1.5 text-[12px] font-bold"
        style={{ color: C.textPrimary }}
      >
        <Icon name="layers" size={12} style={{ color: C.warn }} /> Components Showcase
      </h2>
      <div className="grid gap-2 xl:grid-cols-3 lg:grid-cols-2">
        <div>
          <SectionLabel index="C1" title="Empty state" />
          <EmptyState onUpload={() => onNotify('Mở modal tải target (demo)', 'info')} />
        </div>

        <div className="space-y-2">
          <SectionLabel index="C2" title="AI thinking / Loading" />
          <div
            className="rounded-xl border p-2"
            style={{ borderColor: C.border, background: C.cardBackground }}
          >
            <AIThinkingDemo onCancel={() => onNotify('Đã huỷ yêu cầu phân tích', 'info')} />
          </div>

          <SectionLabel index="C5" title="Tooltip" />
          <div
            className="flex items-center gap-2 rounded-xl border p-2.5"
            style={{ borderColor: C.border, background: C.cardBackground }}
          >
            <Tooltip text="Vùng dữ liệu có entropy cao thường đã bị nén hoặc mã hoá.">
              <button
                type="button"
                className="focus-ring flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[10px]"
                style={{ color: C.textSecondary, background: alpha(C.primary, 0.1) }}
              >
                <Icon name="info" size={11} style={{ color: C.primary }} /> Entropy là gì?
              </button>
            </Tooltip>
            <Tooltip text="Chế độ học thuật: chỉ đọc dữ liệu, không thực thi mẫu.">
              <button
                type="button"
                className="focus-ring flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[10px]"
                style={{ color: C.textSecondary, background: alpha(C.info, 0.1) }}
              >
                <Icon name="shield" size={11} style={{ color: C.info }} /> An toàn
              </button>
            </Tooltip>
            <Tooltip text="Rê chuột vào phần tử để xem chú thích ngắn.">
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full"
                style={{ background: alpha(C.warn, 0.14), color: C.warn }}
              >
                <Icon name="help" size={10} />
              </span>
            </Tooltip>
          </div>
        </div>

        <div>
          <SectionLabel index="C3" title="Toast / Snackbar" />
          <div className="space-y-1.5">
            {toasts.map((t) => (
              <Toast
                key={t.id}
                tone={t.tone}
                title={t.title}
                message={t.message}
                onClose={() => remove(t.id)}
                onUndo={() => onNotify(`Hoàn tác: ${t.title}`, 'info')}
              />
            ))}
            {toasts.length === 0 && (
              <button
                type="button"
                onClick={() =>
                  setToasts([
                    { id: `t-${Date.now()}-1`, tone: 'success', title: 'Đã xuất báo cáo',       message: 'report_RE-2024-118.pdf đã lưu.' },
                    { id: `t-${Date.now()}-2`, tone: 'warn',    title: 'Entropy vượt ngưỡng',    message: '6 vùng vượt 7.5.' },
                    { id: `t-${Date.now()}-3`, tone: 'error',   title: 'Không đọc được overlay', message: 'client_helper.dll.' },
                  ])
                }
                className="btn btn-outline focus-ring w-full rounded-lg border py-2 text-[10.5px]"
                style={{ borderColor: C.border, color: C.textSecondary }}
              >
                Hiện lại 3 toast mẫu
              </button>
            )}
          </div>
        </div>

        <div>
          <SectionLabel index="C4" title="Context menu" desc="chuột phải trên mục" />
          <ContextMenuDemo />
        </div>

        <div>
          <SectionLabel index="C6" title="Badge showcase" />
          <BadgeShowcase />
        </div>
      </div>
    </section>
  );
}

/* --- 4.15. COMPONENT CHÍNH --------------------------------------------- */
export default function App() {
  const [sessionId, setSessionId] = useState('S-118');
  const [targetId, setTargetId] = useState('T-01');
  const [targetType, setTargetType] = useState('binary');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('agent');
  const [layout, setLayout] = useState('grid');
  const [zoom, setZoom] = useState(100);
  const [showcase, setShowcase] = useState(false);
  const [showcaseSection, setShowcaseSection] = useState('modals');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const modalsRef = useRef(null);
  const drawersRef = useRef(null);
  const componentsRef = useRef(null);

  /** Đẩy toast vào góc dưới-trái; tự huỷ sau 4s. */
  const notify = useCallback((message, tone = 'info') => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((arr) => [...arr, { id, message, tone }]);
    setTimeout(() => setToasts((arr) => arr.filter((t) => t.id !== id)), 4200);
  }, []);

  const openShowcase = useCallback((section = 'modals') => {
    setShowcase(true);
    setShowcaseSection(section);
    requestAnimationFrame(() => {
      const ref =
        section === 'modals' ? modalsRef : section === 'drawers' ? drawersRef : componentsRef;
      setTimeout(() => {
        ref.current && ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    });
  }, []);

  const closeShowcase = useCallback(() => setShowcase(false), []);

  const unreadNotif = useMemo(
    () => mockNotifications.filter((n) => !n.read).length,
    [],
  );

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ background: C.background, color: C.textPrimary }}
    >
      <style>{GLOBAL_CSS}</style>

      <TopBar
        targetId={targetId}
        setTargetId={setTargetId}
        search={search}
        setSearch={setSearch}
        onUpload={() => openShowcase('modals')}
        onOpenUser={() => notify('Mở cài đặt giao diện (demo)', 'info')}
        notifCount={unreadNotif}
      />

      <div className="flex min-h-0 flex-1">
        {/* Sidebar — full từ lg+, icon bar từ md, và overlay mobile <md */}
        <div className="hidden w-[240px] shrink-0 md:flex">
          <Sidebar
            sessionId={sessionId}
            setSessionId={setSessionId}
            targetId={targetId}
            setTargetId={setTargetId}
            onUpload={() => openShowcase('modals')}
            onOpenAgent={() => {
              if (window.innerWidth < 1280) setPanelOpen(true);
              else setTab('agent');
              notify('AI Agent đã được kích hoạt', 'success');
            }}
          />
        </div>

        {/* Workspace / Showcase */}
        {showcase ? (
          <ShowcaseWorkspace
            modalsRef={modalsRef}
            drawersRef={drawersRef}
            componentsRef={componentsRef}
            section={showcaseSection}
            setSection={setShowcaseSection}
            onClose={closeShowcase}
            sessionId={sessionId}
            setSessionId={setSessionId}
            onNotify={notify}
          />
        ) : (
          <Workspace
            targetType={targetType}
            setTargetType={setTargetType}
            layout={layout}
            setLayout={setLayout}
            zoom={zoom}
            setZoom={setZoom}
            search={search}
            onNotify={notify}
            onUpload={() => openShowcase('modals')}
          />
        )}

        {/* Right panel — full từ xl+, overlay mobile <xl */}
        <div className="hidden w-[320px] shrink-0 xl:flex">
          <RightPanel tab={tab} setTab={setTab} onNotify={notify} />
        </div>
      </div>

      <StatusBar targetType={targetType} />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Danh sách phiên & target"
          className="fixed inset-0 z-50 flex md:hidden"
        >
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative h-full w-[260px]">
            <Sidebar
              sessionId={sessionId}
              setSessionId={(id) => {
                setSessionId(id);
                setSidebarOpen(false);
              }}
              targetId={targetId}
              setTargetId={(id) => {
                setTargetId(id);
                setSidebarOpen(false);
              }}
              onUpload={() => {
                setSidebarOpen(false);
                openShowcase('modals');
              }}
              onOpenAgent={() => {
                setSidebarOpen(false);
                setPanelOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Mobile right panel overlay */}
      {panelOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Panel AI Agent"
          className="fixed inset-0 z-50 flex xl:hidden"
        >
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setPanelOpen(false)}
          />
          <div className="relative ml-auto h-full w-full max-w-[360px]">
            <RightPanel tab={tab} setTab={setTab} onNotify={notify} />
          </div>
        </div>
      )}

      {/* Floating: hamburger (mobile) */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Mở danh sách phiên"
        className="fixed left-2 top-16 z-30 flex h-9 w-9 items-center justify-center rounded-lg border shadow-lg md:hidden"
        style={{ background: C.panelBackground, borderColor: C.border, color: C.textPrimary }}
      >
        <Icon name="menu" size={14} />
      </button>

      {/* Floating: mở panel AI trên <xl */}
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        aria-label="Mở panel AI Agent"
        className="fixed bottom-11 right-3 z-30 flex h-10 w-10 items-center justify-center rounded-full shadow-lg xl:hidden"
        style={{ background: C.primary, color: C.textForeground }}
      >
        <Icon name="sparkles" size={16} />
      </button>

      {/* Floating: nút mở showcase (luôn hiển thị) */}
      {!showcase && (
        <button
          type="button"
          onClick={() => openShowcase('modals')}
          aria-label="Mở bảng showcase UI"
          className="fixed bottom-11 left-3 z-30 flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold shadow-lg md:hidden"
          style={{ background: C.panelBackground, borderColor: C.border, color: C.textSecondary }}
        >
          <Icon name="layers" size={11} /> Showcase
        </button>
      )}

      {/* Toast stack nổi (dành cho hành động thực) */}
      <div
        className="fixed bottom-11 right-3 z-[120] flex w-[280px] flex-col gap-1.5 sm:w-[320px]"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <Toast
            key={t.id}
            tone={t.tone}
            title={
              t.tone === 'success'
                ? 'Thành công'
                : t.tone === 'error'
                ? 'Lỗi'
                : t.tone === 'warn'
                ? 'Cảnh báo'
                : 'Thông báo'
            }
            message={t.message}
            onClose={() => setToasts((arr) => arr.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </div>
  );
}