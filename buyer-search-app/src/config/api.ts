// API Configuration
// In development, Vite proxy forwards /api to localhost:4000
// In production, nginx proxies /buyer-api to the buyer-search-api container

// Determine if we're in development or production
const isDev = import.meta.env.DEV;

// In development: use /api (proxied by Vite to localhost:4000)
// In production: use /buyer-api (proxied by nginx to the API container)
export const API_BASE_URL = isDev ? '/api' : '/buyer-api';

export function getApiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
