import { toastService } from '@renderer/components/ui/Toast';
import { profileApi } from '../../shared/api/profile.api';
import { notifyBrowserChanged } from '../../features/browser';

interface ActionDeps {
  run: (task: () => Promise<void>) => Promise<void>;
  stopId: string | null;
}

export function useProfilePageActions({ run, stopId }: ActionDeps) {
  const confirmStop = (): void => {
    const id = stopId;
    if (!id) return;
    void run(async () => {
      await profileApi.browser.stop(id);
      notifyBrowserChanged();
      toastService.show({ variant: 'success', title: 'Browser stopped' });
    });
  };

  return { confirmStop };
}