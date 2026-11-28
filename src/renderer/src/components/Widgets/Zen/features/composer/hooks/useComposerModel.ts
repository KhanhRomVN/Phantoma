import * as React from 'react';

export const useModelCapabilities = (
  currentModel: any,
  currentModelConfig: any,
  currentProviderConfig: any,
) => {
  const showThinkingButton = React.useMemo(() => {
    return currentModel?.is_thinking !== undefined
      ? !!currentModel.is_thinking
      : !!currentModelConfig?.is_thinking;
  }, [currentModel, currentModelConfig]);

  const showSearchButton = React.useMemo(() => {
    let result: boolean;
    if (currentModel?.is_search !== undefined) {
      result = !!currentModel.is_search;
    } else if (currentModelConfig?.is_search !== undefined) {
      result = !!currentModelConfig.is_search;
    } else {
      result = !!currentProviderConfig?.is_search;
    }
    return result;
  }, [currentModel, currentModelConfig, currentProviderConfig]);

  const supportsUpload = React.useMemo(() => {
    let result: boolean;
    if (currentModel?.is_image_upload !== undefined) {
      result = !!currentModel.is_image_upload;
    } else if (currentModelConfig?.is_image_upload !== undefined) {
      result = !!currentModelConfig.is_image_upload;
    } else {
      result = false;
    }

    return result;
  }, [currentModel, currentProviderConfig, currentModelConfig]);

  const supportsImageGenerator = React.useMemo(() => {
    return currentModel?.is_image_generator === true;
  }, [currentModel]);

  const supportsVideoGenerator = React.useMemo(() => {
    return currentModel?.is_video_generator === true;
  }, [currentModel]);

  const supportsDeepResearch = React.useMemo(() => {
    return currentModel?.is_deep_research === true;
  }, [currentModel]);

  return {
    showThinkingButton,
    showSearchButton,
    supportsUpload,
    supportsImageGenerator,
    supportsVideoGenerator,
    supportsDeepResearch,
  };
};

export const useProvidersConfig = (currentModel: any, providers: any[]) => {
  const currentProviderConfig = React.useMemo(() => {
    if (!currentModel?.providerId) {
      return null;
    }
    const found = providers.find(
      (p) => p.provider_id?.toLowerCase() === currentModel.providerId?.toLowerCase(),
    );
    return found ?? null;
  }, [currentModel, providers]);

  const currentModelConfig = React.useMemo(() => {
    if (!currentProviderConfig || !currentModel?.id) {
      return null;
    }
    const found = currentProviderConfig.models?.find(
      (m: any) => m.id?.toLowerCase() === currentModel.id?.toLowerCase(),
    );
    return found ?? null;
  }, [currentProviderConfig, currentModel]);

  return { currentProviderConfig, currentModelConfig };
};

export const useModelSelection = (
  folderPath: string | null | undefined,
  setCurrentModel: (model: any) => void,
  setCurrentAccount: (account: any) => void,
  currentModel: any,
  currentAccount: any,
) => {
  const [isLoadingCache, setIsLoadingCache] = React.useState(true);
  const pendingAccountIdRef = React.useRef<string | null>(null);
  const currentModelRef = React.useRef<any>(null);
  const currentAccountRef = React.useRef<any>(null);

  currentModelRef.current = currentModel;
  currentAccountRef.current = currentAccount;

  // Load saved selection
  React.useEffect(() => {
    let cancelled = false;
    setIsLoadingCache(true);
    const key = `zen-model-selection:${folderPath || 'global'}`;

    const applyCache = (saved: any) => {
      if (cancelled) return;
      if (saved.model && !currentModelRef.current) setCurrentModel(saved.model);
      if (saved.accountId && !currentAccountRef.current) {
        pendingAccountIdRef.current = saved.accountId;
        if (saved.email) {
          setCurrentAccount({
            id: saved.accountId,
            email: saved.email,
            _partial: true,
          });
        }
      }
    };

    try {
      const savedStr = localStorage.getItem(key);
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        applyCache(saved);
        setIsLoadingCache(false);
      } else {
        const storage = (window as any).storage;
        if (storage) {
          storage
            .get(key)
            .then((res: any) => {
              if (cancelled) return;
              if (res?.value) {
                const saved = JSON.parse(res.value);
                applyCache(saved);
                try {
                  localStorage.setItem(key, res.value);
                } catch {}
              }
              setIsLoadingCache(false);
            })
            .catch(() => {
              if (!cancelled) setIsLoadingCache(false);
            });
        } else {
          setIsLoadingCache(false);
        }
      }
    } catch (e) {
      setIsLoadingCache(false);
    }

    return () => {
      cancelled = true;
    };
  }, [folderPath, setCurrentModel, setCurrentAccount]);

  // Save selection
  React.useEffect(() => {
    if (currentModel) {
      const key = `zen-model-selection:${folderPath || 'global'}`;
      const data = {
        model: currentModel,
        accountId: currentAccount?.id,
        email: currentAccount?.email,
      };
      const dataStr = JSON.stringify(data);
      try {
        localStorage.setItem(key, dataStr);
      } catch (e) {}

      const storage = (window as any).storage;
      if (storage) {
        storage.set(key, dataStr);
      }
    }
  }, [currentModel, currentAccount, folderPath]);

  return {
    isLoadingCache,
    pendingAccountIdRef,
  };
};
