import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
  AccountModalKeyframes,
  overlayStyle,
  useAccountModalLayout,
} from "./accountModalLayout";

import { Key } from "lucide-react";
import { getFaviconUrl } from "@renderer/shared/utils/faviconUtils";
import {
  Banner,
  bannerStyles,
  BannerAccountIcon,
} from "../../Home/components/HomeBanner";
import {
  AUTH_LABELS,
  ICON_METHODS,
  authIconFile,
  isMergedAuth,
  splitAuthMethod,
  type Provider,
} from "./addAccount.utils";

const ModalBackdrop: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { container } = useAccountModalLayout(true);
  return ReactDOM.createPortal(
    <div style={overlayStyle} onClick={onClick} />,
    container,
  );
};

const ModalSheet: React.FC<{ height: string; children: React.ReactNode }> = ({
  height,
  children,
}) => {
  const { container, isWide, panelStyle } = useAccountModalLayout(true, true);
  const style: React.CSSProperties = isWide
    ? panelStyle
    : { ...panelStyle, height, maxHeight: height };
  return ReactDOM.createPortal(
    <div style={style}>
      {children}
      <AccountModalKeyframes />
    </div>,
    container,
  );
};

export const sharedBackdrop = (onClickBackdrop: () => void) => (
  <ModalBackdrop onClick={onClickBackdrop} />
);

export const sharedSheet = (
  children: React.ReactNode,
  height: string = "70%",
) => <ModalSheet height={height}>{children}</ModalSheet>;

export const AuthGlyph: React.FC<{ method: string; size?: number }> = ({
  method,
  size = 11,
}) => {
  const [failed, setFailed] = useState(false);
  const baseUri = ((window as any).__zenImagesUri as string | undefined) || "/images";
  if (failed || !ICON_METHODS.includes(method)) {
    return <Key size={size} />;
  }
  return (
    <img
      src={`${baseUri}/auth_icons/${authIconFile(method)}`}
      alt={method}
      style={{ width: `${size}px`, height: `${size}px`, objectFit: "contain" }}
      onError={() => setFailed(true)}
    />
  );
};

export const MergedAuthNotice: React.FC<{ methods: string[] }> = ({ methods }) => {
  const merged = methods.filter(isMergedAuth);
  if (merged.length === 0) return null;
  const labels = (m: string) =>
    splitAuthMethod(m)
      .map((part) => AUTH_LABELS[part] ?? part)
      .join(" / ");
  return (
    <>
      <style>{bannerStyles}</style>
      <Banner
        variant="info"
        icon={BannerAccountIcon}
        title="Merged login methods"
        badge={merged.map(labels).join(" | ")}
      >
        Sign in with any of these methods ({merged.map(labels).join("; ")}). If
        they resolve to the same email, they count as a single account.
      </Banner>
    </>
  );
};

export const ProviderFavicon: React.FC<{ provider: Provider; size?: number }> = ({
  provider,
  size = 20,
}) => {
  const [imgError, setImgError] = useState(false);
  const iconUrl = getFaviconUrl(provider.website_url || provider.website);
  if (!iconUrl || imgError) return null;
  return (
    <img
      src={iconUrl}
      alt={provider.provider_name}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "4px",
        objectFit: "contain",
        flexShrink: 0,
      }}
      onError={() => setImgError(true)}
    />
  );
};
