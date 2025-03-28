'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/ui/components/layout/DashboardLayout';
import { MetricCard } from '@/ui/components/metrics/cards/MetricCard';
import { LineChart } from '@/ui/components/metrics/charts/LineChart';
import { useMetrics } from '@/ui/context/MetricsContext';
import { useAuth } from '@/ui/context/AuthContext';
import { Trend } from '@/domain/models/metrics/trend';
import { env } from '@/infrastructure/config/env';

export default function TeamDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.team as string;
  
  const { token, isAuthenticated } = useAuth();
  const { 
    teamMetrics,
    loading, 
    error, 
    fetchTeamMetrics,
    refreshData
  } = useMetrics();
  
  const [refreshing, setRefreshing] = useState(false);
  
  // Get the current team's metrics
  const currentTeamMetrics = teamMetrics[teamSlug];
  const [errorState, setErrorState] = useState(false);

  // Validate the team slug
  useEffect(() => {
    if (teamSlug === 'teams') {
      console.error('Invalid team slug: "teams" conflicts with the API path structure');
      setErrorState(true);
    }
  }, [teamSlug]);

  // Fetch team data if needed
  useEffect(() => {
    const fetchData = async () => {
      if (!token || !teamSlug || teamSlug === 'teams' || errorState) return;
      
      try {
        // Check if we already have data for this team
        if (!teamMetrics[teamSlug]) {
          await fetchTeamMetrics(teamSlug);
        }
      } catch (err) {
        console.error('Error fetching team metrics:', err);
        setErrorState(true);
      }
    };
    
    if (isAuthenticated) {
      fetchData();
    }
  }, [token, teamSlug, isAuthenticated, teamMetrics, fetchTeamMetrics, errorState]);

  // Handle refresh button click
  const handleRefresh = async () => {
    if (!token || !teamSlug || teamSlug === 'teams') return;
    
    setRefreshing(true);
    setErrorState(false);
    
    try {
      // Re-fetch data for this team
      await fetchTeamMetrics(teamSlug);
    } catch (err) {
      console.error('Error refreshing team data:', err);
      setErrorState(true);
    } finally {
      setRefreshing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error || errorState) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          <h2 className="text-lg font-semibold">Error</h2>
          <p>{error || `Failed to load metrics for team: ${teamSlug}`}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Not found state
  if (!currentTeamMetrics) {
    return (
      <DashboardLayout>
        <div className="bg-yellow-50 p-4 rounded-md text-yellow-700">
          <h2 className="text-lg font-semibold">Team Not Found</h2>
          <p>No metrics data found for team: {teamSlug}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{teamSlug}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className={`flex items-center px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-sm hover:bg-blue-100 ${
              refreshing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={refreshing}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {/* API Limitation Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 text-sm">
        <p className="text-blue-800">
          <span className="font-medium">Note:</span> GitHub Copilot Metrics API has a limitation of {env.maxHistoricalDays} days of historical data. 
          The dashboard always shows data for the last {env.maxHistoricalDays} days.
        </p>
      </div>
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Team Acceptance Rate"
          value={currentTeamMetrics.totalAcceptancePercentage || 0}
          change={currentTeamMetrics.totalAcceptancePercentage - currentTeamMetrics.avgAcceptancePercentage}
          format="percentage"
        />
        <MetricCard
          title="Team Completions"
          value={currentTeamMetrics.totalCompletionsCount || 0}
          format="number"
        />
        <MetricCard
          title="Team Active Users"
          value={currentTeamMetrics.totalActiveUsers || 0}
          format="users"
        />
        <MetricCard
          title="Avg Per User"
          value={currentTeamMetrics.avgCompletionsPerUser || 0}
          format="number"
        />
      </div>
      
      {/* Repository & Language Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Repository Metrics */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Team Repository Activity</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Repository
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acceptance %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentTeamMetrics.repositoryMetrics && 
                 currentTeamMetrics.repositoryMetrics
                  .sort((a, b) => b.completionsCount - a.completionsCount)
                  .slice(0, 5)
                  .map((repo) => (
                    <tr key={repo.repositoryId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {repo.repositoryName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {repo.acceptancePercentage.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {repo.completionsCount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Language Breakdown */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Language Breakdown</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            {currentTeamMetrics.fileExtensionMetrics && 
              Object.entries(currentTeamMetrics.fileExtensionMetrics)
                .sort(([, a], [, b]) => b.completionsCount - a.completionsCount)
                .slice(0, 5)
                .map(([extension, metrics]) => {
                  const percentage = currentTeamMetrics.totalCompletionsCount ? 
                    (metrics.completionsCount / currentTeamMetrics.totalCompletionsCount) * 100 : 0;
                  
                  return (
                    <div key={extension} className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {extension}
                        </span>
                        <span className="text-sm text-gray-500">
                          {percentage.toFixed(1)}% ({metrics.completionsCount.toLocaleString()})
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
