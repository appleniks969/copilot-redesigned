import { Token } from '@/domain/models/auth/token';

/**
 * Authentication service for managing GitHub tokens
 * 
 * NOTE: This implementation uses sessionStorage which is NOT secure for production.
 * TODO: Replace with HTTP-only cookies via Next.js Route Handlers or use NextAuth.js
 */
export class AuthService {
  private storageKey = 'github-copilot-metrics-auth';
  private cookieName = 'github-copilot-auth';

  /**
   * Store authentication token
   * @param token Token to store
   * 
   * In production: This should set an HTTP-only cookie via a Next.js API route
   * rather than using client-side storage which is vulnerable to XSS attacks.
   */
  storeToken(token: Token): void {
    if (typeof window !== 'undefined') {
      // TEMPORARY: Client-side storage (not secure for production)
      sessionStorage.setItem(this.storageKey, JSON.stringify(token));
      
      // TODO: Replace with secure cookie implementation
      // Example: Make a fetch request to a Next.js API route that sets an HTTP-only cookie
      // fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token }),
      // });
    }
  }

  /**
   * Retrieve stored token
   * @returns Stored token or null if not found
   * 
   * In production: This should validate the HTTP-only cookie via a Next.js API route
   */
  getToken(): Token | null {
    if (typeof window !== 'undefined') {
      // TEMPORARY: Client-side storage retrieval
      const storedToken = sessionStorage.getItem(this.storageKey);
      
      if (storedToken) {
        try {
          return JSON.parse(storedToken) as Token;
        } catch (e) {
          console.error('Error parsing stored token:', e);
        }
      }

      // TODO: Replace with secure cookie validation
      // Example: Make a fetch request to a Next.js API route that validates the cookie
      // const response = await fetch('/api/auth/validate');
      // if (response.ok) {
      //   const data = await response.json();
      //   return data.token;
      // }
    }
    
    return null;
  }

  /**
   * Clear stored token
   * 
   * In production: This should clear the HTTP-only cookie via a Next.js API route
   */
  clearToken(): void {
    if (typeof window !== 'undefined') {
      // TEMPORARY: Remove from client-side storage
      sessionStorage.removeItem(this.storageKey);
      
      // TODO: Replace with secure cookie removal
      // Example: Make a fetch request to a Next.js API route that clears the cookie
      // fetch('/api/auth/logout', { method: 'POST' });
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
