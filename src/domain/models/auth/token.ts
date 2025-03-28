/**
 * Token model representing GitHub authentication token
 */
export interface Token {
  value: string;
  organizationName: string;
  scope: string[];
  teamSlugs?: string[];
}

/**
 * Check if token has required scope
 */
export function hasRequiredScope(token: Token, requiredScope: string): boolean {
  return token.scope.includes(requiredScope);
}
