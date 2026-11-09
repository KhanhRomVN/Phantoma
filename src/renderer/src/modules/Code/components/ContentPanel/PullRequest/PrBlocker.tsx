/**
 * ------------------------------------------------------------------
 * PR Blocker
 * ------------------------------------------------------------------
 * Màn hình chặn khi chưa dùng được Pull Request: thiếu GitHub CLI,
 * chưa đăng nhập (token / browser) hoặc repo không có remote GitHub.
 * ------------------------------------------------------------------
 */

import { memo, useEffect, useState } from 'react';
import { AlertCircle, ExternalLink, Globe, KeyRound, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@renderer/components/ui/Button';
import type { StatusInfo } from './types';
import { FIELD } from './utils';

interface PrBlockerProps {
  projectPath: string;
  status: StatusInfo;
  loadStatus: () => Promise<StatusInfo>;
  onNotice: (msg: string) => void;
}

export const PrBlocker = memo(function PrBlocker({
  projectPath,
  status,
  loadStatus,
  onNotice,
}: PrBlockerProps) {
  const [token, setToken] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [webLogin, setWebLogin] = useState<{ code: string; url: string } | null>(null);

  const needsLogin = status.installed && !status.authenticated;
  const message = !status.installed
    ? 'GitHub CLI (gh) is not installed. Install it from cli.github.com, then press Retry.'
    : needsLogin
      ? 'Not logged in to GitHub. Sign in to view and manage pull requests.'
      : (status.repoError ?? status.error ?? 'This repository has no GitHub remote.');

  useEffect(() => {
    if (!webLogin) return;
    const timer = setInterval(() => {
      void loadStatus().then((s) => {
        if (s.authenticated) {
          setWebLogin(null);
          onNotice('Logged in to GitHub');
        }
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [webLogin, loadStatus, onNotice]);

  const loginWithToken = async () => {
    setLoginBusy(true);
    setLoginError(null);
    try {
      const res = await window.api.invoke('pr:login-token', projectPath, token);
      if (res?.error) {
        setLoginError(String(res.error));
        return;
      }
      setToken('');
      onNotice('Logged in to GitHub');
      await loadStatus();
    } finally {
      setLoginBusy(false);
    }
  };

  const loginWithBrowser = async () => {
    setLoginBusy(true);
    setLoginError(null);
    try {
      const res = await window.api.invoke('pr:login-web', projectPath);
      if (res?.error) {
        setLoginError(String(res.error));
        return;
      }
      await navigator.clipboard.writeText(res.code).catch(() => {});
      void window.api.invoke('pr:open-external', res.url);
      setWebLogin({ code: res.code, url: res.url });
    } finally {
      setLoginBusy(false);
    }
  };

  const cancelWebLogin = () => {
    void window.api.invoke('pr:login-web-cancel');
    setWebLogin(null);
  };

  return (
    <div className={'flex-1 flex items-center justify-center px-8'}>
      <div className={'w-full max-w-[420px] flex flex-col items-center gap-6 text-center'}>
        <div className={'w-16 h-16 rounded-2xl bg-error/10 border border-solid border-error/30 flex items-center justify-center'}>
          <AlertCircle className={'w-8 h-8 text-error'} />
        </div>
        <p className={'text-sm leading-relaxed text-error'}>{message}</p>

        {needsLogin && (
          <div className={'w-full flex flex-col gap-3'}>
            <div className={'flex flex-col gap-1.5 text-left'}>
              <label className={'text-xs text-text-secondary'}>
                Personal access token (scopes: repo, read:org)
              </label>
              <input
                type={'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && token.trim() && !loginBusy) void loginWithToken();
                }}
                placeholder={'ghp_...'}
                className={`${FIELD} h-10`}
              />
              {loginError && <p className={'text-xs text-error'}>{loginError}</p>}
            </div>
            <Button
              fullWidth
              onClick={() => void loginWithToken()}
              disabled={!token.trim() || loginBusy}
              className={'h-10 text-[13px] bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30'}
            >
              {loginBusy ? (
                <Loader2 className={'w-4 h-4 animate-spin'} />
              ) : (
                <KeyRound className={'w-4 h-4'} />
              )}
              Login with token
            </Button>
            {webLogin ? (
              <div className={'flex flex-col items-center gap-2 rounded-lg border border-dashed border-primary bg-primary/10 px-4 py-4'}>
                <span className={'text-xs text-text-secondary'}>
                  Enter this code on GitHub (copied to clipboard). Waiting for authorization...
                </span>
                <span className={'font-mono text-2xl font-semibold tracking-widest text-primary'}>
                  {webLogin.code}
                </span>
                <div className={'flex items-center gap-2'}>
                  <Button
                    onClick={() => void window.api.invoke('pr:open-external', webLogin.url)}
                    className={'h-9 px-4 text-[13px] bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30'}
                  >
                    <ExternalLink className={'w-4 h-4'} />
                    Open GitHub
                  </Button>
                  <Button
                    onClick={cancelWebLogin}
                    className={'h-9 px-4 text-[13px] bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30'}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                fullWidth
                onClick={() => void loginWithBrowser()}
                disabled={loginBusy}
                className={'h-10 text-[13px] bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30'}
              >
                <Globe className={'w-4 h-4'} />
                Login with browser
              </Button>
            )}
          </div>
        )}

        <Button
          onClick={() => void loadStatus()}
          className={'h-9 px-4 text-[13px] border border-dashed border-primary bg-transparent text-primary hover:bg-primary/10 active:bg-primary/20'}
        >
          <RefreshCw className={'w-4 h-4'} />
          Retry
        </Button>
      </div>
    </div>
  );
});

PrBlocker.displayName = 'PrBlocker';