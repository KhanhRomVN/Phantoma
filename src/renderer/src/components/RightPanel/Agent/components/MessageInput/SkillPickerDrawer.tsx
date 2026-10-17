import { useEffect, useState } from "react";
import { X, Search, Sparkles } from "lucide-react";

export interface PickedSkill {
  slug: string;
  name: string;
}

interface SkillPickerDrawerProps {
  isOpen: boolean;
  /** Slug các skill đang được gắn vào input. */
  selectedSlugs: string[];
  onClose: () => void;
  onConfirm: (skills: PickedSkill[]) => void;
}

/**
 * Drawer chọn skill đã cài để gắn vào input. Slide từ dưới lên, cao 75%.
 * Hiện tại dùng dữ liệu mock vì service marketplace chưa port sang Phantoma.
 */
export default function SkillPickerDrawer({
  isOpen,
  selectedSlugs,
  onClose,
  onConfirm,
}: SkillPickerDrawerProps) {
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  
  // Mock data until real services are ported
  const mockSkills: PickedSkill[] = [
    { slug: "zen-cli-helper", name: "Zen CLI Helper" },
    { slug: "code-reviewer", name: "Code Reviewer" },
    { slug: "doc-generator", name: "Doc Generator" },
  ];

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setChecked(new Set(selectedSlugs));
  }, [isOpen, selectedSlugs]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredSkills = mockSkills.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.slug.toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (slug: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const confirm = () => {
    onConfirm(
      mockSkills.filter((s) => checked.has(s.slug)),
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className="relative w-full max-h-[75%] bg-card-background border-t border-border shadow-[0_-8px_32px_rgba(0,0,0,0.25)] rounded-t-xl flex flex-col animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Select Skills</h2>
            <p className="text-xs text-text-secondary opacity-70 mt-1">
              Choose installed skills for the agent to use
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-sidebar-item-hover text-text-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 shrink-0">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
            />
            <input
              type="text"
              autoFocus
              placeholder="Search skills..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm rounded-lg bg-input-background border border-transparent focus:border-primary outline-none text-text-primary placeholder:text-text-secondary/50"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
          {filteredSkills.length === 0 ? (
            <div className="py-6 text-center text-sm text-text-secondary opacity-70">
              No skills found
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredSkills.map((skill) => {
                const isChecked = checked.has(skill.slug);
                return (
                  <div
                    key={skill.slug}
                    onClick={() => toggle(skill.slug)}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all
                      ${isChecked 
                        ? "bg-primary/10 border-l-2 border-primary" 
                        : "hover:bg-sidebar-item-hover border-l-2 border-transparent"
                      }
                    `}
                  >
                    <span className="flex-1 text-sm text-text-primary truncate">
                      {skill.name}
                    </span>
                    <span className="text-xs text-text-secondary opacity-60 font-mono">
                      {skill.slug}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-500/10 text-text-secondary hover:bg-gray-500/20 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={checked.size === 0}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors
              ${checked.size > 0
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "bg-gray-500/10 text-text-secondary/50 cursor-not-allowed"
              }
            `}
          >
            <Sparkles size={14} />
            Apply{checked.size > 0 ? ` (${checked.size})` : ""}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.22s ease-out forwards; }
        .animate-fade-in { animation: fade-in 0.15s ease-out forwards; }
      `}</style>
    </div>
  );
}