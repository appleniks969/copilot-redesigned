'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import useSWR from 'swr';
import { format, subDays } from 'date-fns';
import { CopilotMetrics } from '@/domain/models/metrics/copilot-metrics';
import { MetricsService } from '@/application/metrics/metrics-service';
import { CopilotApiClient } from '@/infrastructure/api/github/copilot-api-client';
import { useAuth } from './AuthContext';
import { env } from '@/infrastructure/config/env';

interface MetricsContextType {
  organizationMetrics: CopilotMetrics | null;
  teamMetrics: Record<string, CopilotMetrics>;
  loading: boolean;
  error: string | null;
  fetchOrganizationMetrics: (startDate?: string, endDate?: string) => Promise<void>;
  fetchTeamMetrics: (teamSlug: string, startDate?: string, endDate?: string) => Promise<void>;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

interface MetricsProviderProps {
  children: ReactNode;
}

export const MetricsProvider: React.FC<MetricsProviderProps> = ({ children }) => {
  const [teamMetrics, setTeamMetrics] = useState<Record<string, CopilotMetrics>>({});
  const [error, setError] = useState<string | null>(null);
  
  const { token } = useAuth();

  // Create a fetcher function for SWR
  const fetcher = async (url: string) => {
    if (!token) {
      throw new Error('Authentication token is not available');
    }
    
    const apiClient = new CopilotApiClient({
      token: token.value,
      secondsPerSuggestion: env.secondsPerSuggestion,
    });
    
    // Parse the URL to extract parameters
    const urlObj = new URL(url, window.location.origin);
    const params = Object.fromEntries(urlObj.searchParams);
    
    // Determine what to fetch based on the URL path
    if (url.includes('/api/org-metrics')) {
      return apiClient.getOrganizationMetrics(
        token.organizationName,
        params.startDate,
        params.endDate
      );
    } else if (url.includes('/api/team-metrics')) {
      const teamSlug = params.teamSlug;
      if (!teamSlug) throw new Error('Team slug is required');
      
      return apiClient.getTeamMetrics(
        token.organizationName,
        teamSlug,
        params.startDate,
        params.endDate
      );
    }
    
    throw new Error('Invalid URL');
  };

  // Use SWR for organization metrics
  const getOrgMetricsKey = (startDate?: string, endDate?: string) => {
    if (!token) return null; // Don't fetch if not authenticated
    
    const url = new URL('/api/org-metrics', window.location.origin);
    if (startDate) url.searchParams.append('startDate', startDate);
    if (endDate) url.searchParams.append('endDate', endDate);
    
    return url.toString();
  };

  // Fetch organization metrics using SWR
  const fetchOrganizationMetrics = async (startDate?: string, endDate?: string) => {
    if (!token) return;
    
    try {
      const key = getOrgMetricsKey(startDate, endDate);
      if (!key) return;
      
      // Trigger a revalidation
      await mutate(key);
    } catch (err) {
      console.error('Error fetching organization metrics:', err);
      setError('Failed to fetch organization metrics');
      throw err;
    }
  };

  // Use SWR for organization metrics with a default date range
  const defaultStartDate = format(subDays(new Date(), env.maxHistoricalDays), 'yyyy-MM-dd');
  const defaultEndDate = format(new Date(), 'yyyy-MM-dd');
  
  const { data: organizationMetrics, error: orgError, mutate } = useSWR(
    getOrgMetricsKey(defaultStartDate, defaultEndDate),
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
      dedupingInterval: 30 * 1000, // Dedupe requests within 30 seconds
    }
  );

  // Update error state from SWR
  useEffect(() => {
    if (orgError) {
      console.error('SWR error fetching organization metrics:', orgError);
      setError('Failed to fetch organization metrics');
    }
  }, [orgError]);

  // Helper function to get team metrics key for SWR
  const getTeamMetricsKey = (teamSlug: string, startDate?: string, endDate?: string) => {
    if (!token) return null;
    
    const url = new URL('/api/team-metrics', window.location.origin);
    url.searchParams.append('teamSlug', teamSlug);
    if (startDate) url.searchParams.append('startDate', startDate);
    if (endDate) url.searchParams.append('endDate', endDate);
    
    return url.toString();
  };

  // Fetch team metrics
  const fetchTeamMetrics = async (teamSlug: string, startDate?: string, endDate?: string) => {
    if (!token) return;
    
    try {
      const apiClient = new CopilotApiClient({
        token: token.value,
        secondsPerSuggestion: env.secondsPerSuggestion,
      });
      
      const metrics = await apiClient.getTeamMetrics(
        token.organizationName,
        teamSlug,
        startDate,
        endDate
      );
      
      setTeamMetrics((prevTeamMetrics) => ({
        ...prevTeamMetrics,
        [teamSlug]: metrics,
      }));
    } catch (err) {
      console.error(`Error fetching team metrics for ${teamSlug}:`, err);
      setError(`Failed to fetch team metrics for ${teamSlug}`);
      throw err;
    }
  };

  // Determine loading state based on SWR
  const loading = !organizationMetrics && !error;

  return (
    <MetricsContext.Provider
      value={{
        organizationMetrics: organizationMetrics || null,
        teamMetrics,
        loading,
        error,
        fetchOrganizationMetrics,
        fetchTeamMetrics,
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
