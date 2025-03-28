/**
 * Result of a comparison between teams or time periods
 */
export interface ComparisonResult {
  metric: string;
  entities: string[];
  values: Record<string, number>;
  previousValues?: Record<string, number>;
  changePercentages?: Record<string, number>;
}
