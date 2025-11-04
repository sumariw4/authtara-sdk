/**
 * React SDK - React Components & Hooks
 *
 * React integration untuk Auth SDK dengan:
 * - Context Provider untuk state management
 * - Hooks untuk easy integration
 * - Pre-built components untuk quick start
 * - SSR support untuk Next.js
 */

"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthClient, type AuthResult, type User, type SignUpData, type SignInData } from "./index";
import type { AuthError } from "./errors";

export interface AuthProviderProps {
  client: AuthClient;
  children: React.ReactNode;
  initialUser?: User | null;
}

interface AuthContextValue {
  client: AuthClient;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
  signUp: (data: SignUpData) => Promise<AuthResult>;
  signIn: (data: SignInData) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider - Context Provider untuk auth state
 */
export function AuthProvider({ client, children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // Initialize: check for existing session
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const currentUser = await client.getUser();
        if (mounted) {
          setUser(currentUser);
        }
      } catch (err) {
        if (mounted && err instanceof Error) {
          // Silently fail - user not authenticated
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initialize();

    // Listen to auth events
    const handleSignIn = (authenticatedUser: User) => {
      setUser(authenticatedUser);
      setError(null);
    };

    const handleSignOut = () => {
      setUser(null);
      setError(null);
    };

    const handleUserChanged = (newUser: User | null) => {
      setUser(newUser);
    };

    const handleError = (err: AuthError) => {
      setError(err);
    };

    client.on("signIn", handleSignIn as (...args: unknown[]) => void);
    client.on("signOut", handleSignOut as (...args: unknown[]) => void);
    client.on("userChanged", handleUserChanged as (...args: unknown[]) => void);
    client.on("error", handleError as (...args: unknown[]) => void);

    return () => {
      mounted = false;
      client.off("signIn", handleSignIn as (...args: unknown[]) => void);
      client.off("signOut", handleSignOut as (...args: unknown[]) => void);
      client.off("userChanged", handleUserChanged as (...args: unknown[]) => void);
      client.off("error", handleError as (...args: unknown[]) => void);
    };
  }, [client]);

  const signUp = useCallback(
    async (data: SignUpData): Promise<AuthResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.signUp(data);
        setUser(result.user);
        return result;
      } catch (err) {
        const authError = err as AuthError;
        setError(authError);
        throw authError;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const signIn = useCallback(
    async (data: SignInData): Promise<AuthResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.signIn(data);
        setUser(result.user);
        return result;
      } catch (err) {
        const authError = err as AuthError;
        setError(authError);
        throw authError;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const signOut = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await client.signOut();
      setUser(null);
    } catch (err) {
      const authError = err as AuthError;
      setError(authError);
      throw authError;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const refreshUser = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const currentUser = await client.getUser();
      setUser(currentUser);
    } catch (err) {
      const authError = err as AuthError;
      setError(authError);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextValue = {
    client,
    user,
    isLoading,
    isAuthenticated: user !== null,
    error,
    signUp,
    signIn,
    signOut,
    refreshUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth - Main auth hook
 * Returns auth state dan methods
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * useUser - Hook untuk get current user
 */
export function useUser(): { user: User | null; isLoading: boolean } {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}

/**
 * useSignIn - Hook untuk sign in dengan loading state
 */
export function useSignIn() {
  const { signIn, isLoading, error } = useAuth();
  return { signIn, isLoading, error };
}

/**
 * useSignUp - Hook untuk sign up dengan loading state
 */
export function useSignUp() {
  const { signUp, isLoading, error } = useAuth();
  return { signUp, isLoading, error };
}

/**
 * useSignOut - Hook untuk sign out dengan loading state
 */
export function useSignOut() {
  const { signOut, isLoading, error } = useAuth();
  return { signOut, isLoading, error };
}

/**
 * SignIn Component - Pre-built sign in form
 */
export interface SignInProps {
  onSuccess?: (result: AuthResult) => void;
  onError?: (error: AuthError) => void;
  className?: string;
}

export function SignIn({ onSuccess, onError, className }: SignInProps) {
  const { signIn, isLoading, error } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const result = await signIn({ email, password });
      onSuccess?.(result);
    } catch (err) {
      const authError = err as AuthError;
      setFormError(authError.message || "Sign in failed");
      onError?.(authError);
    }
  };

  const displayError = formError || error?.message;

  return (
    <form onSubmit={handleSubmit} className={className}>
      {displayError && <div style={{ color: "#c33", marginBottom: "12px", fontSize: "14px" }}>{displayError}</div>}
      <div style={{ marginBottom: "16px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          required
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
      </div>
      <div style={{ marginBottom: "16px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
          required
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "12px",
          background: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          fontSize: "16px",
          fontWeight: 600,
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.5 : 1,
        }}
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

/**
 * SignUp Component - Pre-built sign up form
 */
export interface SignUpProps {
  onSuccess?: (result: AuthResult) => void;
  onError?: (error: AuthError) => void;
  className?: string;
}

export function SignUp({ onSuccess, onError, className }: SignUpProps) {
  const { signUp, isLoading, error } = useSignUp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const result = await signUp({ name, email, password });
      onSuccess?.(result);
    } catch (err) {
      const authError = err as AuthError;
      setFormError(authError.message || "Sign up failed");
      onError?.(authError);
    }
  };

  const displayError = formError || error?.message;

  return (
    <form onSubmit={handleSubmit} className={className}>
      {displayError && <div style={{ color: "#c33", marginBottom: "12px", fontSize: "14px" }}>{displayError}</div>}
      <div style={{ marginBottom: "16px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
      </div>
      <div style={{ marginBottom: "16px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          required
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
      </div>
      <div style={{ marginBottom: "16px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
          required
          minLength={8}
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "12px",
          background: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          fontSize: "16px",
          fontWeight: 600,
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.5 : 1,
        }}
      >
        {isLoading ? "Signing up..." : "Sign Up"}
      </button>
    </form>
  );
}

/**
 * OAuth Sign In Button Component - Pre-built OAuth button
 */
export interface OAuthButtonProps {
  provider: "google" | "github";
  className?: string;
  children?: React.ReactNode;
}

export function OAuthButton({ provider, className, children }: OAuthButtonProps) {
  const { client } = useAuth();

  const handleClick = () => {
    client.signInWithOAuth(provider);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={{
        width: "100%",
        padding: "12px",
        background: "#fff",
        color: "#333",
        border: "1px solid #ddd",
        borderRadius: "4px",
        fontSize: "14px",
        fontWeight: 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
      }}
    >
      {children || `Sign in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`}
    </button>
  );
}

/**
 * UserButton Component - Display user info dan sign out button
 */
export interface UserButtonProps {
  onSignOut?: () => void;
  className?: string;
}

export function UserButton({ onSignOut, className }: UserButtonProps) {
  const { user, signOut, isLoading } = useAuth();

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      onSignOut?.();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px",
        background: "#f5f5f5",
        borderRadius: "8px",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "14px", fontWeight: 600 }}>{user.name || user.email}</div>
        <div style={{ fontSize: "12px", color: "#666" }}>{user.email}</div>
      </div>
      <button
        onClick={handleSignOut}
        disabled={isLoading}
        style={{
          padding: "8px 16px",
          background: "#dc3545",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          fontSize: "14px",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.5 : 1,
        }}
      >
        {isLoading ? "..." : "Sign Out"}
      </button>
    </div>
  );
}

/**
 * SSR Helper - Get initial user untuk Next.js SSR
 */
export async function getServerSideUser(client: AuthClient): Promise<User | null> {
  try {
    return await client.getUser();
  } catch {
    return null;
  }
}
