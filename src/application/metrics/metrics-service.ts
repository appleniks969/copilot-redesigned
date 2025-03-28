import { CopilotApiClient } from '@/infrastructure/api/github/copilot-api-client';
import { CacheService } from '@/infrastructure/cache/cache-service';
import { CopilotMetrics } from '@/domain/models/metrics/copilot-metrics';
import { Trend } from '@/domain/models/metrics/trend';
import { ComparisonResult } from '@/domain/models/metrics/comparison-result';
import { MetricsCalculator } from '@/domain/services/metrics-calculator';

/**
 * Options for the metrics service
 */
export interface MetricsServiceOptions {
  cacheEnabled?: boolean;
  cacheTtlMs?: number;
  secondsPerSuggestion?: number;
}

/**
 * Application service for handling metrics operations
 */
export class MetricsService {
  private cacheService: CacheService | null = null;
  private secondsPerSuggestion: number;

  /**
   * Create a new metrics service
   * @param copilotApiClient Copilot API client
   * @param options Service options
   */
  constructor(
    private copilotApiClient: CopilotApiClient,
    options: MetricsServiceOptions = {}
  ) {
    this.secondsPerSuggestion = options.secondsPerSuggestion || 55;
    
    if (options.cacheEnabled !== false) {
      this.cacheService = new CacheService(options.cacheTtlMs);
    }
  }

  /**
   * Get organization metrics
   * @param org Organization name
   * @param startDate Optional start date
   * @param endDate Optional end date
   * @param skipCache Skip cache and force fetch
   * @returns Copilot metrics for the organization
   */
  async getOrganizationMetrics(
    org: string,
    startDate?: string,
    endDate?: string,
    skipCache: boolean = false
  ): Promise<CopilotMetrics> {
    const cacheKey = `org-metrics-${org}-${startDate || 'all'}-${endDate || 'all'}`;
    
    // Check cache first
    if (!skipCache && this.cacheService) {
      const cachedData = this.cacheService.get<CopilotMetrics>(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }
    }
    
    // Fetch from API
    const metrics = await this.copilotApiClient.getOrganizationMetrics(
      org,
      startDate,
      endDate
    );
    
    // Cache the result
    if (this.cacheService) {
      this.cacheService.set(cacheKey, metrics);
    }
    
    return metrics;
  }
  
  /**
   * Get team metrics
   * @param org Organization name
   * @param teamSlug Team slug
   * @param startDate Optional start date
   * @param endDate Optional end date
   * @param skipCache Skip cache and force fetch
   * @returns Copilot metrics for the team
   */
  async getTeamMetrics(
    org: string,
    teamSlug: string,
    startDate?: string,
    endDate?: string,
    skipCache: boolean = false
  ): Promise<CopilotMetrics> {
    const cacheKey = `team-metrics-${org}-${teamSlug}-${startDate || 'all'}-${endDate || 'all'}`;
    
    // Check cache first
    if (!skipCache && this.cacheService) {
      const cachedData = this.cacheService.get<CopilotMetrics>(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }
    }
    
    // Fetch from API
    const metrics = await this.copilotApiClient.getTeamMetrics(
      org,
      teamSlug,
      startDate,
      endDate
    );
    
    // Cache the result
    if (this.cacheService) {
      this.cacheService.set(cacheKey, metrics);
    }
    
    return metrics;
  }
  
  /**
   * Get metrics trend
   * @param org Organization name
   * @param metric Metric to track
   * @param teamSlug Optional team slug
   * @param periods Number of periods to fetch
   * @param periodDays Days per period
   * @param skipCache Skip cache and force fetch
   * @returns Trend data
   */
  async getMetricsTrend(
    org: string,
    metric: string,
    teamSlug?: string,
    periods: number = 10,
    periodDays: number = 7,
    skipCache: boolean = false
  ): Promise<Trend> {
    const cacheKey = `metrics-trend-${org}-${teamSlug || 'org'}-${metric}-${periods}-${periodDays}`;
    
    // Check cache first
    if (!skipCache && this.cacheService) {
      const cachedData = this.cacheService.get<Trend>(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }
    }
    
    // Fetch from API
    const trend = await this.copilotApiClient.getMetricsTimeSeries(
      org,
      metric,
      teamSlug,
      periods,
      periodDays
    );
    
    // Cache the result
    if (this.cacheService) {
      this.cacheService.set(cacheKey, trend);
    }
    
    return trend;
  }
  
  /**
   * Get comparison data between teams
   * @param org Organization name
   * @param teamSlugs Team slugs to compare
   * @param metric Metric to compare
   * @param startDate Optional start date
   * @param endDate Optional end date
   * @param skipCache Skip cache and force fetch
   * @returns Comparison result
   */
  async getTeamComparisonData(
    org: string,
    teamSlugs: string[],
    metric: string,
    startDate?: string,
    endDate?: string,
    skipCache: boolean = false
  ): Promise<ComparisonResult> {
    const cacheKey = `team-comparison-${org}-${teamSlugs.join(',')}-${metric}-${startDate || 'all'}-${endDate || 'all'}`;
    
    // Check cache first
    if (!skipCache && this.cacheService) {
      const cachedData = this.cacheService.get<ComparisonResult>(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }
    }
    
    const values: Record<string, number> = {};
    
    // Get metrics for each team
    for (const teamSlug of teamSlugs) {
      const teamMetrics = await this.getTeamMetrics(
        org,
        teamSlug,
        startDate,
        endDate,
        skipCache
      );
      
      // Extract the requested metric
      let value = 0;
      
      switch (metric) {
        case 'completions':
          value = teamMetrics.totalCompletionsCount;
          break;
        case 'acceptanceRate':
          value = teamMetrics.totalAcceptancePercentage;
          break;
        case 'activeUsers':
          value = teamMetrics.totalActiveUsers;
          break;
        case 'timeSaved':
          value = teamMetrics.estimatedTimeSaved || 0;
          break;
        default:
          value = teamMetrics.totalCompletionsCount;
      }
      
      values[teamSlug] = value;
    }
    
    const result: ComparisonResult = {
      metric,
      entities: teamSlugs,
      values,
    };
    
    // Cache the result
    if (this.cacheService) {
      this.cacheService.set(cacheKey, result);
    }
    
    return result;
  }
  
  /**
   * Calculate time saved based on acceptance count
   * @param acceptanceCount Number of accepted suggestions
   * @returns Time saved in hours
   */
  calculateTimeSaved(acceptanceCount: number): number {
    return MetricsCalculator.calculateTimeSaved(
      acceptanceCount,
      this.secondsPerSuggestion
    );
  }
  
  /**
   * Clear all cached data
   */
  clearCache(): void {
    if (this.cacheService) {
      this.cacheService.clear();
    }
  }
}
