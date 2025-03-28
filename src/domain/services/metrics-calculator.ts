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
   * Helper method to safely get a numeric value from an API response
   * Handles different property naming conventions (snake_case vs camelCase)
   * @param obj The object to extract value from
   * @param snakeCaseKey The snake_case key to check
   * @param camelCaseKey The camelCase key to check
   * @returns The numeric value or 0 if not found
   */
  private static getNumberValue(obj: any, snakeCaseKey: string, camelCaseKey: string): number {
    // Check for undefined or null object
    if (!obj) return 0;
    
    // Try snake_case first, then camelCase, then fallback to 0
    const value = obj[snakeCaseKey] !== undefined ? obj[snakeCaseKey] : 
                 (obj[camelCaseKey] !== undefined ? obj[camelCaseKey] : 0);
    
    // Handle string values that contain numbers
    if (typeof value === 'string') {
      const parsedValue = parseFloat(value);
      return isNaN(parsedValue) ? 0 : parsedValue;
    }
                 
    // Ensure we have a valid number
    return typeof value === 'number' ? value : 0;
  }

  /**
   * Add derived metrics to Copilot metrics
   * @param metricsData Base metrics from API
   * @param secondsPerSuggestion Average time saved per suggestion in seconds
   * @returns Enhanced metrics with derived values
   */
  static enhanceWithDerivedMetrics(
    metricsData: any,
    secondsPerSuggestion: number = 55
  ): CopilotMetrics {
    // Log the structure of the metrics data to help debug the mapping
    console.log('Metrics data structure:', Object.keys(metricsData));
    console.log('Input metrics to enhance:', metricsData);
    
    // Start with empty metrics object that matches our domain model
    const enhancedMetrics: CopilotMetrics = {
      totalCompletionsCount: 0,
      totalSuggestionCount: 0,
      totalAcceptanceCount: 0,
      totalAcceptancePercentage: 0,
      totalActiveUsers: 0,
      avgCompletionsPerUser: 0,
      avgSuggestionsPerUser: 0,
      avgAcceptancePercentage: 0,
      repositoryMetrics: [],
      fileExtensionMetrics: {},
      dateRange: {
        startDate: '',
        endDate: ''
      }
    };
    
    // Map values from API response format to our domain model
    // Handle both direct property access and potential nested structures
    if (metricsData) {
      // Check if data is nested under a property (common in some API responses)
      const metricsObj = metricsData.metrics || metricsData.data || metricsData;
      
      console.log('Metrics object to use for mapping:', metricsObj);
      
      // Direct property mapping with fallbacks to zero
      enhancedMetrics.totalCompletionsCount = this.getNumberValue(metricsObj, 'total_completions_count', 'totalCompletionsCount');
      enhancedMetrics.totalSuggestionCount = this.getNumberValue(metricsObj, 'total_suggestion_count', 'totalSuggestionCount');
      enhancedMetrics.totalAcceptanceCount = this.getNumberValue(metricsObj, 'total_acceptance_count', 'totalAcceptanceCount');
      enhancedMetrics.totalAcceptancePercentage = this.getNumberValue(metricsObj, 'total_acceptance_percentage', 'totalAcceptancePercentage');
      enhancedMetrics.totalActiveUsers = this.getNumberValue(metricsObj, 'total_active_users', 'totalActiveUsers');
      enhancedMetrics.avgCompletionsPerUser = this.getNumberValue(metricsObj, 'avg_completions_per_user', 'avgCompletionsPerUser');
      enhancedMetrics.avgSuggestionsPerUser = this.getNumberValue(metricsObj, 'avg_suggestions_per_user', 'avgSuggestionsPerUser');
      enhancedMetrics.avgAcceptancePercentage = this.getNumberValue(metricsObj, 'avg_acceptance_percentage', 'avgAcceptancePercentage');
      
      // Add some additional debugging
      console.log('Metric mappings results:', {
        totalCompletionsCount: enhancedMetrics.totalCompletionsCount,
        totalSuggestionCount: enhancedMetrics.totalSuggestionCount,
        totalAcceptanceCount: enhancedMetrics.totalAcceptanceCount,
        // Add other properties as needed
      });
      
      // Handle repositories array - could be named differently in API
      
      if (Array.isArray(metricsObj.repository_metrics)) {
        enhancedMetrics.repositoryMetrics = metricsObj.repository_metrics.map((repo: any) => ({
          repositoryId: repo.repository_id || repo.repositoryId || '',
          repositoryName: repo.repository_name || repo.repositoryName || '',
          completionsCount: repo.completions_count || repo.completionsCount || 0,
          suggestionsCount: repo.suggestions_count || repo.suggestionsCount || 0,
          acceptanceCount: repo.acceptance_count || repo.acceptanceCount || 0,
          acceptancePercentage: repo.acceptance_percentage || repo.acceptancePercentage || 0
        }));
      } else if (Array.isArray(metricsObj.repositoryMetrics)) {
        enhancedMetrics.repositoryMetrics = metricsObj.repositoryMetrics;
      }
      
      // Handle file extensions object - could be in different formats
      const fileExtMetrics = metricsObj.file_extension_metrics || metricsObj.fileExtensionMetrics || {};
      enhancedMetrics.fileExtensionMetrics = {};
      
      Object.keys(fileExtMetrics).forEach(ext => {
        const extData = fileExtMetrics[ext];
        enhancedMetrics.fileExtensionMetrics[ext] = {
          completionsCount: extData.completions_count || extData.completionsCount || 0,
          suggestionsCount: extData.suggestions_count || extData.suggestionsCount || 0,
          acceptanceCount: extData.acceptance_count || extData.acceptanceCount || 0,
          acceptancePercentage: extData.acceptance_percentage || extData.acceptancePercentage || 0
        };
      });
      
      // Handle date range if it exists
      if (metricsObj.dateRange) {
        enhancedMetrics.dateRange = metricsObj.dateRange;
      } else if (metricsObj.date_range) {
        enhancedMetrics.dateRange = {
          startDate: metricsObj.date_range.start_date || '',
          endDate: metricsObj.date_range.end_date || ''
        };
      }
    }
    
    // Calculate estimated time saved
    enhancedMetrics.estimatedTimeSaved = this.calculateTimeSaved(
      enhancedMetrics.totalAcceptanceCount,
      secondsPerSuggestion
    );
    
    console.log('Enhanced metrics:', enhancedMetrics);
    
    return enhancedMetrics;
  }
}
