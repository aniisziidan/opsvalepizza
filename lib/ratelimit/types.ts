export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTimeMs: number;
  retryAfterSeconds: number;
}

export interface RateLimitEntry {
  tokens: number;
  lastRefillTime: number;
  requestTimestamps: number[];
}
