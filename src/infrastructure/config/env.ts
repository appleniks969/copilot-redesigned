/**
 * Environment configuration
 */
export const env = {
  // Organization and team config
  defaultOrgName: process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME || '',
  defaultTeamSlugs: process.env.NEXT_PUBLIC_DEFAULT_TEAM_SLUGS 
    ? process.env.NEXT_PUBLIC_DEFAULT_TEAM_SLUGS.split(',')
    : [],
  
  // Metrics config
  defaultMetricsPeriodDays: parseInt(process.env.NEXT_PUBLIC_DEFAULT_METRICS_PERIOD_DAYS || '30', 10),
  secondsPerSuggestion: parseInt(process.env.NEXT_PUBLIC_SECONDS_PER_SUGGESTION || '55', 10),
};

/**
 * Check if all required environment variables are defined
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
  const required: (keyof typeof env)[] = [
    'defaultOrgName',
  ];
  
  const missing = required.filter(key => !env[key]);
  
  return {
    valid: missing.length === 0,
    missing,
  };
}
