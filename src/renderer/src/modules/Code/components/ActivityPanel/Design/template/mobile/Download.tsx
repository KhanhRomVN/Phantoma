import { useEffect, useRef, useState } from 'react';
import { SiteLayout, useStars } from './Layout';
import { SITE } from './site';
import { Icon } from './theme';

type Os = 'win' | 'mac' | 'lin';

const NAMES: Record<Os, string> = { win: 'Windows', mac: 'macOS', lin: 'Linux' };
const EXT: Record<Os, RegExp> = {
  win: /\.(exe|msi)$/i,
  mac: /\.dmg$/i,
  lin: /\.(appimage|deb|rpm)$/i,
};

function detectOs(): Os {
  if (/Mac/i.test(navigator.platform)) return 'mac';
  if (/Linux|X11/i.test(navigator.userAgent) && !/Android/i.test(navigator.userAgent)) return 'lin';
  return 'win';
}

function Body() {
  const stars = useStars();
  const [os, setOs] = useState<Os>(detectOs);
  const [assets, setAssets] = useState<{ name: string; browser_download_url: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState('Bug');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');

  useEffect(() => {
    fetch(`https://api.github.com/repos/KhanhRomVN/Phantoma/releases/latest`)
      .then((r) => r.json())
      .then((d) => {
        if (d.assets) setAssets(d.assets);
      })
      .catch(() => {});
  }, []);

  const asset = assets.find((a) => EXT[os].test(a.name));
  const href = asset ? asset.browser_download_url : `${SITE.repo}/releases`;
  const cmd = `git clone ${SITE.repo}`;

  const copy = () => {
    navigator.clipboard && navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const submit = () => {
    const t = title.trim() || 'Issue';
    const body = encodeURIComponent(
      `Type: ${type}\n\n${details}\n\nOS: ${navigator.platform}`,
    );
    window.open(
      `${SITE.repo}/issues/new?title=${encodeURIComponent(`[${type}] ${t}`)}&body=${body}`,
      '_blank',
    );
    dialog.current?.close();
  };

  return (
    <>
      <section id="download">
        <div className="w">
          <div className="dl rv">
            <h2>Get Phantoma</h2>
            <p className="sub">Free and open source. Pick your platform.</p>
            <div className="os">
              {(Object.keys(NAMES) as Os[]).map((o) => (
                <button key={o} aria-pressed={os === o} onClick={() => setOs(o)}>
                  {NAMES[o]}
                </button>
              ))}
            </div>
            <a className="btn pr" href={href} target="_blank" rel="noreferrer">
              <Icon n="down" />
              <span>Download for {NAMES[os]}</span>
            </a>
            <a
              className="btn"
              href={`${SITE.repo}/releases`}
              target="_blank"
              rel="noreferrer"
              style={{ marginLeft: 6 }}
            >
              All releases
            </a>
            <div className="cp mono">
              <code>{cmd}</code>
              <button className="btn sm ic" onClick={copy} aria-label="Copy command">
                <Icon n={copied ? 'star' : 'copy'} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="community" style={{ paddingTop: 20 }}>
        <div className="w">
          <h2 className="rv">Shape what comes next</h2>
          <p className="sub rv">
            Phantoma is built in the open by {SITE.author}. Star it, report a problem, or send a pull
            request.
          </p>
          <div className="cm">
            <div className="cd rv">
              <div className="big gr">{stars}</div>
              <h3>GitHub stars</h3>
              <p>Starring helps other security engineers find the project.</p>
              <a className="btn pr" href={SITE.repo} target="_blank" rel="noreferrer">
                <Icon n="star" />
                Star on GitHub
              </a>
            </div>
            <div className="cd rv">
              <div className="ico">
                <Icon n="bug" />
              </div>
              <h3>Submit an issue</h3>
              <p>
                Found a bug or need a feature? Describe it here and we'll open a pre-filled GitHub
                issue.
              </p>
              <button className="btn" onClick={() => dialog.current?.showModal()}>
                Report a problem
              </button>
            </div>
            <div className="cd rv">
              <div className="ico">
                <Icon n="git" f />
              </div>
              <h3>Contribute</h3>
              <p>
                Fork the repository, make your change and open a pull request. Questions go to{' '}
                {SITE.email}.
              </p>
              <a className="btn" href={`${SITE.repo}/fork`} target="_blank" rel="noreferrer">
                Fork the repo
              </a>
            </div>
          </div>
        </div>
      </section>

      <dialog ref={dialog}>
        <h3>Submit an issue</h3>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>Bug</option>
            <option>Feature request</option>
            <option>Question</option>
          </select>
        </label>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What went wrong?"
          />
        </label>
        <label>
          Details
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Steps to reproduce, your OS and what you expected."
          />
        </label>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => dialog.current?.close()}>
            Cancel
          </button>
          <button className="btn pr" onClick={submit}>
            Open on GitHub
          </button>
        </div>
      </dialog>
    </>
  );
}

export default function Download() {
  return (
    <SiteLayout current="/download">
      <Body />
    </SiteLayout>
  );
}