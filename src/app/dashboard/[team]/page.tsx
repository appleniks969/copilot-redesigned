'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/ui/components/layout/DashboardLayout';
import { MetricCard } from '@/ui/components/metrics/cards/MetricCard';
import { LineChart } from '@/ui/components/metrics/charts/LineChart';
import { DateRangePicker } from '@/ui/components/metrics/DateRangePicker';
import { useMetrics } from '@/ui/context/MetricsContext';
import { useAuth } from '@/ui/context/AuthContext';
import { CopilotApiClient } from '@/infrastructure/api/github/copilot-api-client';
import { Trend } from '@/domain/models/metrics/trend';
import { format } from 'date-fns';
import { env } from '@/infrastructure/config/env';

export default function TeamDashboardPage() {
  const params = useParams();
  const teamSlug = params.team as string;
  
  const { token } = useAuth();
  const { teamMetrics, loading, error, fetchTeamMetrics } = useMetrics();
  
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - env.defaultMetricsPeriodDays * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  
  const [completionsTrend, setCompletionsTrend] = useState<Trend | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  
  // Get the current team's metrics
  const currentTeamMetrics = teamMetrics[teamSlug];

  // Fetch team metrics on component mount and when date range changes
  useEffect(() => {
    if (token && teamSlug) {
      fetchTeamMetrics(teamSlug, dateRange.startDate, dateRange.endDate);
    }
  }, [token, teamSlug, dateRange, fetchTeamMetrics]);

  // Fetch trend data
  useEffect(() => {
    const fetchTrendData = async () => {
      if (!token || !teamSlug) return;
      
      setTrendLoading(true);
      
      try {
        const apiClient = new CopilotApiClient({
          token: token.value,
          secondsPerSuggestion: env.secondsPerSuggestion,
        });
        
        const trend = await apiClient.getMetricsTimeSeries(
          token.organizationName,
          'completions',
          teamSlug,
          10, // 10 periods
          7  // 7 days per period
        );
        
        setCompletionsTrend(trend);
      } catch (err) {
        console.error('Error fetching trend data:', err);
      } finally {
        setTrendLoading(false);
      }
    };
    
    fetchTrendData();
  }, [token, teamSlug]);

  // Handle date range change
  const handleDateRangeChange = (range: { startDate: string; endDate: string }) => {
    setDateRange(range);
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
  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          <h2 className="text-lg font-semibold">Error</h2>
          <p>{error}</p>
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
        <DateRangePicker onChange={handleDateRangeChange} />
      </div>
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Team Acceptance Rate"
          value={currentTeamMetrics.totalAcceptancePercentage}
          change={currentTeamMetrics.totalAcceptancePercentage - currentTeamMetrics.avgAcceptancePercentage}
          format="percentage"
        />
        <MetricCard
          title="Team Completions"
          value={currentTeamMetrics.totalCompletionsCount}
          format="number"
        />
        <MetricCard
          title="Team Active Users"
          value={currentTeamMetrics.totalActiveUsers}
          format="users"
        />
        <MetricCard
          title="Avg Per User"
          value={currentTeamMetrics.avgCompletionsPerUser}
          format="number"
        />
      </div>
      
      {/* Trend Chart */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Team Weekly Activity</h2>
        {trendLoading ? (
          <div className="h-64 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : completionsTrend ? (
          <LineChart
            data={completionsTrend.points}
            height={300}
            xAxisLabel="Date"
            yAxisLabel="Completions"
            formatY={(value) => value.toLocaleString()}
          />
        ) : (
          <div className="h-64 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500">No trend data available</p>
          </div>
        )}
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
                {currentTeamMetrics.repositoryMetrics
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
            {Object.entries(currentTeamMetrics.fileExtensionMetrics)
              .sort(([, a], [, b]) => b.completionsCount - a.completionsCount)
              .slice(0, 5)
              .map(([extension, metrics]) => {
                const percentage = 
                  (metrics.completionsCount / currentTeamMetrics.totalCompletionsCount) * 100;
                
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
