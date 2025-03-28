import { TrendPoint } from './trend-point';

/**
 * Trend data for a metric
 */
export interface Trend {
  metric: string;
  points: TrendPoint[];
  changePercentage: number;
}
