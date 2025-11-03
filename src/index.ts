/**
 * Auth SDK - Main AuthClient Class
 *
 * JavaScript SDK untuk authentication dengan widget API
 */

import { StorageManager } from "./storage";
import {
  AuthError,
  AuthenticationError,
  ValidationError,
  NetworkError,
  NotFoundError,
} from "./errors";
import type {
  AuthClientOptions,
  SignUpData,
  SignInData,
  AuthResult,
  User,
  Session,
} from "./types";

export class AuthClient {
  private clientId: string;
  private apiUrl: string;
  private storage: StorageManager;
  private currentUser: User | null = null;
  private eventListeners: Map<string, Set<(...args: unknown[]) => void>> =
    new Map();

  constructor(options: AuthClientOptions) {
    if (!options.clientId) {
      throw new Error("clientId is required");
    }

    if (!options.clientId.startsWith("app_")) {
      throw new Error('clientId must start with "app_"');
    }

    this.clientId = options.clientId;
    this.apiUrl = options.apiUrl || "/widget/api";
    this.storage = new StorageManager(options.storage);

    // Try to restore session on initialization (if in browser)
    if (typeof globalThis !== "undefined" && "window" in globalThis) {
      this.initialize();
    }
  }

  /**
   * Initialize client - check for existing session
   */
  private async initialize(): Promise<void> {
    try {
      // Try to get current user
      const user = await this.getUser();
      if (user) {
        this.currentUser = user;
        this.emit("signIn", user);
        this.emit("userChanged", user);
      }
    } catch (_error) {
      // No valid session, silently fail
    }
  }

  /**
   * Sign up new user
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      const response = await this.fetch("/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-ID": this.clientId,
        },
        credentials: "include", // Important for session cookies
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result = await response.json();
      const authResult: AuthResult = result.data;

      // Update current user
      this.currentUser = authResult.user;
      this.emit("signIn", authResult.user);
      this.emit("userChanged", authResult.user);

      return authResult;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new NetworkError(
        error instanceof Error ? error.message : "Network request failed",
      );
    }
  }

  /**
   * Sign in user
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    try {
      const response = await this.fetch("/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-ID": this.clientId,
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result = await response.json();
      const authResult: AuthResult = result.data;

      // Update current user
      this.currentUser = authResult.user;
      this.emit("signIn", authResult.user);
      this.emit("userChanged", authResult.user);

      return authResult;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new NetworkError(
        error instanceof Error ? error.message : "Network request failed",
      );
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    try {
      const response = await this.fetch("/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-ID": this.clientId,
        },
        credentials: "include",
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Clear local state
      this.currentUser = null;
      this.storage.clear();
      this.emit("signOut");
      this.emit("userChanged", null);
    } catch (error) {
      // Even if request fails, clear local state
      this.currentUser = null;
      this.storage.clear();
      this.emit("signOut");
      this.emit("userChanged", null);

      if (error instanceof AuthError) {
        throw error;
      }
      throw new NetworkError(
        error instanceof Error ? error.message : "Network request failed",
      );
    }
  }

  /**
   * Get current authenticated user
   */
  async getUser(): Promise<User | null> {
    try {
      const response = await this.fetch("/user", {
        method: "GET",
        headers: {
          "X-Client-ID": this.clientId,
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated
          this.currentUser = null;
          return null;
        }
        await this.handleErrorResponse(response);
      }

      const result = await response.json();
      const user: User = result.data.user;

      // Update current user
      this.currentUser = user;
      return user;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        this.currentUser = null;
        return null;
      }
      if (error instanceof AuthError) {
        throw error;
      }
      throw new NetworkError(
        error instanceof Error ? error.message : "Network request failed",
      );
    }
  }

  /**
   * Refresh session (currently just calls getUser)
   * Future: Can implement token refresh if using JWT tokens
   */
  async refreshSession(): Promise<Session> {
    const user = await this.getUser();
    if (!user) {
      throw new AuthenticationError("Not authenticated");
    }

    // For session-based auth, session is managed by cookies
    // Return a session-like object
    return {
      id: "session_cookie", // Session ID managed by cookie
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days default
    };
  }

  /**
   * Get current user (synchronous, from cache)
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Event listener management
   */
  on(
    event: "signIn" | "signOut" | "userChanged" | "error" | string,
    handler: (...args: unknown[]) => void,
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(handler);
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, ...args: unknown[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Internal fetch wrapper dengan error handling
   */
  // eslint-disable-next-line no-undef
  private async fetch(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const url = `${this.apiUrl}${endpoint}`;

    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      // Network error
      throw new NetworkError(
        error instanceof Error ? error.message : "Network request failed",
      );
    }
  }

  /**
   * Handle error response dari API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      // Response bukan JSON
      throw new AuthError(
        `Request failed with status ${response.status}`,
        "UNKNOWN_ERROR",
        response.status,
      );
    }

    // Type guard untuk error data
    interface ErrorData {
      message?: string;
      code?: string;
      errors?: Array<{ field: string; message: string; code: string }>;
      error?: {
        message?: string;
        code?: string;
        errors?: Array<{ field: string; message: string; code: string }>;
      };
    }

    const isErrorData = (data: unknown): data is ErrorData => {
      return typeof data === "object" && data !== null;
    };

    if (!isErrorData(errorData)) {
      throw new AuthError(
        "Invalid error response format",
        "UNKNOWN_ERROR",
        response.status,
      );
    }

    // Parse error dari response format
    const message =
      errorData.message || errorData.error?.message || "An error occurred";
    const code = errorData.code || errorData.error?.code || "UNKNOWN_ERROR";
    const errors = errorData.errors || errorData.error?.errors;

    // Create appropriate error class
    switch (response.status) {
      case 401:
        throw new AuthenticationError(message, response.status);
      case 404:
        throw new NotFoundError(message, response.status);
      case 422:
        throw new ValidationError(message, errors);
      default:
        throw new AuthError(message, code, response.status, errors);
    }
  }
}

// Export types (exclude AuthError to avoid duplicate export)
export type {
  AuthClientOptions,
  SignUpData,
  SignInData,
  AuthResult,
  User,
  Application,
  ApplicationUser,
  Session,
  AuthClientEvents,
} from "./types";
export * from "./errors";
export * from "./storage";

// Export default
export default AuthClient;
