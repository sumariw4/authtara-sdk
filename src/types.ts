/**
 * TypeScript Types untuk Auth SDK
 */

import type { TokenStorage } from './storage';

export interface AuthClientOptions {
  clientId: string;
  apiUrl?: string;
  storage?: TokenStorage;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User;
  application: Application;
  session?: Session;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  applicationUser?: ApplicationUser;
}

export interface Application {
  id: string;
  name: string;
}

export interface ApplicationUser {
  id: string;
  metadata: Record<string, any>;
  roles: string[];
  firstSeenAt: string;
  lastActiveAt: string;
}

export interface Session {
  id: string;
  expiresAt: string;
}

// AuthError is exported from errors.ts, not here

export interface AuthClientEvents {
  signIn: (user: User) => void;
  signOut: () => void;
  userChanged: (user: User | null) => void;
  error: (error: { message: string; code?: string; statusCode?: number }) => void;
}
