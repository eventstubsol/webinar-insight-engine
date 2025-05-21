
// Simple in-memory cache for tokens
export const tokenCache = new Map<string, { token: string; expires: number }>();

// Cache helper functions
export function getCachedToken(key: string): { token: string; expires: number } | undefined {
  return tokenCache.get(key);
}

export function setCachedToken(key: string, value: { token: string; expires: number }): void {
  tokenCache.set(key, value);
}

export function clearTokenCache(): void {
  tokenCache.clear();
}
