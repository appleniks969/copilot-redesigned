import { Token } from '@/domain/models/auth/token';

/**
 * Authentication service for managing GitHub tokens
 */
export class AuthService {
  private storageKey = 'github-copilot-metrics-auth';

  /**
   * Store authentication token
   * @param token Token to store
   */
  storeToken(token: Token): void {
    if (typeof window !== 'undefined') {
      // Client-side storage (not secure for production)
      sessionStorage.setItem(this.storageKey, JSON.stringify(token));
    }
  }

  /**
   * Retrieve stored token
   * @returns Stored token or null if not found
   */
  getToken(): Token | null {
    if (typeof window !== 'undefined') {
      const storedToken = sessionStorage.getItem(this.storageKey);
      
      if (storedToken) {
        try {
          return JSON.parse(storedToken) as Token;
        } catch (e) {
          console.error('Error parsing stored token:', e);
        }
      }
    }
    
    return null;
  }

  /**
   * Clear stored token
   */
  clearToken(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.storageKey);
    }
  }

  /**
   * Check if user is authenticated
   * @returns True if authenticated
   */
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Validate token scopes against required scopes
   * @param requiredScopes Scopes that are required
   * @returns True if token has all required scopes
   */
  hasRequiredScopes(requiredScopes: string[]): boolean {
    const token = this.getToken();
    
    if (!token) {
      return false;
    }
    
    return requiredScopes.every(scope => token.scope.includes(scope));
  }
}
