export const GLOBAL_CSS = `
  .ch-root *{box-sizing:border-box}
  .ch-scroll::-webkit-scrollbar{width:6px;height:6px}
  .ch-scroll::-webkit-scrollbar-thumb{background:rgb(var(--border));border-radius:6px}
  .ch-hv{transition:background .12s,border-color .12s}
  .ch-hv:hover{background:rgb(var(--card-background-hover))}
  .ch-hv2:hover{background:rgb(var(--dropdown-item-hover))}
  .ch-show-hover{opacity:0;transition:opacity .12s}
  .ch-row:hover .ch-show-hover{opacity:1}
  .ch-stealth .ch-msg{filter:blur(6px);transition:filter .15s}
  .ch-stealth .ch-msg:hover{filter:none}
  @keyframes ch-pulse{0%,100%{opacity:1}50%{opacity:.35}}
  .ch-blink{animation:ch-pulse 1.2s ease-in-out infinite}
  @media (prefers-reduced-motion:reduce){.ch-blink{animation:none}}
  .ch-root input::placeholder,.ch-root textarea::placeholder{color:rgb(var(--text-secondary))}
  .ch-root button:focus-visible,.ch-root input:focus-visible,.ch-root textarea:focus-visible{outline:1px solid rgb(var(--primary));outline-offset:1px}
`;