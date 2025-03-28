'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { format, subDays } from 'date-fns';
import { CopilotMetrics } from '@/domain/models/metrics/copilot-metrics';
import { CopilotApiClient } from '@/infrastructure/api/github/copilot-api-client';
import { useAuth } from './AuthContext';
import { env } from '@/infrastructure/config/env';

interface MetricsContextType {
  organizationMetrics: CopilotMetrics | null;
  teamMetrics: Record<string, CopilotMetrics>;
  loading: boolean;
  error: string | null;
  fetchOrganizationMetrics: () => Promise<void>;
  fetchTeamMetrics: (teamSlug: string) => Promise<void>;
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
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { token } = useAuth();

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
        teamMetrics,
        loading,
        error,
        fetchOrganizationMetrics,
        fetchTeamMetrics,
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
