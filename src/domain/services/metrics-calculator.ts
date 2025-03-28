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
    console.log('Input metrics to enhance:', metrics);
    
    const enhancedMetrics = { ...metrics };
    
    // Ensure required properties exist with defaults
    enhancedMetrics.totalCompletionsCount = metrics.totalCompletionsCount || 0;
    enhancedMetrics.totalSuggestionCount = metrics.totalSuggestionCount || 0;
    enhancedMetrics.totalAcceptanceCount = metrics.totalAcceptanceCount || 0;
    enhancedMetrics.totalAcceptancePercentage = metrics.totalAcceptancePercentage || 0;
    enhancedMetrics.totalActiveUsers = metrics.totalActiveUsers || 0;
    enhancedMetrics.avgCompletionsPerUser = metrics.avgCompletionsPerUser || 0;
    enhancedMetrics.avgSuggestionsPerUser = metrics.avgSuggestionsPerUser || 0;
    enhancedMetrics.avgAcceptancePercentage = metrics.avgAcceptancePercentage || 0;
    enhancedMetrics.repositoryMetrics = metrics.repositoryMetrics || [];
    enhancedMetrics.fileExtensionMetrics = metrics.fileExtensionMetrics || {};
    
    // Calculate estimated time saved
    enhancedMetrics.estimatedTimeSaved = this.calculateTimeSaved(
      metrics.totalAcceptanceCount,
      secondsPerSuggestion
    );
    
    console.log('Enhanced metrics:', enhancedMetrics);
    
    return enhancedMetrics;
  }
}
