/**
 * Environment variables configuration
 */
export const env = {
  /**
   * Default organization name
   */
  defaultOrgName: process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME || 'your-org-name',
  
  /**
   * Maximum number of days allowed for historical data (API limitation)
   */
  maxHistoricalDays: 28,

  /**
   * Default metrics period in days
   */
  defaultMetricsPeriodDays: Math.min(parseInt(process.env.NEXT_PUBLIC_DEFAULT_METRICS_PERIOD_DAYS || '28', 10), 28),
  
  /**
   * Estimated seconds saved per suggestion
   */
  secondsPerSuggestion: parseInt(process.env.NEXT_PUBLIC_SECONDS_PER_SUGGESTION || '55', 10),

  /**
   * Default team slugs
   */
  defaultTeamSlugs: (process.env.NEXT_PUBLIC_DEFAULT_TEAM_SLUGS || '').split(',').filter(Boolean),
};
