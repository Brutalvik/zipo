// services/api.ts
import Constants from "expo-constants";

function resolveBaseUrl() {
  // 1) Prefer env vars (recommended)
  const envUrl = process.env.EXPO_PUBLIC_API_BASE as string;

  if (envUrl?.trim()) return envUrl.replace(/\/$/, "");

  // 2) Expo config (SDK 49+): expoConfig.extra
  const extraFromExpoConfig = (Constants.expoConfig?.extra ?? {}) as Record<
    string,
    unknown
  >;

  const fromExpoConfig = extraFromExpoConfig.API_BASE_URL;
  if (typeof fromExpoConfig === "string" && fromExpoConfig.trim()) {
    return fromExpoConfig.replace(/\/$/, "");
  }

  // 3) Legacy manifest (older runtimes): Constants.manifest?.extra (typed poorly)
  const legacyManifest = Constants.expoConfig as unknown as
    | { extra?: Record<string, unknown> }
    | undefined;

  const fromLegacy = legacyManifest?.extra?.API_BASE_URL;
  if (typeof fromLegacy === "string" && fromLegacy.trim()) {
    return fromLegacy.replace(/\/$/, "");
  }

  // 4) Final fallback
  return "http://127.0.0.1:8080";
}

export const API_BASE_URL = resolveBaseUrl();

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }

  return (await res.json()) as T;
}
