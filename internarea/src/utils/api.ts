/**
 * API Configuration
 * Centralized API base URL for all backend calls
 */

export const getApiBaseUrl = (): string => {
  // Use environment variable if available, otherwise default to localhost
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
};

export const getApiEndpoint = (path: string): string => {
  const baseUrl = getApiBaseUrl();
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}/api${cleanPath}`;
};
