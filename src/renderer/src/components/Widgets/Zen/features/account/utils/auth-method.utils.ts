import type { ProviderAuthMethods } from "../types/provider.types";

export const authIconFile = (method: string): string =>
  method === "apple" || method === "microsoft"
    ? `${method}.png`
    : `${method}.svg`;

export const splitAuthMethod = (method: string): string[] =>
  method.split("_").filter(Boolean);

export const isMergedAuth = (method: string): boolean =>
  splitAuthMethod(method).length > 1;

/** Parser duy nhất cho auth_method / auth_methods (array | JSON string | chuỗi phân tách). */
export const parseAuthMethods = (raw: ProviderAuthMethods | null | undefined): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw))
    return raw.filter((m): m is string => typeof m === "string" && m.length > 0);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw.trim());
      return Array.isArray(parsed) ? parsed.filter((m: unknown): m is string => !!m && typeof m === "string") : [];
    } catch {
      return raw
        .trim()
        .split(/[,;|\s]+/)
        .filter((m: string) => m.length > 0);
    }
  }
  return [];
};

export const getProviderMethods = (
  p: { auth_method?: ProviderAuthMethods | null; auth_methods?: ProviderAuthMethods | null } | null | undefined,
): string[] => parseAuthMethods(p?.auth_method ?? p?.auth_methods);

/** Email chứa ký tự "*" (email bị che) → không hợp lệ để tạo account. */
export const hasInvalidEmailChar = (value: string): boolean =>
  value.includes("*");

export const resolveAccountEmail = (
  email: string | undefined,
  profileLabel?: string,
): string => {
  const current = (email || "").trim();
  if (current && !hasInvalidEmailChar(current)) return current;
  const fromProfile = profileLabel?.match(/[^\s<>()]+@[^\s<>()]+\.[^\s<>()]+/)?.[0];
  return fromProfile && !hasInvalidEmailChar(fromProfile)
    ? fromProfile
    : current;
};
