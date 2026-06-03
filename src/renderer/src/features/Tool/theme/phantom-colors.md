# Phantom Theme Color Mapping

## HTML CSS Variables → Tailwind Classes

```
--bg:         #080a0e  → bg-[#080a0e]
--bg2:        #0d1017  → bg-[#0d1017]
--bg3:        #111520  → bg-[#111520]
--bg4:        #161b26  → bg-[#161b26]

--panel:      #0f1319  → bg-[#0f1319]
--panel2:     #141924  → bg-[#141924]

--border:     #1e2535  → border-[#1e2535]
--border2:    #252e42  → border-[#252e42]
--border-accent: #2a3a5c → border-[#2a3a5c]

--text:       #c5cfe0  → text-[#c5cfe0]
--text2:      #6b7a96  → text-[#6b7a96]
--text3:      #3d4a61  → text-[#3d4a61]

--accent:     #00d4ff  (cyan-400) → already using cyan-400
--red:        #ff3b5c  (red-400)  → already using red-400
--green:      #00e5a0  (green-400) → already using green-400
--amber:      #ffaa00  (amber-400) → already using amber-400
--purple:     #a855f7  (purple-400) → already using purple-400
```

## Quick Replace Guide

Old (zinc) → New (phantom)
- `zinc-950` → `[#080a0e]` (bg) or `[#0f1319]` (panel)
- `zinc-900` → `[#141924]` (panel2)
- `zinc-800` → `[#1e2535]` (border)
- `zinc-700` → `[#252e42]` (border2)
- `zinc-600` → `[#3d4a61]` (text3)
- `zinc-500` → `[#6b7a96]` (text2)
- `zinc-400` → `[#6b7a96]` (text2)
- `zinc-300` → `[#c5cfe0]` (text)
- `zinc-200` → `[#c5cfe0]` (text)
- `zinc-100` → `[#c5cfe0]` (text)
