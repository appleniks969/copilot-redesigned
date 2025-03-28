import { Team } from '../team/team';

/**
 * Organization entity representing a GitHub organization
 */
export interface Organization {
  name: string;
  id?: number;
  teams: Team[];
}
