import { X } from "lucide-react";
import { useCodeStore } from "../../hooks/useCodeStore";
import { cn } from "../../../../shared/lib/utils";

export function FileTabBar() {
  const { openFiles, activeFileTabId, setActiveFileTab, closeFile } = useCodeStore();

  if (openFiles.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center h-8 bg-sidebar-background border-b border-divider px-2 overflow-x-auto flex-shrink-0 gap-0.5">
      {openFiles.map((fileId) => (
        <button
          key={fileId}
          onClick={() => setActiveFileTab(fileId)}
          className={cn(
            "flex items-center gap-1.5 px-3 h-full text-xs whitespace-nowrap border-b-2 transition-colors group",
            activeFileTabId === fileId
              ? "text-text-primary border-primary"
              : "text-text-secondary/60 border-transparent hover:text-text-secondary hover:border-divider"
          )}
        >
          <span>📄</span>
          {fileId}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeFile(fileId);
            }}
            className="p-0.5 rounded hover:bg-sidebar-item-hover text-text-secondary/30 hover:text-text-secondary transition-colors opacity-0 group-hover:opacity-100"
          >
            <X className="w-3 h-3" strokeWidth={1.5} />
          </button>
        </button>
      ))}
    </div>
  );
}