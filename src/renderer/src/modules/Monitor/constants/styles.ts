import { c } from '../utils/color';
import { THEME } from './theme';

export const CSS = `
.mn{${Object.entries(THEME)
  .map(([k, v]) => `--${k}:${v}`)
  .join(
    ';',
  )};display:flex;height:100%;min-height:600px;width:100%;overflow:hidden;position:relative;background:${c('bg')};color:${c('tp')};font-family:Inter,'IBM Plex Mono',system-ui,sans-serif;font-size:12px}
.mn *{box-sizing:border-box}
.mn button{font:inherit;color:inherit;cursor:pointer;border:0;background:none}
.mn button:disabled{opacity:.4;cursor:default}
.mn input,.mn select,.mn textarea{font:inherit;color:${c('tp')};outline:none}
.mn .soft{display:inline-flex;align-items:center;gap:6px;border-radius:6px;padding:0 12px;height:32px;background:${c('ts', 0.1)};color:${c('ts')};white-space:nowrap}
.mn .soft:hover{background:${c('ts', 0.15)};color:${c('tp')}}
.mn .prim{display:inline-flex;align-items:center;gap:6px;border-radius:6px;padding:0 12px;height:32px;background:${c('primary', 0.1)};color:${c('primary')};white-space:nowrap}
.mn .prim:hover{background:${c('primary', 0.2)}}
.mn .dng{display:inline-flex;align-items:center;gap:6px;border-radius:6px;padding:0 12px;height:32px;background:${c('error', 0.15)};color:${c('error')};white-space:nowrap}
.mn .ico{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px;background:${c('ts', 0.1)};color:${c('ts')}}
.mn .ico:hover{background:${c('ts', 0.15)};color:${c('tp')}}
.mn .field{width:100%;height:34px;border-radius:8px;border:1px solid ${c('border')};background:${c('input')};padding:0 10px}
.mn textarea.field{height:auto;padding:8px 10px;resize:none}
.mn .field:focus{border-color:${c('primary', 0.6)}}
.mn .chip{display:inline-flex;align-items:center;gap:6px;border-radius:6px;padding:4px 10px;background:${c('ts', 0.1)};color:${c('ts')};font-weight:500;white-space:nowrap}
.mn .chip:hover{background:${c('ts', 0.15)};color:${c('tp')}}
.mn .chip.on{background:${c('ts', 0.25)};color:${c('tp')}}
.mn tbody tr:hover{background:${c('rowHover')}}
.mn .card{background:${c('card')};border-radius:6px}
.mn .sec{background:${c('card')};border-radius:6px;padding:12px 14px;margin-bottom:12px}
.mn .row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid ${c('border', 0.4)}}
.mn .row:last-child{border-bottom:0}
.mn .mono{font-family:'IBM Plex Mono',monospace}
.mn .sub{color:${c('ts')};font-size:11px}
.mn .tr{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mn .menu{position:fixed;z-index:60;width:200px;background:${c('dropdown')};border:1px solid ${c('border')};border-radius:8px;padding:4px}
.mn .menu button{display:flex;width:100%;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;text-align:left}
.mn .menu button:hover{background:${c('dropHover')}}
.mn .nav{display:flex;width:100%;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;color:${c('ts')};text-align:left}
.mn .nav:hover{background:${c('ts', 0.1)};color:${c('tp')}}
.mn .nav.on{background:${c('primary', 0.12)};color:${c('primary')}}
.mn .post{border:1px solid transparent;transition:border-color .15s}
.mn .post:hover{border-color:${c('border')};background:${c('cardHover')}}
.mn .skel{background:${c('ts', 0.12)};border-radius:6px;animation:mnpulse 1.2s ease-in-out infinite}
@keyframes mnpulse{0%,100%{opacity:.4}50%{opacity:1}}
.mn .scroll{overflow-y:auto;min-height:0}
.mn .scroll::-webkit-scrollbar{width:6px}
.mn .scroll::-webkit-scrollbar-thumb{background:${c('border')};border-radius:6px}
.mn .bnav{display:none}
@media (max-width:1100px){.mn .rr{display:none!important}}
@media (max-width:800px){
  .mn{flex-direction:column}
  .mn .lr{display:none!important}
  .mn .bnav{display:flex;border-top:1px solid ${c('border')};background:${c('panel')};padding:6px;gap:4px;justify-content:space-around}
  .mn .detail-cols{flex-direction:column!important}
}
`;

export const NOISE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

export const CSS_EXTRA = `
.mn{font-feature-settings:'ss01' 1,'cv11' 1;-webkit-font-smoothing:antialiased}
.mn .tnum,.mn .mono{font-variant-numeric:tabular-nums;font-feature-settings:'tnum' 1}
.mn button,.mn .chip,.mn .nav,.mn .card,.mn .field{transition:background-color .16s ease-out,color .16s ease-out,border-color .16s ease-out,box-shadow .18s ease-out,transform .14s ease-out,opacity .16s}
.mn button:active:not(:disabled){transform:scale(.96)}
.mn :focus-visible{outline:2px solid ${c('primary', 0.4)};outline-offset:2px}
.mn .field:focus-visible{outline:none;box-shadow:0 0 0 2px ${c('primary', 0.4)}}

.mn .card{box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}
.mn .post:hover{transform:translateY(-1px);box-shadow:0 10px 28px -14px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.05)}
.mn .noise{position:relative}
.mn .noise::before{content:'';position:absolute;inset:0;pointer-events:none;border-radius:inherit;background-image:${NOISE}}
.mn .skel{background:linear-gradient(90deg,${c('ts', 0.07)} 0%,${c('ts', 0.2)} 50%,${c('ts', 0.07)} 100%);background-size:200% 100%;animation:mnshimmer 1.5s linear infinite}
.mn .avs{background-size:200% 200%;background-position:0 0;transition:background-position .45s ease-out}
.mn .avs:hover{background-position:100% 100%}
.mn .scanline{position:absolute;left:0;right:0;top:-30%;height:30%;pointer-events:none;z-index:2;background:linear-gradient(transparent,${c('info', 0.22)},transparent);animation:mnscan 1.8s ease-out 1 both}
.mn .shimmer-badge{background:linear-gradient(90deg,${c('primary', 0.12)} 0%,${c('primary', 0.32)} 50%,${c('primary', 0.12)} 100%);background-size:200% 100%;animation:mnshimmer 2.8s linear infinite}
.mn .div-grad{height:1px;background:linear-gradient(90deg,transparent,${c('border')} 20%,${c('border')} 80%,transparent)}
.mn .card-pop{animation:mnpop .3s ease-out both}
.mn .dot-live{animation:mnbreathe 2.4s ease-in-out infinite}
.mn kbd{font-family:'IBM Plex Mono',monospace;font-size:10px;padding:1px 5px;border-radius:4px;border:1px solid ${c('border')};border-bottom-width:2px;color:${c('ts')};background:${c('ts', 0.06)}}
.mn input[type=range]{accent-color:rgb(var(--primary));width:100%}
.mn .rail-toggle{display:none}
.mn .rr.open{display:block!important;position:fixed;right:0;top:0;bottom:0;z-index:58;width:min(320px,92vw);box-shadow:-24px 0 60px rgba(0,0,0,.6)}
.mn.focus .lr,.mn.focus .rr{display:none!important}
@keyframes mnshimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes mnwave{to{stroke-dashoffset:-240}}
@keyframes mndraw{from{stroke-dashoffset:var(--len,300)}to{stroke-dashoffset:0}}
@keyframes mnscan{0%{top:-30%}100%{top:110%}}
@keyframes mnorbit{to{transform:rotate(360deg)}}
@keyframes mnrad{to{transform:rotate(360deg)}}
@keyframes mnbreathe{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.1);opacity:1}}
@keyframes mnfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes mnflash{0%{box-shadow:0 0 0 0 ${c('warn', 0.55)}}100%{box-shadow:0 0 0 22px ${c('warn', 0)}}}
@keyframes mnpulseRed{0%,100%{box-shadow:inset 3px 0 0 ${c('error', 0.9)},0 0 0 0 ${c('error', 0)}}50%{box-shadow:inset 3px 0 0 ${c('error', 0.9)},0 0 14px 0 ${c('error', 0.25)}}}
@keyframes mnpop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
@keyframes mnringout{0%{transform:scale(.5);opacity:.85}100%{transform:scale(2.6);opacity:0}}
@keyframes mnslide{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
@media (max-width:1100px){.mn .rail-toggle{display:inline-flex}}
@media (max-width:800px){
  .mn .bnav{position:fixed;left:12px;right:12px;bottom:12px;z-index:50;border-radius:24px;padding:8px 10px;background:rgba(17,17,29,.68);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid ${c('border')};box-shadow:0 16px 40px -12px rgba(0,0,0,.7)}
  .mn main{padding-bottom:84px}
}
@media (prefers-reduced-motion:reduce){.mn *{animation-duration:.01ms!important;animation-iteration-count:1!important}}
`;