import { useEffect, useState, type ReactNode } from 'react';
import { NAV, SITE } from './site';
import { Icon, Logo, ThemeProvider, useTheme } from './theme';

export function navigate(route: string) {
  window.parent.postMessage({ type: 'phantoma-design:navigate', route }, '*');
}

function RouteLink({
  route,
  className,
  children,
}: {
  route: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={route}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        navigate(route);
      }}
    >
      {children}
    </a>
  );
}

const fmt = (n: number) => (n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '') + 'k' : String(n));

export function useStars(): string {
  const [stars, setStars] = useState('—');
  useEffect(() => {
    fetch('https://api.github.com/repos/KhanhRomVN/Phantoma')
      .then((r) => r.json())
      .then((d) => {
        if (d.stargazers_count != null) setStars(fmt(d.stargazers_count));
      })
      .catch(() => {});
  }, []);
  return stars;
}

function Header({ current, stars }: { current: string; stars: string }) {
  const { theme, toggle } = useTheme();
  return (
    <header>
      <div className="w">
        <RouteLink route="/" className="brand">
          <Logo />
          {SITE.name}
        </RouteLink>
        <nav className="nl">
          {NAV.map((item) => (
            <RouteLink key={item.route} route={item.route} className={current === item.route ? 'on' : ''}>
              {item.label}
            </RouteLink>
          ))}
        </nav>
        <a className="btn sm star" href={SITE.repo} target="_blank" rel="noreferrer">
          <Icon n="git" f />
          Star<b>{stars}</b>
        </a>
        <button className="btn ic" onClick={toggle} aria-label="Switch theme">
          <Icon n={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer>
      <div className="w">
        <div className="fg">
          <div>
            <RouteLink route="/" className="brand">
              <Logo />
              {SITE.name}
            </RouteLink>
            <p style={{ marginTop: 10, maxWidth: 300 }}>{SITE.tagline}.</p>
          </div>
          <div className="fl">
            <div>
              <b>Product</b>
              <RouteLink route="/">Modules</RouteLink>
              <RouteLink route="/emulate">Emulate</RouteLink>
              <RouteLink route="/agent">AI Agent</RouteLink>
              <RouteLink route="/download">Download</RouteLink>
            </div>
            <div>
              <b>Project</b>
              <a href={SITE.repo} target="_blank" rel="noreferrer">
                GitHub
              </a>
              <a href={`${SITE.repo}/releases`} target="_blank" rel="noreferrer">
                Releases
              </a>
              <a href={`${SITE.repo}/issues`} target="_blank" rel="noreferrer">
                Issues
              </a>
              <a href={`mailto:${SITE.email}`}>Contact</a>
            </div>
          </div>
        </div>
        <div className="cr">
          <span>Built by {SITE.author}. Open source on GitHub.</span>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}

function Shell({
  current,
  children,
}: {
  current: string;
  children: (stars: string) => ReactNode;
}) {
  const stars = useStars();
  return (
    <>
      <Header current={current} stars={stars} />
      <main id="top">{children(stars)}</main>
      <Footer />
    </>
  );
}

export function SiteLayout({
  current,
  children,
}: {
  current: string;
  children: ReactNode | ((stars: string) => ReactNode);
}) {
  return (
    <ThemeProvider>
      <Shell current={current}>
        {(stars) => (typeof children === 'function' ? children(stars) : children)}
      </Shell>
    </ThemeProvider>
  );
}

export { RouteLink };