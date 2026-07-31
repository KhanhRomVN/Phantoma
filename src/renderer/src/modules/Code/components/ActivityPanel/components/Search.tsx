import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";

export function Search() {
  const [query, setQuery] = useState("");

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-input-background border border-border rounded-lg">
        <SearchIcon className="w-3.5 h-3.5 text-text-secondary/40" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Search files..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-secondary/40"
        />
      </div>
      {query && (
        <div className="mt-3 text-xs text-text-secondary/40">No results found</div>
      )}
    </div>
  );
}