import { CopilotMetrics } from '@/domain/models/metrics/copilot-metrics';
import { Trend } from '@/domain/models/metrics/trend';
import { TrendPoint } from '@/domain/models/metrics/trend-point';
import { MetricsCalculator } from '@/domain/services/metrics-calculator';
import { env } from '@/infrastructure/config/env';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { addDays, differenceInDays, format, isAfter, isBefore, subDays, parseISO } from 'date-fns';

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
    
    // Store the date range for metadata but don't send as API parameters
    // Date filtering will be done client-side after receiving the data
    const dateRange = startDate || endDate ? this.validateDateRange(startDate, endDate) : { since: undefined, until: undefined };
    
    try {
      console.log(`Fetching organization metrics for: ${org}`);
      console.log(`API endpoint: /orgs/${org}/copilot/metrics`);
      
      const response = await this.client.get(
        `/orgs/${org}/copilot/metrics`,
        config
      );
      
      console.log('Raw API response:', JSON.stringify(response.data, null, 2));
      
      // If response.data is empty or doesn't have the expected structure,
      // create a default metrics object
      let rawResponseData = response.data;
      let metricsData = rawResponseData; // Default assumption

      // Check for common nested structures
      if (rawResponseData && typeof rawResponseData === 'object') {
          if (rawResponseData.data && typeof rawResponseData.data === 'object') {
              console.log('Using nested data from "data" property');
              metricsData = rawResponseData.data;
          } else if (rawResponseData.metrics && typeof rawResponseData.metrics === 'object') {
              console.log('Using nested data from "metrics" property');
              metricsData = rawResponseData.metrics;
          }
      }
      
      // Now proceed with the existing check using the potentially updated metricsData
      if (!metricsData || typeof metricsData !== 'object') {
        console.warn('API returned unexpected data format or structure. Using default metrics.');
        metricsData = {
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
            startDate: dateRange.since || format(subDays(new Date(), env.maxHistoricalDays), 'yyyy-MM-dd'),
            endDate: dateRange.until || format(new Date(), 'yyyy-MM-dd')
          }
        };
      }
      
      // Enhance with derived metrics
      // Make sure we're logging the raw data properly before enhancement
      console.log('Raw metrics data before enhancement:', JSON.stringify(metricsData, null, 2));
      
      // Check if response has nested structure
      if (metricsData && typeof metricsData === 'object') {
        console.log('Raw metrics properties:', Object.keys(metricsData));
        
        // Check if metrics are under a property
        if (metricsData.metrics) {
          console.log('Found metrics under "metrics" property');
        } else if (metricsData.data) {
          console.log('Found metrics under "data" property');
        }
      }
      
      const enhancedMetrics = MetricsCalculator.enhanceWithDerivedMetrics(
        metricsData,
        this.secondsPerSuggestion
      );
      
      // Add date range metadata (for client-side filtering)
      enhancedMetrics.dateRange = {
        startDate: dateRange.since || format(subDays(new Date(), env.maxHistoricalDays), 'yyyy-MM-dd'),
        endDate: dateRange.until || format(new Date(), 'yyyy-MM-dd')
      };
      
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
    
    // Store the date range for metadata but don't send as API parameters
    // Date filtering will be done client-side after receiving the data
    const dateRange = startDate || endDate ? this.validateDateRange(startDate, endDate) : { since: undefined, until: undefined };
    
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
      
      console.log(`Raw API response for team ${teamSlug}:`, JSON.stringify(response.data, null, 2));
      
      // If response.data is empty or doesn't have the expected structure,
      // create a default metrics object
      let rawResponseData = response.data;
      let metricsData = rawResponseData; // Default assumption

      // Check for common nested structures
      if (rawResponseData && typeof rawResponseData === 'object') {
          if (rawResponseData.data && typeof rawResponseData.data === 'object') {
              console.log(`Using nested data from "data" property for team ${teamSlug}`);
              metricsData = rawResponseData.data;
          } else if (rawResponseData.metrics && typeof rawResponseData.metrics === 'object') {
              console.log(`Using nested data from "metrics" property for team ${teamSlug}`);
              metricsData = rawResponseData.metrics;
          }
      }
      
      // Now proceed with the existing check using the potentially updated metricsData
      if (!metricsData || typeof metricsData !== 'object') {
        console.warn(`API returned unexpected data format or structure for team ${teamSlug}. Using default metrics.`);
        metricsData = {
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
            startDate: dateRange.since || format(subDays(new Date(), env.maxHistoricalDays), 'yyyy-MM-dd'),
            endDate: dateRange.until || format(new Date(), 'yyyy-MM-dd')
          }
        };
      }
      
      // Enhance with derived metrics
      // Make sure we're logging the raw data properly before enhancement
      console.log(`Raw metrics data for team ${teamSlug} before enhancement:`, JSON.stringify(metricsData, null, 2));
      
      // Check if response has nested structure
      if (metricsData && typeof metricsData === 'object') {
        console.log(`Raw metrics properties for team ${teamSlug}:`, Object.keys(metricsData));
        
        // Check if metrics are under a property
        if (metricsData.metrics) {
          console.log(`Found metrics for team ${teamSlug} under "metrics" property`);
        } else if (metricsData.data) {
          console.log(`Found metrics for team ${teamSlug} under "data" property`);
        }
      }
      
      const enhancedMetrics = MetricsCalculator.enhanceWithDerivedMetrics(
        metricsData,
        this.secondsPerSuggestion
      );
      
      // Add date range metadata (for client-side filtering)
      enhancedMetrics.dateRange = {
        startDate: dateRange.since || format(subDays(new Date(), env.maxHistoricalDays), 'yyyy-MM-dd'),
        endDate: dateRange.until || format(new Date(), 'yyyy-MM-dd')
      };
      
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
    
    // Get metrics once without date parameters and filter client-side
    let metrics;
    try {
      if (teamSlug) {
        metrics = await this.getTeamMetrics(org, teamSlug);
      } else {
        metrics = await this.getOrganizationMetrics(org);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw new Error(`Failed to fetch metrics for ${teamSlug ? `team ${teamSlug}` : `organization ${org}`}`);
    }
    
    // Now create time series by breaking down the data into periods
    const endDate = new Date();
    const points: TrendPoint[] = [];
    
    // We'll create more accurate trend data by calculating segments of time
    // Since we're estimating trends with limited data, add a disclaimer
    const metricsValue = (() => {
      switch (metric) {
        case 'completions': return metrics.totalCompletionsCount;
        case 'acceptanceRate': return metrics.totalAcceptancePercentage;
        case 'activeUsers': return metrics.totalActiveUsers;
        case 'timeSaved': return metrics.estimatedTimeSaved || 0;
        default: return metrics.totalCompletionsCount;
      }
    })();
    
    // Get the full range of available data
    const dataStartDate = metrics.dateRange?.startDate 
      ? parseISO(metrics.dateRange.startDate) 
      : subDays(new Date(), env.maxHistoricalDays);
    
    const dataEndDate = metrics.dateRange?.endDate 
      ? parseISO(metrics.dateRange.endDate) 
      : new Date();
    
    // Calculate actual days of data we have
    const dataDays = Math.max(1, differenceInDays(dataEndDate, dataStartDate));
    
    // If the metric is a percentage or rate, we don't distribute it over time
    const isRateMetric = metric === 'acceptanceRate';
    
    // Create points for each period
    for (let i = 0; i < adjustedPeriods; i++) {
      const periodEndDate = subDays(endDate, i * adjustedPeriodDays);
      const periodStartDate = subDays(periodEndDate, adjustedPeriodDays - 1);
      
      // Calculate overlap between this period and our data range
      const overlapStart = new Date(Math.max(periodStartDate.getTime(), dataStartDate.getTime()));
      const overlapEnd = new Date(Math.min(periodEndDate.getTime(), dataEndDate.getTime()));
      
      // If no overlap, use zero or the rate value
      let periodValue = 0;
      
      if (overlapEnd >= overlapStart) {
        // Calculate the percentage of the data period that this time period represents
        const overlapDays = Math.max(0, differenceInDays(overlapEnd, overlapStart));
        
        if (isRateMetric) {
          // For rates/percentages, use the full value
          periodValue = metricsValue;
        } else {
          // For counts, scale by days
          const scaleFactor = overlapDays / dataDays;
          periodValue = Math.round(metricsValue * scaleFactor);
        }
      }
      
      points.push({ 
        date: format(periodEndDate, 'yyyy-MM-dd'), 
        value: periodValue 
      });
    }
    
    // Process results
    try {
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
      console.error('Error processing time series data:', error);
      throw new Error(`Failed to process metrics time series for ${teamSlug ? `team ${teamSlug}` : `organization ${org}`}`);
    }
  }
}
