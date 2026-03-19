export const PRODUCTION_API_BASE_URL = "https://vb.nikiforovy.university/";
export const DEVELOPMENT_API_BASE_URL = "http://video2book.test/";

export interface ResolveApiBaseUrlOptions {
  overrideBaseUrl?: string | undefined;
  appIsPackaged?: boolean;
  nodeEnv?: string | undefined;
}

export function resolveApiBaseUrl(
  options: ResolveApiBaseUrlOptions = {},
): string {
  const {
    overrideBaseUrl = process.env.VIDEO2BOOK_API_BASE_URL,
    appIsPackaged = false,
    nodeEnv = process.env.NODE_ENV,
  } = options;

  if (overrideBaseUrl?.trim()) {
    return overrideBaseUrl.trim();
  }

  if (appIsPackaged || nodeEnv === "production") {
    return PRODUCTION_API_BASE_URL;
  }

  return DEVELOPMENT_API_BASE_URL;
}
