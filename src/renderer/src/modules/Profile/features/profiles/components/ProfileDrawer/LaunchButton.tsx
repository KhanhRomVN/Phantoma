import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import type { BrowserEngine, Profile, ProfileSource } from '../../../../shared/types';
import { LaunchBrowserModal } from '../../../browser';
import { PRIMARY_BTN } from './profile-drawer.constants';

export const BROWSER_LABEL: Record<BrowserEngine, string> = {
  chrome: 'Chrome',
  chromium: 'Chromium',
};

export function LaunchButton({ profile, source }: { profile: Profile; source?: ProfileSource }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className={cn(PRIMARY_BTN, 'min-w-0 flex-1')} onClick={() => setOpen(true)}>
        <ExternalLink className="h-3.5 w-3.5" />
        Launch Browser
      </Button>
      <LaunchBrowserModal
        open={open}
        profile={profile}
        source={source}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
