/**
 * Application configuration
 */

// Backend API configuration
export const API_CONFIG = {
  // Backend URL - can be overridden by environment variables
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "https://generative-ui-nu.vercel.app",
  
  // API endpoints
  ENDPOINTS: {
    GENERATE_APP: "/generate-app",
    COMPONENTS: "/components",
    HEALTH: "/health"
  }
} as const;

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Pre-configured API URLs
export const API_URLS = {
  GENERATE_APP: getApiUrl(API_CONFIG.ENDPOINTS.GENERATE_APP),
  COMPONENTS: getApiUrl(API_CONFIG.ENDPOINTS.COMPONENTS),
  HEALTH: getApiUrl(API_CONFIG.ENDPOINTS.HEALTH)
} as const;
