import { CopilotMetrics } from '@/domain/models/metrics/copilot-metrics';
import { Trend } from '@/domain/models/metrics/trend';
import { TrendPoint } from '@/domain/models/metrics/trend-point';
import { MetricsCalculator } from '@/domain/services/metrics-calculator';
import { env } from '@/infrastructure/config/env';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { addDays, differenceInDays, format, isAfter, isBefore, subDays } from 'date-fns';

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
   * Validate date range against API limitations
   * @param startDate Start date to validate
   * @param endDate End date to validate
   * @returns Validated date range
   */
  private validateDateRange(startDate?: string, endDate?: string): { since?: string; until?: string } {
    const result: { since?: string; until?: string } = {};
    
    // Default end date is today
    const today = new Date();
    const endDateObj = endDate ? new Date(endDate) : today;
    
    // Ensure end date is not in the future
    if (isAfter(endDateObj, today)) {
      result.until = format(today, 'yyyy-MM-dd');
    } else {
      result.until = format(endDateObj, 'yyyy-MM-dd');
    }
    
    // If start date is provided
    if (startDate) {
      const startDateObj = new Date(startDate);
      
      // Calculate the earliest allowed date (28 days before end date)
      const earliestAllowed = subDays(endDateObj, env.maxHistoricalDays);
      
      // If start date is before earliest allowed, adjust it
      if (isBefore(startDateObj, earliestAllowed)) {
        console.warn(`Start date adjusted to ${env.maxHistoricalDays} days before end date due to API limitations`);
        result.since = format(earliestAllowed, 'yyyy-MM-dd');
      } else {
        result.since = format(startDateObj, 'yyyy-MM-dd');
      }
    }
    
    return result;
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
      // Validate and adjust dates based on API limitations
      const validatedDates = this.validateDateRange(startDate, endDate);
      
      config.params = {};
      if (validatedDates.since) config.params.since = validatedDates.since;
      if (validatedDates.until) config.params.until = validatedDates.until;
      
      // Log any date adjustments
      if (startDate && validatedDates.since !== startDate) {
        console.warn(`Start date adjusted from ${startDate} to ${validatedDates.since} due to API limitations`);
      }
      if (endDate && validatedDates.until !== endDate) {
        console.warn(`End date adjusted from ${endDate} to ${validatedDates.until}`);
      }
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
      // Validate and adjust dates based on API limitations
      const validatedDates = this.validateDateRange(startDate, endDate);
      
      config.params = {};
      if (validatedDates.since) config.params.since = validatedDates.since;
      if (validatedDates.until) config.params.until = validatedDates.until;
      
      // Log any date adjustments
      if (startDate && validatedDates.since !== startDate) {
        console.warn(`Start date adjusted from ${startDate} to ${validatedDates.since} due to API limitations`);
      }
      if (endDate && validatedDates.until !== endDate) {
        console.warn(`End date adjusted from ${endDate} to ${validatedDates.until}`);
      }
    }
    
    try {
      // Ensure the team slug is valid
      if (!teamSlug || teamSlug === 'teams') {
        throw new Error(`Invalid team slug: "${teamSlug}"`);
      }

      // Construct the API URL with correct path structure
      const endpoint = `/orgs/${org}/team/${teamSlug}/copilot/metrics`;
      
      console.log(`Fetching team metrics for: ${org}/${teamSlug}`);
      console.log(`API endpoint: ${endpoint}`);
      
      const response = await this.client.get(endpoint, config);
      
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
    // Validate team slug if provided
    if (teamSlug === 'teams') {
      throw new Error('Invalid team slug: "teams" is not allowed as it conflicts with the API path structure');
    }
    
    // Ensure we don't exceed the API limit of 28 days
    const totalDays = periods * periodDays;
    let adjustedPeriods = periods;
    let adjustedPeriodDays = periodDays;
    
    if (totalDays > env.maxHistoricalDays) {
      console.warn(`Requested ${totalDays} days of historical data, but GitHub API only allows ${env.maxHistoricalDays} days.`);
      
      // Try to maintain the requested number of periods if possible
      if (Math.ceil(env.maxHistoricalDays / periods) > 0) {
        // Can fit all periods with smaller period days
        adjustedPeriodDays = Math.floor(env.maxHistoricalDays / periods);
        console.log(`Adjusted period size to ${adjustedPeriodDays} days while keeping ${periods} periods.`);
      } else {
        // Reduce the number of periods
        adjustedPeriods = Math.floor(env.maxHistoricalDays / periodDays);
        if (adjustedPeriods === 0) {
          // If we can't even fit one period, use the max allowed days as one period
          adjustedPeriods = 1;
          adjustedPeriodDays = env.maxHistoricalDays;
        }
        console.log(`Adjusted to ${adjustedPeriods} periods of ${adjustedPeriodDays} days each.`);
      }
    }
    
    const endDate = new Date();
    const fetchPromises: Promise<{ date: string; metrics: CopilotMetrics }>[] = [];
    
    // Setup promises for parallel API calls with different date ranges
    for (let i = 0; i < adjustedPeriods; i++) {
      const periodEndDate = subDays(endDate, i * adjustedPeriodDays);
      const periodStartDate = subDays(periodEndDate, adjustedPeriodDays - 1);
      
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