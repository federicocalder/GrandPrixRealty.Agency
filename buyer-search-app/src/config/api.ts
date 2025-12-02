// API Configuration
// In development, Vite proxy forwards /api to localhost:4000
// In production, nginx proxies /buyer-api to the buyer-search-api container

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export function getApiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
