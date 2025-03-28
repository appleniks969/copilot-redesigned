/**
 * Environment variables configuration
 */
export const env = {
  /**
   * Default organization name
   */
  defaultOrgName: process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME || 'your-org-name',
  
  /**
   * Default metrics period in days
   */
  defaultMetricsPeriodDays: parseInt(process.env.NEXT_PUBLIC_DEFAULT_METRICS_PERIOD_DAYS || '30', 10),
  
  /**
   * Estimated seconds saved per suggestion
   */
  secondsPerSuggestion: parseInt(process.env.NEXT_PUBLIC_SECONDS_PER_SUGGESTION || '55', 10),

  /**
   * Default team slugs
   */
  defaultTeamSlugs: (process.env.NEXT_PUBLIC_DEFAULT_TEAM_SLUGS || '').split(',').filter(Boolean),
};
