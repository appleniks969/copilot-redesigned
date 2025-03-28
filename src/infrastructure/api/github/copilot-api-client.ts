import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { CopilotMetrics } from '@/domain/models/metrics/copilot-metrics';
import { Trend } from '@/domain/models/metrics/trend';
import { TrendPoint } from '@/domain/models/metrics/trend-point';
import { MetricsCalculator } from '@/domain/services/metrics-calculator';
import { subDays, format, addDays, differenceInDays } from 'date-fns';

/**
 * Options for the Copilot API client
 */
export interface CopilotApiClientOptions {
  token: string;
  baseUrl?: string;
  secondsPerSuggestion?: number;
}

/**
 * Client for the GitHub Copilot Metrics API
 */
export class CopilotApiClient {
  private client: AxiosInstance;
  private secondsPerSuggestion: number;

  constructor(private options: CopilotApiClientOptions) {
    this.secondsPerSuggestion = options.secondsPerSuggestion || 55;
    
    const baseURL = options.baseUrl || 'https://api.github.com';
    
    // Create axios instance with authentication
    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `token ${options.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
  }

  /**
   * Get metrics for an organization
   * @param org Organization name
   * @param startDate Optional start date (ISO 8601)
   * @param endDate Optional end date (ISO 8601)
   * @returns Copilot metrics for the organization
   */
  async getOrganizationMetrics(
    org: string,
    startDate?: string,
    endDate?: string
  ): Promise<CopilotMetrics> {
    const config: AxiosRequestConfig = {};
    
    if (startDate || endDate) {
      config.params = {};
      if (startDate) config.params.since = startDate;
      if (endDate) config.params.until = endDate;
    }
    
    const response = await this.client.get(
      `/orgs/${org}/copilot/metrics`,
      config
    );
    
    // Enhance with derived metrics
    const enhancedMetrics = MetricsCalculator.enhanceWithDerivedMetrics(
      response.data,
      this.secondsPerSuggestion
    );
    
    return enhancedMetrics;
  }

  /**
   * Get metrics for a team
   * @param org Organization name
   * @param teamSlug Team slug
   * @param startDate Optional start date (ISO 8601)
   * @param endDate Optional end date (ISO 8601)
   * @returns Copilot metrics for the team
   */
  async getTeamMetrics(
    org: string,
    teamSlug: string,
    startDate?: string,
    endDate?: string
  ): Promise<CopilotMetrics> {
    const config: AxiosRequestConfig = {};
    
    if (startDate || endDate) {
      config.params = {};
      if (startDate) config.params.since = startDate;
      if (endDate) config.params.until = endDate;
    }
    
    const response = await this.client.get(
      `/orgs/${org}/teams/${teamSlug}/copilot/metrics`,
      config
    );
    
    // Enhance with derived metrics
    const enhancedMetrics = MetricsCalculator.enhanceWithDerivedMetrics(
      response.data,
      this.secondsPerSuggestion
    );
    
    return enhancedMetrics;
  }

  /**
   * Generate time series data by making multiple API calls
   * @param org Organization name
   * @param metric Metric to track
   * @param teamSlug Optional team slug
   * @param periods Number of periods to fetch
   * @param periodDays Days per period
   * @returns Trend data
   */
  async getMetricsTimeSeries(
    org: string,
    metric: string,
    teamSlug?: string,
    periods: number = 10,
    periodDays: number = 7
  ): Promise<Trend> {
    const endDate = new Date();
    const points: TrendPoint[] = [];
    let previousValue: number | null = null;
    
    // Make multiple API calls with different date ranges
    for (let i = 0; i < periods; i++) {
      const periodEndDate = subDays(endDate, i * periodDays);
      const periodStartDate = subDays(periodEndDate, periodDays - 1);
      
      const formattedStartDate = format(periodStartDate, 'yyyy-MM-dd');
      const formattedEndDate = format(periodEndDate, 'yyyy-MM-dd');
      
      const metrics = teamSlug 
        ? await this.getTeamMetrics(org, teamSlug, formattedStartDate, formattedEndDate)
        : await this.getOrganizationMetrics(org, formattedStartDate, formattedEndDate);
      
      let value = 0;
      
      // Extract the requested metric
      switch (metric) {
        case 'completions':
          value = metrics.totalCompletionsCount;
          break;
        case 'acceptanceRate':
          value = metrics.totalAcceptancePercentage;
          break;
        case 'activeUsers':
          value = metrics.totalActiveUsers;
          break;
        case 'timeSaved':
          value = metrics.estimatedTimeSaved || 0;
          break;
        default:
          value = metrics.totalCompletionsCount;
      }
      
      points.push({
        date: formattedEndDate,
        value,
      });
    }
    
    // Calculate change percentage
    const firstValue = points[points.length - 1]?.value || 0;
    const lastValue = points[0]?.value || 0;
    const changePercentage = firstValue === 0
      ? 0
      : ((lastValue - firstValue) / firstValue) * 100;
    
    return {
      metric,
      points: points.reverse(), // Reverse to get chronological order
      changePercentage,
    };
  }
}
