'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CopilotMetrics } from '@/domain/models/metrics/copilot-metrics';
import { MetricsService } from '@/application/metrics/metrics-service';
import { CopilotApiClient } from '@/infrastructure/api/github/copilot-api-client';
import { useAuth } from './AuthContext';

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
  const [organizationMetrics, setOrganizationMetrics] = useState<CopilotMetrics | null>(null);
  const [teamMetrics, setTeamMetrics] = useState<Record<string, CopilotMetrics>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { token } = useAuth();

  // Create metrics service when token is available
  const getMetricsService = () => {
    if (!token) {
      throw new Error('Authentication token is not available');
    }
    
    const apiClient = new CopilotApiClient({
      token: token.value,
      secondsPerSuggestion: 55,
    });
    
    return new MetricsService(apiClient, {
      cacheEnabled: true,
      cacheTtlMs: 30 * 60 * 1000, // 30 minutes
    });
  };

  // Fetch organization metrics
  const fetchOrganizationMetrics = async (startDate?: string, endDate?: string) => {
    if (!token) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const metricsService = getMetricsService();
      const metrics = await metricsService.getOrganizationMetrics(
        token.organizationName,
        startDate,
        endDate
      );
      
      setOrganizationMetrics(metrics);
    } catch (err) {
      console.error('Error fetching organization metrics:', err);
      setError('Failed to fetch organization metrics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch team metrics
  const fetchTeamMetrics = async (teamSlug: string, startDate?: string, endDate?: string) => {
    if (!token) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const metricsService = getMetricsService();
      const metrics = await metricsService.getTeamMetrics(
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <MetricsContext.Provider
      value={{
        organizationMetrics,
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
