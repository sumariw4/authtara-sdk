/**
 * Authtara SDK - Server Module
 *
 * Server-side SDK untuk integrasi dengan DigitalSolution Platform.
 * Menyediakan SSO authentication, billing/entitlement check, dan usage metering.
 *
 * @example
 * ```typescript
 * import { Authtara } from '@authtara/sdk';
 *
 * const ds = new Authtara({
 *   apiKey: process.env.DS_APP_SECRET!,
 *   endpoint: 'http://localhost:3003'
 * });
 *
 * // Verify SSO token
 * const session = await ds.auth.verifySession(token);
 *
 * // Exchange authorization code for token
 * const result = await ds.auth.exchangeCode(code);
 *
 * // Get login URL for redirect
 * const loginUrl = ds.auth.getLoginUrl({
 *   callbackUrl: 'http://localhost:4000/api/sso/callback'
 * });
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export interface AuthtaraConfig {
  /**
   * App Secret dari Dashboard Developer (required)
   */
  apiKey: string;

  /**
   * Base URL Platform API
   * @default 'http://localhost:3003'
   */
  endpoint?: string;

  /**
   * Request timeout dalam milliseconds
   * @default 30000
   */
  timeout?: number;
}

export interface SessionVerifyResult {
  isValid: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
  tenant?: {
    id: string;
    name: string;
    subdomain: string;
    role: string;
  };
  subscription?: {
    plan: string;
    status: string;
  };
}

export interface ExchangeResult {
  token: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  tenant: {
    id: string;
    name: string;
    subdomain: string;
    role: string;
  };
  subscription: {
    plan: string;
    status: string;
  };
}

export interface LoginUrlOptions {
  /**
   * URL callback setelah login berhasil
   * Akan menerima ?code=xxx
   */
  callbackUrl: string;

  /**
   * Optional state untuk CSRF protection
   */
  state?: string;
}

export interface CheckEntitlementParams {
  tenantId: string;
  featureKey?: string;
}

export interface EntitlementResult {
  granted: boolean;
  reason?: string;
  entitlement?: {
    status: string;
    subscription?: {
      plan: string;
      status: string;
    };
  };
}

export interface RecordUsageParams {
  tenantId: string;
  metricSlug: string;
  amount: number;
  timestamp?: string;
}

export interface RecordUsageResult {
  success: boolean;
  recordId?: string;
}

// ============================================================================
// Errors
// ============================================================================

export class AuthtaraError extends Error {
  readonly code: string;
  readonly statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'AuthtaraError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class InvalidTokenError extends AuthtaraError {
  constructor(message = 'Token is invalid or expired') {
    super(message, 'INVALID_TOKEN', 401);
    this.name = 'InvalidTokenError';
  }
}

export class ApiError extends AuthtaraError {
  readonly response?: unknown;

  constructor(message: string, statusCode: number, response?: unknown) {
    super(message, 'API_ERROR', statusCode);
    this.name = 'ApiError';
    this.response = response;
  }
}

export class ConfigurationError extends AuthtaraError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

// ============================================================================
// HTTP Client
// ============================================================================

class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(baseUrl: string, apiKey: string, timeout = 30000) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          (errorData as { message?: string }).message ||
            `Request failed with status ${response.status}`,
          response.status,
          errorData,
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof AuthtaraError) {
        throw error;
      }
      throw new ApiError(error instanceof Error ? error.message : 'Network request failed', 0);
    }
  }

  async get<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          (errorData as { message?: string }).message ||
            `Request failed with status ${response.status}`,
          response.status,
          errorData,
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof AuthtaraError) {
        throw error;
      }
      throw new ApiError(error instanceof Error ? error.message : 'Network request failed', 0);
    }
  }
}

// ============================================================================
// JWT Verification (inline, no external dependency)
// ============================================================================

function base64UrlDecode(str: string): string {
  // Replace URL-safe characters
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with '=' if needed
  const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);

  if (typeof atob !== 'undefined') {
    return atob(padded);
  }
  // Node.js environment
  return Buffer.from(padded, 'base64').toString('utf-8');
}

function parseJwt(token: string): { header: unknown; payload: unknown; signature: string } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new InvalidTokenError('Invalid token format');
  }

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return { header, payload, signature: parts[2] };
  } catch {
    throw new InvalidTokenError('Failed to parse token');
  }
}

async function verifyHmacSignature(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const data = `${parts[0]}.${parts[1]}`;
  const signature = parts[2];

  // Use Web Crypto API (available in Node.js 18+ and browsers)
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
    const signatureArray = new Uint8Array(signatureBuffer);

    // Convert to base64url
    let binary = '';
    signatureArray.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    const computed =
      typeof btoa !== 'undefined'
        ? btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        : Buffer.from(signatureArray).toString('base64url');

    return computed === signature;
  } catch {
    return false;
  }
}

// ============================================================================
// Auth Module
// ============================================================================

class AuthModule {
  private readonly apiKey: string;
  private readonly httpClient: HttpClient;
  private readonly endpoint: string;

  constructor(apiKey: string, httpClient: HttpClient, endpoint: string) {
    this.apiKey = apiKey;
    this.httpClient = httpClient;
    this.endpoint = endpoint;
  }

  /**
   * Verify SSO JWT token secara offline menggunakan App Secret
   */
  async verifySession(token: string): Promise<SessionVerifyResult> {
    if (!token) {
      return { isValid: false };
    }

    try {
      // Verify signature
      const isValid = await verifyHmacSignature(token, this.apiKey);
      if (!isValid) {
        return { isValid: false };
      }

      // Parse payload
      const { payload } = parseJwt(token);
      const claims = payload as {
        sub?: string;
        email?: string;
        name?: string;
        tenant?: {
          id: string;
          name: string;
          subdomain?: string;
          role: string;
        };
        subscription?: {
          plan: string;
          status: string;
        };
        exp?: number;
      };

      // Check expiration
      if (claims.exp && claims.exp * 1000 < Date.now()) {
        return { isValid: false };
      }

      return {
        isValid: true,
        user: {
          id: claims.sub || '',
          email: claims.email || '',
          name: claims.name || null,
        },
        tenant: claims.tenant
          ? {
              id: claims.tenant.id,
              name: claims.tenant.name,
              subdomain: claims.tenant.subdomain || '',
              role: claims.tenant.role,
            }
          : undefined,
        subscription: claims.subscription,
      };
    } catch {
      return { isValid: false };
    }
  }

  /**
   * Exchange authorization code untuk JWT token (server-to-server)
   */
  async exchangeCode(code: string): Promise<ExchangeResult> {
    if (!code) {
      throw new InvalidTokenError('Authorization code is required');
    }

    const response = await this.httpClient.post<{
      success: boolean;
      data: ExchangeResult;
    }>('/api/v1/sso/exchange', {
      code,
      appSecret: this.apiKey,
    });

    if (!response.success || !response.data) {
      throw new ApiError('Failed to exchange authorization code', 400);
    }

    return response.data;
  }

  /**
   * Generate login URL untuk redirect ke DigitalSolution login
   *
   * @example
   * ```typescript
   * const loginUrl = ds.auth.getLoginUrl({
   *   callbackUrl: 'http://localhost:4000/api/sso/callback'
   * });
   * // Returns: http://localhost:3003/login?app_callback=http%3A%2F%2Flocalhost%3A4000%2Fapi%2Fsso%2Fcallback
   * ```
   */
  getLoginUrl(options: LoginUrlOptions): string {
    const url = new URL('/login', this.endpoint);
    url.searchParams.set('app_callback', options.callbackUrl);

    if (options.state) {
      url.searchParams.set('state', options.state);
    }

    return url.toString();
  }
}

// ============================================================================
// Billing Module
// ============================================================================

class BillingModule {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Cek apakah tenant memiliki akses ke aplikasi
   */
  async checkEntitlement(params: CheckEntitlementParams): Promise<EntitlementResult> {
    const response = await this.httpClient.post<{
      success: boolean;
      data: EntitlementResult;
    }>('/api/v1/billing/check-entitlement', params);

    if (!response.success) {
      return { granted: false, reason: 'Failed to check entitlement' };
    }

    return response.data;
  }
}

// ============================================================================
// Metering Module
// ============================================================================

class MeteringModule {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Record usage untuk usage-based billing
   */
  async recordUsage(params: RecordUsageParams): Promise<RecordUsageResult> {
    const response = await this.httpClient.post<{
      success: boolean;
      data: RecordUsageResult;
    }>('/api/v1/metering/record', params);

    if (!response.success) {
      return { success: false };
    }

    return response.data;
  }
}

// ============================================================================
// Main Authtara Class
// ============================================================================

/**
 * Authtara SDK Client (Server-side)
 *
 * Main entry point untuk integrasi server-side dengan DigitalSolution Platform.
 */
export class Authtara {
  readonly auth: AuthModule;
  readonly billing: BillingModule;
  readonly metering: MeteringModule;

  constructor(config: AuthtaraConfig) {
    if (!config.apiKey) {
      throw new ConfigurationError('apiKey is required');
    }

    const endpoint = config.endpoint || 'http://localhost:3003';
    const httpClient = new HttpClient(endpoint, config.apiKey, config.timeout);

    this.auth = new AuthModule(config.apiKey, httpClient, endpoint);
    this.billing = new BillingModule(httpClient);
    this.metering = new MeteringModule(httpClient);
  }
}

export default Authtara;
