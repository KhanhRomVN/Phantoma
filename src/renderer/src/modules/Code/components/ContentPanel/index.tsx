import { useCodeStore } from '../../hooks/useCodeStore';
import { FileTabBar } from '../FileTabBar';

export function ContentPanel() {
  const {
    projects,
    currentProjectId,
    currentServiceId,
    currentFileId,
    openFiles,
    activeFileTabId,
  } = useCodeStore();
  const project = projects.find((p) => p.id === currentProjectId);
  const service = project?.services.find((s) => s.id === currentServiceId);

  // Nếu có file đang mở -> hiển thị file content
  if (activeFileTabId && openFiles.length > 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <FileTabBar />
        <div className="flex-1 overflow-auto p-4 text-text-secondary">
          <div className="text-sm text-text-secondary/60">File content placeholder</div>
          <div className="text-xs text-text-secondary/40 mt-2">Active file: {activeFileTabId}</div>
        </div>
      </div>
    );
  }

  // Nếu có service đang chọn -> hiển thị service content
  if (service) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-text-secondary/60">
        <div className="text-center">
          <div className="text-4xl mb-3">{TYPE_ICONS[service.type] || '📄'}</div>
          <div className="text-sm font-medium text-text-primary">{service.name}</div>
          <div className="text-xs text-text-secondary/40 mt-1">Service is ready</div>
          <div className="text-xs text-text-secondary/30 mt-2">Status: {service.status}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-background text-text-secondary/40">
      <div className="text-center">
        <div className="text-4xl mb-3">📂</div>
        <div className="text-sm">Select a service or open a file</div>
        <div className="text-xs text-text-secondary/30 mt-1">Browse files in Activity Panel</div>
      </div>
    </div>
  );
}

const TYPE_ICONS: Record<string, string> = {
  website: '🌐',
  app: '📱',
  device: '📲',
  database: '🗄️',
  api: '🔌',
  design: '🎨',
  table: '📊',
};
