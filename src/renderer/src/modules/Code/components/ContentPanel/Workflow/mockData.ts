import type { DiffLine, WorkflowPlan } from './types';

const d = (...rows: string[]): DiffLine[] => rows.map((r) => ({ t: r[0] as DiffLine['t'], s: r.slice(1) }));

export const MOCK_WORKFLOW: WorkflowPlan = {
  taskId: 'TASK-128',
  taskTitle: 'Implement RECON module',
  goal: 'Thêm module RECON cho phép agent liệt kê host, source và tài nguyên từ Emulate service, hiển thị kết quả dạng bảng trong chat.',
  branch: 'recon',
  nodes: [
    {
      id: 'n1',
      title: 'Thiết kế cấu trúc module RECON',
      summary: 'Dựng khung module, đăng ký vào ModuleRegistry.',
      status: 'done',
      dependsOn: [],
      description:
        'Dựng khung module RECON để các bước sau chỉ cần thêm parser, executor và renderer mà không phải đụng lại cấu trúc. Module được khai báo độc lập, đăng ký renderer thông qua ModuleRegistry thay vì import trực tiếp vào TagRouter, và bám theo mẫu CodeModule hiện có để giữ đồng nhất convention. Kết quả cuối cùng là một module còn trống nhưng hợp lệ, type-check sạch và sẵn sàng để các node tiếp theo mở rộng.',
      subtasks: [
        { id: 'n1-s1', text: 'Tạo thư mục executors / parsers / renderers / prompts', done: true },
        { id: 'n1-s2', text: 'Viết ReconModule.ts', done: true },
        { id: 'n1-s3', text: 'Đăng ký vào ModuleRegistry.ts', done: true },
      ],
      files: [
        {
          path: 'src/renderer/src/modules/Recon/ReconModule.ts',
          action: 'create',
          note: 'Khai báo module, renderers, tool list',
          lines: '1-64',
          diff: d(
            `+export const ReconModule: ZenModule = {`,
            `+  id: 'recon',`,
            `+  renderers: getReconRenderers(),`,
            `+  tools: RECON_TOOLS,`,
            `+};`,
          ),
        },
        {
          path: 'src/renderer/src/modules/Recon/index.ts',
          action: 'create',
          note: 'Re-export module',
          diff: d(`+export * from './ReconModule';`),
        },
        {
          path: 'src/renderer/src/modules/ModuleRegistry.ts',
          action: 'modify',
          note: 'Thêm ReconModule vào danh sách module',
          lines: '41-47',
          diff: d(
            ` import { CodeModule } from './Code/CodeModule';`,
            `+import { ReconModule } from './Recon';`,
            ` `,
            ` const MODULES = [`,
            `   CodeModule,`,
            `-  EmulateModule`,
            `+  EmulateModule,`,
            `+  ReconModule,`,
            ` ];`,
          ),
        },
        { path: 'src/renderer/src/modules/Code/CodeModule.ts', action: 'read', note: 'Mẫu khai báo module để bám theo' },
      ],
      handoff: 'Node đã hoàn thành. Không cần làm lại. Khung module nằm ở src/renderer/src/modules/Recon.',
      conclusion: {
        summary: 'Khung module RECON đã dựng xong và đăng ký vào ModuleRegistry, type-check sạch. Các node sau chỉ cần thêm parser, executor và renderer.',
        lessons: [
          'Đăng ký renderer qua ModuleRegistry thay vì import trực tiếp vào TagRouter.',
          'Bám theo mẫu CodeModule giúp giữ đồng nhất convention giữa các module.',
        ],
      },
    },
    {
      id: 'n2',
      title: 'Parser cho list_hosts và list_sources',
      summary: 'Viết parser validate params cho 2 tool đầu tiên.',
      status: 'done',
      dependsOn: ['n1'],
      description:
        'Viết parser cho hai tool đầu tiên của RECON là list_hosts và list_sources, hỗ trợ cả định dạng XML và JSON. Mỗi parser validate params và trả về dữ liệu đã chuẩn hóa: list_hosts chấp nhận params rỗng hoặc có filter, còn list_sources bắt buộc phải có host. Convention đặt tên, cách import và cách báo lỗi được giữ giống hệt parser tương ứng bên module Emulate.',
      subtasks: [
        { id: 'n2-s1', text: 'ListHostsParser.ts', done: true },
        { id: 'n2-s2', text: 'ListSourcesParser.ts', done: true },
        { id: 'n2-s3', text: 'Khai báo type params dùng chung', done: true },
      ],
      files: [
        {
          path: 'src/renderer/src/modules/Recon/parsers/ListHostsParser.ts',
          action: 'create',
          note: 'Theo mẫu Emulate ListHostsParser',
          lines: '1-38',
          diff: d(
            `+export function parseListHosts(raw: unknown): ListHostsParams {`,
            `+  const p = (raw ?? {}) as Partial<ListHostsParams>;`,
            `+  return { filter: p.filter?.trim() || undefined };`,
            `+}`,
          ),
        },
        {
          path: 'src/renderer/src/modules/Recon/parsers/ListSourcesParser.ts',
          action: 'create',
          note: 'Host là tham số bắt buộc',
          lines: '1-44',
          diff: d(
            `+export function parseListSources(raw: unknown): ListSourcesParams {`,
            `+  const host = (raw as { host?: string })?.host?.trim();`,
            `+  if (!host) throw new Error('host is required');`,
            `+  return { host };`,
            `+}`,
          ),
        },
        { path: 'src/renderer/src/modules/Emulate/parsers/ListHostsParser.ts', action: 'read', note: 'File mẫu để copy convention' },
      ],
      handoff: 'Node đã hoàn thành. Hai parser nằm ở modules/Recon/parsers.',
      conclusion: {
        summary: 'Hai parser list_hosts và list_sources đã hoàn thành, validate params và chuẩn hóa dữ liệu trả về.',
        lessons: [
          'list_sources bắt buộc có host, thiếu host phải ném lỗi rõ ràng ngay tại parser.',
          'Copy convention từ parser của module Emulate để tránh lệch cách import và báo lỗi.',
        ],
      },
    },
    {
      id: 'n3',
      title: 'Executor gọi Emulate service',
      summary: 'Nối parser với Emulate service qua IPC, xử lý lỗi kết nối.',
      status: 'active',
      dependsOn: ['n2'],
      description:
        'Executor nhận params đã được parser chuẩn hóa, gọi Emulate service qua port lấy từ IPC và trả kết quả dạng có cấu trúc để renderer hiển thị. Khi mất kết nối hoặc service chưa chạy, executor phải trả về lỗi dễ đọc thay vì treo, nên mỗi request đều có timeout mặc định 8 giây. Tuyệt đối không hardcode port, mọi địa chỉ đều đi qua refreshEmulateBaseFromIpc để chạy đúng cả ở dev lẫn bản build.',
      subtasks: [
        { id: 'n3-s1', text: 'ListHostsExecutor.ts', done: true },
        { id: 'n3-s2', text: 'ListSourcesExecutor.ts', done: false },
        { id: 'n3-s3', text: 'Helper reconClient.ts dùng chung (base URL, timeout)', done: false },
        { id: 'n3-s4', text: 'Map lỗi mạng sang thông báo tiếng Việt', done: false },
      ],
      files: [
        { path: 'src/renderer/src/modules/Recon/executors/ListHostsExecutor.ts', action: 'create', note: 'Đã xong, gọi GET /hosts', lines: '1-52' },
        { path: 'src/renderer/src/modules/Recon/executors/ListSourcesExecutor.ts', action: 'create', note: 'Cần làm: gọi GET /hosts/:id/sources' },
        { path: 'src/renderer/src/modules/Recon/services/reconClient.ts', action: 'create', note: 'Helper fetch có timeout, lấy base từ IPC' },
        { path: 'src/renderer/src/modules/Emulate/executors/ListHostsExecutor.ts', action: 'read', note: 'Mẫu xử lý lỗi và định dạng kết quả' },
        { path: 'src/shared/ports.ts', action: 'read', note: 'Nguồn sự thật của port, không hardcode' },
        { path: 'emulate/src/config/server.config.ts', action: 'read', note: 'Xác nhận route và port fallback' },
      ],
      handoff: `# Node n3: Executor gọi Emulate service (branch recon)

Mục tiêu: nối ListHosts/ListSources parser với Emulate service.

Đã xong: ListHostsExecutor.ts.
Còn lại: ListSourcesExecutor.ts, reconClient.ts, xử lý lỗi mất kết nối.

Lưu ý:
- Port lấy từ refreshEmulateBaseFromIpc, không hardcode.
- Bám mẫu modules/Emulate/executors/ListHostsExecutor.ts.
- Không sửa lỗi tsc cũ ở RunCommandExecutor.

Xong thì tick checklist và chuyển sang node n4.`,

    },
    {
      id: 'n4',
      title: 'Renderer hiển thị kết quả RECON',
      summary: 'Bảng host và source, có lọc theo domain.',
      status: 'todo',
      dependsOn: ['n3'],
      description:
        'Hiển thị kết quả của list_hosts và list_sources thành các bảng gọn gàng ngay trong chat. Bảng host cần có ô lọc theo domain, cùng trạng thái loading và empty state rõ ràng khi chưa có dữ liệu. Renderer được đăng ký qua ModuleRegistry và bám theo cấu trúc của GitStatusRenderer, không import trực tiếp vào TagRouter.',
      subtasks: [
        { id: 'n4-s1', text: 'ReconResultRenderer.tsx', done: false },
        { id: 'n4-s2', text: 'HostsTable.tsx', done: false },
        { id: 'n4-s3', text: 'Đăng ký renderer qua ModuleRegistry', done: false },
      ],
      files: [
        { path: 'src/renderer/src/modules/Recon/renderers/ReconResultRenderer.tsx', action: 'create', note: 'Entry renderer cho kết quả tool: nhận output của executor và chọn bảng phù hợp (hosts hoặc sources)' },
        { path: 'src/renderer/src/modules/Recon/renderers/HostsTable.tsx', action: 'create', note: 'Bảng host có ô lọc theo domain, cần empty state và loading state' },
        { path: 'src/renderer/src/modules/Recon/ReconModule.ts', action: 'modify', note: 'Gắn renderer vào module qua khai báo renderers, không import trong TagRouter' },
        { path: 'src/renderer/src/modules/Code/renderers/GitStatusRenderer.tsx', action: 'read', note: 'Mẫu renderer để bám theo: cấu trúc props, cách render danh sách và trạng thái rỗng' },
      ],
      handoff: `# Node n4: Renderer RECON (branch recon)

Phụ thuộc: n3 hoàn tất (executor trả dữ liệu).
Làm: ReconResultRenderer.tsx và HostsTable.tsx, đăng ký qua ReconModule.ts.
Bám mẫu GitStatusRenderer.tsx. Không import renderer trực tiếp vào TagRouter.`,

    },
    {
      id: 'n5',
      title: 'Prompt hệ thống cho agent RECON',
      summary: 'Khai báo CAPABILITIES và prompt cho agent.',
      status: 'blocked',
      dependsOn: ['n3', 'n4'],
      description:
        'Tạo prompt hệ thống cho agent RECON và khai báo CAPABILITIES đúng với các tool đã hoàn thiện. Node này bị chặn vì danh sách tool khả dụng chỉ chốt được sau khi executor (n3) và renderer (n4) xong. Khi mở khóa, bám theo prompts/code/config.ts, lưu ý toolFormats cần ít nhất một phần tử.',
      subtasks: [
        { id: 'n5-s1', text: 'prompts/recon/config.ts', done: false },
        { id: 'n5-s2', text: 'prompts/recon/index.ts', done: false },
      ],
      files: [
        { path: 'src/renderer/src/modules/Recon/prompts/recon/config.ts', action: 'create', note: 'Export CAPABILITIES: toolFormats, promptLength, styleCode theo quy ước prompt capabilities' },
        { path: 'src/renderer/src/modules/Recon/prompts/recon/index.ts', action: 'create', note: 'Nội dung prompt, liệt kê các tool RECON khả dụng' },
        { path: 'src/renderer/src/modules/Code/prompts/code/config.ts', action: 'read', note: 'Mẫu CAPABILITIES để bám theo' },
      ],
      handoff: `# Node n5: Prompt hệ thống RECON (branch recon)

Bị chặn: chờ n3 và n4.
Khi mở khóa: tạo prompts/recon/config.ts với CAPABILITIES, bám mẫu prompts/code/config.ts.`,

    },
  ],
};