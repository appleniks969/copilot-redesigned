/**
 * Team entity representing a GitHub team
 */
export interface Team {
  slug: string;
  id?: number;
  organizationName: string;
  name?: string;
  description?: string;
}
