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
        Authorization: `Bearer ${options.token}`,
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
    
    try {
      console.log(`Fetching organization metrics for: ${org}`);
      console.log(`API endpoint: /orgs/${org}/copilot/metrics`);
      
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
    } catch (error: any) {
      console.error('Error fetching organization metrics:', error);
      console.error('Request URL:', `/orgs/${org}/copilot/metrics`);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received from server');
      }
      
      throw new Error(
        `Failed to fetch Copilot metrics for organization: ${org}. ` +
        `Status: ${error.response?.status || 'unknown'}. ` +
        `Message: ${error.response?.data?.message || error.message || 'Unknown error'}`
      );
    }
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
    
    try {
      console.log(`Fetching team metrics for: ${org}/${teamSlug}`);
      console.log(`API endpoint: /orgs/${org}/team/${teamSlug}/copilot/metrics`);
      
      const response = await this.client.get(
        `/orgs/${org}/team/${teamSlug}/copilot/metrics`,
        config
      );
      
      // Enhance with derived metrics
      const enhancedMetrics = MetricsCalculator.enhanceWithDerivedMetrics(
        response.data,
        this.secondsPerSuggestion
      );
      
      return enhancedMetrics;
    } catch (error: any) {
      console.error(`Error fetching team metrics for ${org}/${teamSlug}:`, error);
      console.error('Request URL:', `/orgs/${org}/team/${teamSlug}/copilot/metrics`);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received from server');
      }
      
      throw new Error(
        `Failed to fetch Copilot metrics for team: ${org}/${teamSlug}. ` +
        `Status: ${error.response?.status || 'unknown'}. ` +
        `Message: ${error.response?.data?.message || error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Generate time series data by making multiple API calls in parallel
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
    const fetchPromises: Promise<{ date: string; metrics: CopilotMetrics }>[] = [];
    
    // Setup promises for parallel API calls with different date ranges
    for (let i = 0; i < periods; i++) {
      const periodEndDate = subDays(endDate, i * periodDays);
      const periodStartDate = subDays(periodEndDate, periodDays - 1);
      
      const formattedStartDate = format(periodStartDate, 'yyyy-MM-dd');
      const formattedEndDate = format(periodEndDate, 'yyyy-MM-dd');
      
      const fetchPromise = (async () => {
        const metrics = teamSlug
          ? await this.getTeamMetrics(org, teamSlug, formattedStartDate, formattedEndDate)
          : await this.getOrganizationMetrics(org, formattedStartDate, formattedEndDate);
        
        return { date: formattedEndDate, metrics };
      })();
      
      fetchPromises.push(fetchPromise);
    }
    
    // Wait for all API calls to complete
    try {
      const results = await Promise.all(fetchPromises);
      
      // Process results
      const points: TrendPoint[] = results.map(({ date, metrics }) => {
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
        
        return { date, value };
      });
      
      // Sort points chronologically
      const sortedPoints = points.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Calculate change percentage
      const firstValue = sortedPoints[0]?.value || 0;
      const lastValue = sortedPoints[sortedPoints.length - 1]?.value || 0;
      const changePercentage = firstValue === 0
        ? 0
        : ((lastValue - firstValue) / firstValue) * 100;
      
      return {
        metric,
        points: sortedPoints,
        changePercentage,
      };
    } catch (error) {
      console.error('Error fetching time series data:', error);
      throw new Error(`Failed to fetch metrics time series for ${teamSlug ? `team ${teamSlug}` : `organization ${org}`}`);
    }
  }
}
