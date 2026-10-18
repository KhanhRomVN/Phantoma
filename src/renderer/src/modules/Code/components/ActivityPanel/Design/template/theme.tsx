import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { LOGO_DARK, LOGO_LIGHT } from './logos';

export type ThemeName = 'light' | 'dark';

const STORAGE_KEY = 'pt';

const CSS = `
.ph{--bg:#f6f6fc;--s:#fff;--s2:#eeeefa;--bd:#e0e0f0;--fg:#14142b;--mu:#5f5f7e;--p:#6a45f5;--c:#0891b2;--g:linear-gradient(115deg,#6a45f5,#0ea5c6);--glow:rgba(106,69,245,.2);--gh:#12121f;--ey:#fff}
.ph[data-theme='dark']{--bg:#07070d;--s:#0f0f1a;--s2:#171728;--bd:#26263a;--fg:#f4f4fb;--mu:#9a9ab8;--p:#8b6dff;--c:#22d3ee;--g:linear-gradient(115deg,#8b6dff,#22d3ee);--glow:rgba(139,109,255,.28);--gh:#f4f4fb;--ey:#0a0a14}
*{box-sizing:border-box;margin:0}
html{scroll-behavior:smooth;scroll-padding-top:84px}
.ph{min-height:100vh;font:16px/1.65 Inter,system-ui,sans-serif;background:var(--bg);color:var(--fg);overflow-x:hidden;-webkit-font-smoothing:antialiased;transition:background .3s,color .3s}
.ph a{color:inherit;text-decoration:none}
.ph :focus-visible{outline:2px solid var(--p);outline-offset:3px;border-radius:8px}
.w{max-width:1160px;margin:0 auto;padding:0 24px}
.mono{font-family:'IBM Plex Mono',ui-monospace,monospace}
.gr{background:var(--g);-webkit-background-clip:text;background-clip:text;color:transparent}
.i{width:1.15em;height:1.15em;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.i.f{fill:currentColor;stroke:none}
[data-i]{display:inline-flex}
.logo{width:34px;height:34px;background-position:center;background-size:contain;background-repeat:no-repeat;flex:none}
header{position:sticky;top:0;z-index:50;backdrop-filter:blur(16px);background:color-mix(in srgb,var(--bg) 78%,transparent);border-bottom:1px solid var(--bd)}
header .w{display:flex;align-items:center;gap:28px;height:66px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:19px;letter-spacing:-.02em}
.nl{display:flex;gap:22px;margin-left:auto;font-size:14.5px;color:var(--mu)}
.nl a:hover,.nl a.on{color:var(--fg)}
.btn{display:inline-flex;gap:9px;align-items:center;justify-content:center;padding:11px 20px;border-radius:12px;font:600 15px Inter,sans-serif;border:1px solid var(--bd);background:var(--s);color:var(--fg);cursor:pointer;transition:transform .2s,border-color .2s,box-shadow .2s}
.btn:hover{transform:translateY(-2px);border-color:var(--p)}
.btn.pr{background:var(--g);color:#fff;border:0;box-shadow:0 10px 32px var(--glow)}
.btn.sm{padding:7px 13px;font-size:13.5px;border-radius:10px}
.star{display:inline-flex;gap:6px;align-items:center}
.star b{font-weight:600;padding-left:9px;border-left:1px solid var(--bd)}
.ic{width:38px;height:38px;padding:0;border-radius:11px}
.hero{position:relative;padding:76px 0 40px}
.aur{position:absolute;inset:-80px 0 auto;height:640px;pointer-events:none;z-index:-1;background:radial-gradient(600px 380px at 78% 30%,var(--glow),transparent 70%),radial-gradient(520px 320px at 10% 0%,rgba(34,211,238,.13),transparent 70%)}
.hg{display:grid;grid-template-columns:1.1fr .9fr;gap:30px;align-items:center}
.pill{display:inline-flex;gap:8px;align-items:center;padding:5px 13px 5px 8px;border:1px solid var(--bd);border-radius:99px;background:var(--s);font-size:13.5px;color:var(--mu)}
.pill i{width:8px;height:8px;border-radius:50%;background:var(--c);box-shadow:0 0 0 4px var(--glow);animation:pl 2.4s infinite}
@keyframes pl{50%{box-shadow:0 0 0 8px transparent}}
h1{font-size:clamp(42px,6.2vw,78px);line-height:1.02;letter-spacing:-.045em;font-weight:800;margin:22px 0}
.lead{font-size:19px;color:var(--mu);max-width:520px}
.verbs{margin:22px 0 30px;font-size:15px;color:var(--mu)}
.verbs b{color:var(--p);display:inline-block;min-width:92px;font-weight:500}
.cta{display:flex;gap:12px;flex-wrap:wrap}
.note{margin-top:14px;font-size:13.5px;color:var(--mu)}
.gh{position:relative;aspect-ratio:1;max-width:470px;margin:auto;width:100%}
.gh svg{width:100%;height:100%;overflow:visible;animation:fl 6s ease-in-out infinite}
@keyframes fl{50%{transform:translateY(-12px)}}
.chip{position:absolute;padding:7px 12px;border-radius:11px;background:var(--s);border:1px solid var(--bd);font-size:12.5px;box-shadow:0 12px 30px var(--glow);animation:fl 5s ease-in-out infinite}
.chip em{font-style:normal;color:var(--c)}
.app{margin-top:46px;border:1px solid var(--bd);border-radius:20px;background:var(--s);box-shadow:0 40px 90px -30px var(--glow);overflow:hidden}
.bar{display:flex;gap:7px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--bd);background:var(--s2);font-size:12.5px;color:var(--mu)}
.bar i{width:11px;height:11px;border-radius:50%;background:var(--bd)}
.am{display:grid;grid-template-columns:150px 1fr 250px;min-height:300px;font-size:13px}
.am>div{padding:14px}
.sd{border-right:1px solid var(--bd);display:flex;flex-direction:column;gap:4px}
.sd span{padding:7px 10px;border-radius:9px;color:var(--mu)}
.sd .on{background:var(--s2);color:var(--fg)}
.tr{display:grid;grid-template-columns:54px 1fr 44px 52px;gap:10px;padding:8px 10px;border-radius:8px;color:var(--mu)}
.tr.hl{background:var(--glow);color:var(--fg);position:relative}
.m{font-weight:500}.g{color:#16a34a}.po{color:var(--p)}.r{color:#e11d48}
.ag{border-left:1px solid var(--bd);display:flex;flex-direction:column;gap:10px}
.bb{padding:9px 12px;border-radius:12px;background:var(--s2);color:var(--mu);font-size:12.5px}
.tc{padding:10px 12px;border-radius:12px;border:1px dashed var(--p);font-size:12px}
.tc b{color:var(--p)}
section{padding:96px 0}
h2{font-size:clamp(30px,4vw,46px);line-height:1.1;letter-spacing:-.035em;font-weight:800;max-width:680px}
.sub{color:var(--mu);margin-top:14px;max-width:560px;font-size:17px}
.mq{overflow:hidden;border-block:1px solid var(--bd);padding:18px 0;margin-top:56px;mask:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.mt{display:flex;gap:44px;width:max-content;animation:mq 38s linear infinite;color:var(--mu);font-size:15px}
.mt span{display:flex;gap:9px;align-items:center}
.mt span:before{content:'';width:6px;height:6px;border-radius:50%;background:var(--g)}
@keyframes mq{to{transform:translateX(-50%)}}
.mq p{text-align:center;font-size:13.5px;color:var(--mu);margin-bottom:14px}
.bento{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;margin-top:48px}
.cd{position:relative;grid-column:span 2;padding:26px;border:1px solid var(--bd);border-radius:22px;background:var(--s);overflow:hidden;transition:border-color .25s}
.cd.wd{grid-column:span 4}
.cd:before{content:'';position:absolute;inset:0;background:radial-gradient(320px circle at var(--x,50%) var(--y,0),var(--glow),transparent 70%);opacity:0;transition:opacity .3s}
.cd:hover{border-color:var(--p)}.cd:hover:before{opacity:1}
.cd>*{position:relative}
.cd .ico{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:var(--g);color:#fff;font-size:20px;margin-bottom:18px}
.cd h3{font-size:20px;letter-spacing:-.02em}
.cd p{color:var(--mu);margin:8px 0 14px;font-size:15px}
.cd ul{list-style:none;padding:0;font-size:14px;display:grid;gap:5px}
.cd li{display:flex;gap:9px}
.cd li:before{content:'';flex:none;margin-top:9px;width:5px;height:5px;border-radius:50%;background:var(--c)}
.sp{display:grid;grid-template-columns:.9fr 1.1fr;gap:40px;margin-top:48px;align-items:start}
.tabs{display:grid;gap:6px}
.tab{text-align:left;padding:13px 16px;border-radius:14px;border:1px solid transparent;background:none;color:var(--mu);font:500 15px Inter,sans-serif;cursor:pointer;transition:.2s}
.tab:hover{color:var(--fg)}
.tab[aria-selected='true']{background:var(--s);border-color:var(--bd);color:var(--fg);box-shadow:0 10px 30px -14px var(--glow)}
.pn{border:1px solid var(--bd);border-radius:22px;background:var(--s);padding:28px;min-height:280px;animation:in .35s}
.pn h3{font-size:22px;letter-spacing:-.02em}
.pn p{color:var(--mu);margin:10px 0 18px}
.tg{display:flex;flex-wrap:wrap;gap:8px}
.tg span{padding:5px 12px;border-radius:99px;background:var(--s2);font-size:13px}
@keyframes in{from{opacity:0;transform:translateY(8px)}}
.flow{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:52px;position:relative}
.flow:before{content:'';position:absolute;top:21px;left:6%;right:6%;height:2px;background:var(--g);opacity:.4}
.st{padding:0 22px 0 0;position:relative}
.st .n{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--bg);border:2px solid var(--p);font-weight:700;margin-bottom:18px}
.st h3{font-size:22px}
.st p{color:var(--mu);margin-top:6px;max-width:300px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}
.sw{display:inline-flex;padding:4px;border-radius:14px;background:var(--s2);margin:22px 0 14px}
.sw button{padding:9px 16px;border-radius:11px;border:0;background:none;color:var(--mu);font:600 14px Inter,sans-serif;cursor:pointer}
.sw button[aria-pressed='true']{background:var(--s);color:var(--fg);box-shadow:0 4px 14px -6px var(--glow)}
.term{border:1px solid var(--bd);border-radius:18px;background:var(--s);padding:20px;font-size:13px;display:grid;gap:12px}
.term .tc{border-style:solid}
.ok{color:#16a34a}
.ask{display:flex;gap:8px;margin-top:8px}
.ask span{padding:4px 12px;border-radius:8px;background:var(--g);color:#fff;font-size:12px}
.ask span+span{background:var(--s2);color:var(--fg)}
.facts{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
.facts span{padding:6px 13px;border:1px solid var(--bd);border-radius:99px;font-size:13.5px;color:var(--mu)}
.dl{border:1px solid var(--bd);border-radius:28px;background:var(--s);padding:44px;position:relative;overflow:hidden}
.dl:after{content:'';position:absolute;width:420px;height:420px;right:-120px;top:-160px;background:radial-gradient(var(--glow),transparent 70%);pointer-events:none}
.os{display:flex;gap:8px;margin:26px 0 18px;flex-wrap:wrap}
.os button{padding:9px 18px;border-radius:12px;border:1px solid var(--bd);background:none;color:var(--mu);font:600 14px Inter,sans-serif;cursor:pointer}
.os button[aria-pressed='true']{border-color:var(--p);color:var(--fg);background:var(--s2)}
.cp{display:flex;gap:10px;align-items:center;margin-top:26px;padding:12px 14px;border-radius:14px;background:var(--s2);font-size:13.5px;max-width:520px}
.cp code{flex:1;overflow:auto;white-space:nowrap}
.cm{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:44px}
.cm .cd{grid-column:auto;display:flex;flex-direction:column;align-items:flex-start}
.cm .btn{margin-top:auto}
.big{font-size:36px;font-weight:800;letter-spacing:-.03em}
details{border-bottom:1px solid var(--bd);padding:20px 0}
summary{cursor:pointer;font-weight:600;font-size:17px;list-style:none;display:flex;justify-content:space-between;gap:16px}
summary:after{content:'+';color:var(--p);font-size:22px;line-height:1;transition:transform .25s}
details[open] summary:after{transform:rotate(45deg)}
details p{color:var(--mu);margin-top:10px;max-width:680px}
footer{border-top:1px solid var(--bd);padding:48px 0 36px;font-size:14px;color:var(--mu)}
.fg{display:flex;gap:40px;flex-wrap:wrap;justify-content:space-between}
.fl{display:flex;gap:42px}
.fl div{display:grid;gap:8px;align-content:start}
.fl b{color:var(--fg)}
.fl a:hover{color:var(--fg)}
.cr{margin-top:34px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;font-size:13px}
dialog{margin:auto;border:1px solid var(--bd);border-radius:22px;background:var(--s);color:var(--fg);padding:28px;width:min(480px,92vw)}
dialog::backdrop{background:rgba(5,5,12,.6);backdrop-filter:blur(4px)}
dialog h3{font-size:22px;margin-bottom:16px}
dialog label{display:grid;gap:6px;font-size:13.5px;color:var(--mu);margin-bottom:14px}
dialog input,dialog select,dialog textarea{font:15px Inter,sans-serif;padding:11px 13px;border-radius:11px;border:1px solid var(--bd);background:var(--bg);color:var(--fg)}
dialog textarea{min-height:110px;resize:vertical}
.rv{opacity:0;transform:translateY(18px);transition:opacity .7s,transform .7s}
.rv.in{opacity:1;transform:none}
@media(max-width:900px){.nl{display:none}header .w{gap:12px}header .brand{margin-right:auto}.hg,.sp,.two{grid-template-columns:1fr}.gh{max-width:340px}.am{grid-template-columns:1fr}.sd,.ag{display:none}.bento{grid-template-columns:1fr 1fr}.cd,.cd.wd{grid-column:span 2}.flow{grid-template-columns:1fr;gap:34px}.flow:before{display:none}.cm{grid-template-columns:1fr}.dl{padding:28px}section{padding:70px 0}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.rv{opacity:1;transform:none}}
`;

const ICONS: Record<string, ReactNode> = {
  terminal: <path d="M4 17l6-6-6-6M12 19h8" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </>
  ),
  act: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  spark: <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />,
  layout: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M3 9h18M9 21V9" />
    </>
  ),
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  down: <path d="M12 4v12m-5-5l5 5 5-5M4 20h16" />,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
    </>
  ),
  moon: <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z" />,
  bug: (
    <>
      <rect x="8" y="7" width="8" height="13" rx="4" />
      <path d="M9 7a3 3 0 0 1 6 0M4 12h4M16 12h4M5 19l3-2M19 19l-3-2M5 5l3 2M19 5l-3 2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" />
    </>
  ),
  git: (
    <path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5z" />
  ),
};

export function Icon({ n, f }: { n: string; f?: boolean }) {
  return (
    <span data-i={n}>
      <svg className={f ? 'i f' : 'i'} viewBox="0 0 24 24">
        {ICONS[n]}
      </svg>
    </span>
  );
}

export function Logo() {
  const { theme } = useTheme();
  return (
    <span
      className="logo"
      style={{ backgroundImage: `url(${theme === 'dark' ? LOGO_DARK : LOGO_LIGHT})` }}
    />
  );
}

interface ThemeContextValue {
  theme: ThemeName;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', toggle: () => {} });

function readInitial(): ThemeName {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    /* storage is blocked inside the sandboxed preview */
  }
  return window.matchMedia('(prefers-color-scheme:light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(readInitial);

  const toggle = () => {
    const next: ThemeName = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage is blocked inside the sandboxed preview */
    }
  };

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (list) =>
        list.forEach((x) => {
          if (x.isIntersecting) {
            x.target.classList.add('in');
            io.unobserve(x.target);
          }
        }),
      { threshold: 0.12 },
    );
    document.querySelectorAll('.rv').forEach((e) => io.observe(e));
    const spot = (e: Event) => {
      const c = e.currentTarget as HTMLElement;
      const ev = e as PointerEvent;
      const r = c.getBoundingClientRect();
      c.style.setProperty('--x', ev.clientX - r.left + 'px');
      c.style.setProperty('--y', ev.clientY - r.top + 'px');
    };
    const cards = Array.from(document.querySelectorAll('.cd'));
    cards.forEach((c) => c.addEventListener('pointermove', spot));
    return () => {
      io.disconnect();
      cards.forEach((c) => c.removeEventListener('pointermove', spot));
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <style>{CSS}</style>
      <div className="ph" data-theme={theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}