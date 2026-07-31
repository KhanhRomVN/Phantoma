import { useCodeStore } from "../../hooks/useCodeStore";
import { cn } from "../../../../shared/lib/utils";

const TYPE_ICONS: Record<string, string> = {
  website: "🌐",
  app: "📱",
  device: "📲",
  database: "🗄️",
  api: "🔌",
  design: "🎨",
  table: "📊",
};

const TYPE_COLORS: Record<string, string> = {
  website: "text-cyan",
  app: "text-purple",
  device: "text-green",
  database: "text-blue",
  api: "text-yellow",
  design: "text-pink",
  table: "text-teal",
};

export function ServiceTabBar() {
  const { projects, currentProjectId, currentServiceId, setCurrentService } = useCodeStore();
  const project = projects.find((p) => p.id === currentProjectId);

  if (!project || project.services.length === 0) {
    return (
      <div className="flex items-center h-9 bg-sidebar-background border-b border-divider px-3 text-xs text-text-secondary/40">
        No services docked
      </div>
    );
  }

  return (
    <div className="flex items-center h-9 bg-sidebar-background border-b border-divider px-2 overflow-x-auto flex-shrink-0 gap-0.5">
      {project.services.map((service) => {
        const isActive = service.id === currentServiceId;
        const colorClass = TYPE_COLORS[service.type] || "text-text-secondary";
        return (
          <button
            key={service.id}
            onClick={() => setCurrentService(service.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 h-full text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
              isActive
                ? "text-text-primary border-primary"
                : "text-text-secondary/60 border-transparent hover:text-text-secondary hover:border-divider"
            )}
          >
            <span className={cn("text-sm", colorClass)}>{TYPE_ICONS[service.type] || "📄"}</span>
            {service.name}
            <span className={cn(
              "w-1.5 h-1.5 rounded-full flex-shrink-0",
              service.status === "running" && "bg-success",
              service.status === "stopped" && "bg-text-secondary/30",
              service.status === "building" && "bg-warn animate-pulse",
              service.status === "error" && "bg-error"
            )} />
            <span className="text-[9px] text-text-secondary/40">{service.meta}</span>
          </button>
        );
      })}
    </div>
  );
}