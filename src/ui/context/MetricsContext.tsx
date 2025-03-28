'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import useSWR from 'swr';
import { format, subDays, parseISO, isWithinInterval } from 'date-fns';
import { CopilotMetrics } from '@/domain/models/metrics/copilot-metrics';
import { CopilotApiClient } from '@/infrastructure/api/github/copilot-api-client';
import { useAuth } from './AuthContext';
import { env } from '@/infrastructure/config/env';
import { MetricsCalculator } from '@/domain/services/metrics-calculator';

interface MetricsContextType {
  organizationMetrics: CopilotMetrics | null;
  filteredOrganizationMetrics: CopilotMetrics | null;
  teamMetrics: Record<string, CopilotMetrics>;
  filteredTeamMetrics: Record<string, CopilotMetrics>;
  loading: boolean;
  error: string | null;
  fetchOrganizationMetrics: () => Promise<void>;
  fetchTeamMetrics: (teamSlug: string) => Promise<void>;
  filterByDateRange: (startDate: string, endDate: string) => void;
  refreshData: () => Promise<void>;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

interface MetricsProviderProps {
  children: ReactNode;
}

export const MetricsProvider: React.FC<MetricsProviderProps> = ({ children }) => {
  // Full data states
  const [organizationMetrics, setOrganizationMetrics] = useState<CopilotMetrics | null>(null);
  const [teamMetrics, setTeamMetrics] = useState<Record<string, CopilotMetrics>>({});
  
  // Filtered data states based on selected date range
  const [filteredOrganizationMetrics, setFilteredOrganizationMetrics] = useState<CopilotMetrics | null>(null);
  const [filteredTeamMetrics, setFilteredTeamMetrics] = useState<Record<string, CopilotMetrics>>({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Current date range for filtering
  const [currentDateRange, setCurrentDateRange] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'), // Default to last 7 days
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  
  const { token } = useAuth();

  // Helper function to filter data by date range
  const filterDataByDateRange = (
    metrics: CopilotMetrics | null,
    startDate: string,
    endDate: string
  ): CopilotMetrics | null => {
    if (!metrics) return null;
    
    console.log('Filtering metrics by date range:', { startDate, endDate });
    
    // Check if we actually have data for the full 28-day range in metrics
    const hasFullData = metrics.dateRange && 
                        metrics.dateRange.startDate && 
                        metrics.dateRange.endDate;
    
    if (!hasFullData) {
      console.warn('Cannot properly filter metrics: missing date range information in source data');
      return metrics; // Return the original data if we can't filter
    }
    
    // Parse dates for calculations
    const fullRangeStart = parseISO(metrics.dateRange.startDate);
    const fullRangeEnd = parseISO(metrics.dateRange.endDate);
    const filterStart = parseISO(startDate);
    const filterEnd = parseISO(endDate);
    
    // Calculate overlap of selected range with available data range
    const effectiveStartDate = new Date(Math.max(filterStart.getTime(), fullRangeStart.getTime()));
    const effectiveEndDate = new Date(Math.min(filterEnd.getTime(), fullRangeEnd.getTime()));
    
    // If there's no overlap, return metrics object with zeros
    if (effectiveEndDate < effectiveStartDate) {
      console.warn('Selected date range has no overlap with available data');
      
      // Return a metrics object with zeros but maintain structure
      return {
        totalCompletionsCount: 0,
        totalSuggestionCount: 0,
        totalAcceptanceCount: 0,
        totalAcceptancePercentage: 0,
        totalActiveUsers: 0,
        avgCompletionsPerUser: 0,
        avgSuggestionsPerUser: 0,
        avgAcceptancePercentage: 0,
        estimatedTimeSaved: 0,
        repositoryMetrics: [],
        fileExtensionMetrics: {},
        dateRange: {
          startDate,
          endDate
        }
      };
    }
    
    // Calculate days for ratio (used only if no daily breakdown available)
    const fullRangeDays = Math.max(1, Math.round((fullRangeEnd.getTime() - fullRangeStart.getTime()) / (24 * 60 * 60 * 1000)));
    const filteredDays = Math.max(1, Math.round((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (24 * 60 * 60 * 1000)));
    const daysRatio = filteredDays / fullRangeDays;
    
    console.log(`Date range ratio: ${daysRatio} (${filteredDays}/${fullRangeDays} days)`);
    
    // Check if we have daily breakdown data (this would be ideal but GitHub API might not provide it)
    // If we had daily data, we'd filter like this:
    /*
    if (metrics.dailyBreakdown) {
      // Real filtering using daily data
      const filteredData = metrics.dailyBreakdown
        .filter(day => {
          const dayDate = parseISO(day.date);
          return dayDate >= effectiveStartDate && dayDate <= effectiveEndDate;
        })
        .reduce((totals, day) => {
          // Sum up all metrics from daily data
          totals.totalCompletionsCount += day.completionsCount;
          // etc.
          return totals;
        }, initialTotals);
    }
    */
    
    // Since we likely don't have daily data, use proportional scaling
    // This is an approximation but better than returning null or empty data
    const filtered: CopilotMetrics = {
      totalCompletionsCount: Math.round(metrics.totalCompletionsCount * daysRatio),
      totalSuggestionCount: Math.round(metrics.totalSuggestionCount * daysRatio),
      totalAcceptanceCount: Math.round(metrics.totalAcceptanceCount * daysRatio),
      // Protect against division by zero
      totalAcceptancePercentage: metrics.totalSuggestionCount > 0 ? 
        (Math.round(metrics.totalAcceptanceCount * daysRatio) / Math.round(metrics.totalSuggestionCount * daysRatio) * 100) : 
        metrics.totalAcceptancePercentage,
      // For users, we'll assume consistent usage across the period
      totalActiveUsers: Math.round(metrics.totalActiveUsers * daysRatio),
      avgCompletionsPerUser: metrics.totalActiveUsers > 0 ? 
        (Math.round(metrics.totalCompletionsCount * daysRatio) / Math.round(metrics.totalActiveUsers * daysRatio)) : 
        metrics.avgCompletionsPerUser,
      avgSuggestionsPerUser: metrics.totalActiveUsers > 0 ? 
        (Math.round(metrics.totalSuggestionCount * daysRatio) / Math.round(metrics.totalActiveUsers * daysRatio)) : 
        metrics.avgSuggestionsPerUser,
      avgAcceptancePercentage: metrics.avgAcceptancePercentage,
      // Scale estimated time saved
      estimatedTimeSaved: metrics.estimatedTimeSaved ? metrics.estimatedTimeSaved * daysRatio : 0,
      // Filter repositories - this is an approximation assuming uniform usage
      repositoryMetrics: metrics.repositoryMetrics.map(repo => ({
        ...repo,
        completionsCount: Math.round(repo.completionsCount * daysRatio),
        suggestionsCount: Math.round(repo.suggestionsCount * daysRatio),
        acceptanceCount: Math.round(repo.acceptanceCount * daysRatio),
        // Recalculate percentage to avoid inconsistencies
        acceptancePercentage: repo.suggestionsCount > 0 ? 
          (Math.round(repo.acceptanceCount * daysRatio) / Math.round(repo.suggestionsCount * daysRatio) * 100) : 
          repo.acceptancePercentage
      })),
      // Filter file extensions
      fileExtensionMetrics: Object.entries(metrics.fileExtensionMetrics).reduce((acc, [ext, extMetrics]) => {
        acc[ext] = {
          ...extMetrics,
          completionsCount: Math.round(extMetrics.completionsCount * daysRatio),
          suggestionsCount: Math.round(extMetrics.suggestionsCount * daysRatio),
          acceptanceCount: Math.round(extMetrics.acceptanceCount * daysRatio),
          // Recalculate percentage to avoid inconsistencies
          acceptancePercentage: extMetrics.suggestionsCount > 0 ? 
            (Math.round(extMetrics.acceptanceCount * daysRatio) / Math.round(extMetrics.suggestionsCount * daysRatio) * 100) : 
            extMetrics.acceptancePercentage
        };
        return acc;
      }, {} as Record<string, any>),
      // Update the date range to reflect the filtered period
      dateRange: {
        startDate: format(effectiveStartDate, 'yyyy-MM-dd'),
        endDate: format(effectiveEndDate, 'yyyy-MM-dd')
      }
    };
    
    // Ensure no null/undefined values in the filtered data
    Object.entries(filtered).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        (filtered as any)[key] = typeof metrics[key as keyof CopilotMetrics] === 'number' ? 0 : {};
      }
    });
    
    console.log('Filtered metrics:', filtered);
    return filtered;
  };
  
  // Public method to filter data by date range
  const filterByDateRange = (startDate: string, endDate: string) => {
    setCurrentDateRange({ startDate, endDate });
    
    // Filter organization metrics
    if (organizationMetrics) {
      const filtered = filterDataByDateRange(organizationMetrics, startDate, endDate);
      setFilteredOrganizationMetrics(filtered);
    }
    
    // Filter team metrics
    const filtered: Record<string, CopilotMetrics> = {};
    Object.entries(teamMetrics).forEach(([slug, metrics]) => {
      filtered[slug] = filterDataByDateRange(metrics, startDate, endDate) || metrics;
    });
    setFilteredTeamMetrics(filtered);
  };

  // Fetch organization metrics for the full 28-day period
  const fetchOrganizationMetrics = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const apiClient = new CopilotApiClient({
        token: token.value,
        secondsPerSuggestion: env.secondsPerSuggestion,
      });
      
      // Always fetch the max allowed historical data (28 days)
      const fullStartDate = format(subDays(new Date(), env.maxHistoricalDays), 'yyyy-MM-dd');
      const fullEndDate = format(new Date(), 'yyyy-MM-dd');
      
      const metrics = await apiClient.getOrganizationMetrics(
        token.organizationName,
        fullStartDate,
        fullEndDate
      );
      
      console.log('API response metrics:', metrics);
      
      setOrganizationMetrics(metrics);
      
      // Apply current date filter
      const filtered = filterDataByDateRange(
        metrics,
        currentDateRange.startDate,
        currentDateRange.endDate
      );
      setFilteredOrganizationMetrics(filtered);
    } catch (err) {
      console.error('Error fetching organization metrics:', err);
      setError('Failed to fetch organization metrics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch team metrics for the full 28-day period
  const fetchTeamMetrics = async (teamSlug: string) => {
    if (!token) return;
    
    setLoading(true);
    
    try {
      const apiClient = new CopilotApiClient({
        token: token.value,
        secondsPerSuggestion: env.secondsPerSuggestion,
      });
      
      // Always fetch the max allowed historical data (28 days)
      const fullStartDate = format(subDays(new Date(), env.maxHistoricalDays), 'yyyy-MM-dd');
      const fullEndDate = format(new Date(), 'yyyy-MM-dd');
      
      const metrics = await apiClient.getTeamMetrics(
        token.organizationName,
        teamSlug,
        fullStartDate,
        fullEndDate
      );
      
      // Store full data
      setTeamMetrics(prev => ({
        ...prev,
        [teamSlug]: metrics
      }));
      
      // Apply current date filter
      const filtered = filterDataByDateRange(
        metrics,
        currentDateRange.startDate,
        currentDateRange.endDate
      );
      
      setFilteredTeamMetrics(prev => ({
        ...prev,
        [teamSlug]: filtered || metrics
      }));
    } catch (err) {
      console.error(`Error fetching team metrics for ${teamSlug}:`, err);
      setError(`Failed to fetch team metrics for ${teamSlug}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Refresh all data
  const refreshData = async () => {
    setError(null);
    
    try {
      await fetchOrganizationMetrics();
      
      // Refresh all team metrics that we've already loaded
      const teamPromises = Object.keys(teamMetrics).map(
        teamSlug => fetchTeamMetrics(teamSlug)
      );
      
      await Promise.all(teamPromises);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh metrics data');
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    if (token) {
      fetchOrganizationMetrics();
    }
  }, [token]);

  return (
    <MetricsContext.Provider
      value={{
        organizationMetrics,
        filteredOrganizationMetrics,
        teamMetrics,
        filteredTeamMetrics,
        loading,
        error,
        fetchOrganizationMetrics,
        fetchTeamMetrics,
        filterByDateRange,
        refreshData
      }}
    >
      {children}
    </MetricsContext.Provider>
  );
};

// Custom hook to use metrics context
export const useMetrics = (): MetricsContextType => {
  const context = useContext(MetricsContext);
  
  if (context === undefined) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  
  return context;
};
