import { CopilotMetrics } from '../models/metrics/copilot-metrics';

/**
 * Service for calculating derived metrics
 */
export class MetricsCalculator {
  /**
   * Calculate time saved based on acceptance count
   * @param acceptanceCount Number of accepted suggestions
   * @param secondsPerSuggestion Average time saved per suggestion in seconds
   * @returns Time saved in hours
   */
  static calculateTimeSaved(
    acceptanceCount: number,
    secondsPerSuggestion: number = 55
  ): number {
    return (acceptanceCount * secondsPerSuggestion) / 3600; // Convert to hours
  }

  /**
   * Add derived metrics to Copilot metrics
   * @param metrics Base metrics from API
   * @param secondsPerSuggestion Average time saved per suggestion in seconds
   * @returns Enhanced metrics with derived values
   */
  static enhanceWithDerivedMetrics(
    metrics: CopilotMetrics,
    secondsPerSuggestion: number = 55
  ): CopilotMetrics {
    const enhancedMetrics = { ...metrics };
    
    // Calculate estimated time saved
    enhancedMetrics.estimatedTimeSaved = this.calculateTimeSaved(
      metrics.totalAcceptanceCount,
      secondsPerSuggestion
    );
    
    return enhancedMetrics;
  }
}
