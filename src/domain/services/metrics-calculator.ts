import { CopilotMetrics } from '../models/metrics/copilot-metrics';

/**
 * Service for calculating derived metrics
 */
export class MetricsCalculator {
  /**
   * Calculate estimated time saved based on acceptance count
   * 
   * This is an approximation that assumes each accepted suggestion saves the developer
   * a certain amount of time (defined by secondsPerSuggestion). The actual time saved
   * may vary based on multiple factors including:
   *   - Complexity of the code being written
   *   - Developer's typing speed and familiarity with the language
   *   - Length and complexity of the accepted suggestion
   * 
   * The default value of 55 seconds per suggestion is based on industry estimates and
   * can be configured in the application environment settings.
   * 
   * @param acceptanceCount Number of accepted suggestions
   * @param secondsPerSuggestion Average time saved per suggestion in seconds
   * @returns Estimated time saved in hours (rounded to 2 decimal places)
   */
  static calculateTimeSaved(
    acceptanceCount: number,
    secondsPerSuggestion: number = 55
  ): number {
    // Convert to hours and round to 2 decimal places for readability
    return Math.round((acceptanceCount * secondsPerSuggestion) / 36) / 100;
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
