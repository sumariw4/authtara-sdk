/**
 * Storage Utilities untuk Token Management
 * Support localStorage, sessionStorage, atau custom storage
 */

export interface TokenStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  length?: number;
  key?: (index: number) => string | null;
}

class MemoryStorage implements TokenStorage {
  private storage: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }
}

export class StorageManager {
  private storage: TokenStorage;
  private prefix: string;

  constructor(storage?: TokenStorage, prefix = 'auth_sdk_') {
    // Default ke localStorage jika available, fallback ke memory storage
    if (storage) {
      this.storage = storage;
    } else if (
      typeof globalThis !== 'undefined' &&
      'localStorage' in globalThis &&
      globalThis.localStorage
    ) {
      this.storage = globalThis.localStorage as TokenStorage;
    } else {
      this.storage = new MemoryStorage();
    }
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  getItem(key: string): string | null {
    try {
      return this.storage.getItem(this.getKey(key));
    } catch (_error) {
      // Storage might be disabled or unavailable
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      this.storage.setItem(this.getKey(key), value);
    } catch (_error) {
      // Storage might be full or disabled
      console.warn('Failed to set storage item');
    }
  }

  removeItem(key: string): void {
    try {
      this.storage.removeItem(this.getKey(key));
    } catch (_error) {
      // Storage might be disabled
    }
  }

  clear(): void {
    // Clear all items with our prefix
    if (
      typeof globalThis !== 'undefined' &&
      'localStorage' in globalThis &&
      this.storage === globalThis.localStorage
    ) {
      const localStorage = globalThis.localStorage as TokenStorage;
      const keys: string[] = [];
      if (localStorage.length !== undefined && localStorage.key) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.prefix)) {
            keys.push(key);
          }
        }
      }
      keys.forEach(key => localStorage.removeItem(key));
    }
  }
}
