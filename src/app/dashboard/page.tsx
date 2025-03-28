'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/ui/components/layout/DashboardLayout';
import { MetricCard } from '@/ui/components/metrics/cards/MetricCard';
import { LineChart } from '@/ui/components/metrics/charts/LineChart';
import { DateRangePicker } from '@/ui/components/metrics/DateRangePicker';
import { useMetrics } from '@/ui/context/MetricsContext';
import { useAuth } from '@/ui/context/AuthContext';
import { Trend } from '@/domain/models/metrics/trend';
import { format, subDays } from 'date-fns';
import { env } from '@/infrastructure/config/env';

export default function DashboardPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const { 
    filteredOrganizationMetrics: organizationMetrics, 
    loading, 
    error, 
    filterByDateRange,
    refreshData 
  } = useMetrics();
  
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'), // Default to last 7 days
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  
  const [completionsTrend, setCompletionsTrend] = useState<Trend | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Set initial date range filter
  useEffect(() => {
    if (isAuthenticated) {
      filterByDateRange(dateRange.startDate, dateRange.endDate);
    }
  }, [isAuthenticated]);

  // Handle date range change - filter existing data
  const handleDateRangeChange = (range: { startDate: string; endDate: string }) => {
    setDateRange(range);
    filterByDateRange(range.startDate, range.endDate);
  };

  // Handle refresh button click
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
      // Re-apply current date filter
      filterByDateRange(dateRange.startDate, dateRange.endDate);
    } catch (err) {
      console.error('Error refreshing data:', err);
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
  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          <h2 className="text-lg font-semibold">Error</h2>
          <p>{error}</p>
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

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organization Overview</h1>
        <div className="flex items-center gap-3">
          <DateRangePicker onChange={handleDateRangeChange} />
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
        <p className="text-blue-800 mb-2">
          <span className="font-medium">API Limitation:</span> GitHub Copilot Metrics API has a limitation of {env.maxHistoricalDays} days of historical data. 
          Data is loaded once and filtered client-side based on your selected date range.
        </p>
        <p className="text-blue-800">
          <span className="font-medium">Data Approximation:</span> When filtering by date range, metrics are approximated by scaling the {env.maxHistoricalDays}-day totals 
          based on the number of days in your selection. This assumes uniform usage across the period.
        </p>
      </div>
      
      {/* Metrics Cards */}
      {organizationMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Acceptance Rate"
            value={organizationMetrics?.totalAcceptancePercentage || 0}
            change={organizationMetrics?.totalAcceptancePercentage - (organizationMetrics?.avgAcceptancePercentage || 0)}
            format="percentage"
            tooltip="Difference from average acceptance rate"
          />
          <MetricCard
            title="Total Completions"
            value={organizationMetrics?.totalCompletionsCount || 0}
            // Calculate completions per day compared to global average
            change={null} // Removed hardcoded example
            format="number"
          />
          <MetricCard
            title="Active Users"
            value={organizationMetrics?.totalActiveUsers || 0}
            // No meaningful change calculation available
            change={null}
            format="users"
          />
          <MetricCard
            title="Time Saved (est.)"
            value={organizationMetrics?.estimatedTimeSaved || 0}
            // No meaningful change calculation available
            change={null}
            format="time"
            tooltip="Estimated based on acceptance count and configured time per suggestion"
          />
        </div>
      )}
      
      {/* Repository & Language Breakdowns */}
      {organizationMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Repository Metrics */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Top Repositories</h2>
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
                {organizationMetrics.repositoryMetrics && 
                organizationMetrics.repositoryMetrics
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
              {organizationMetrics.fileExtensionMetrics && 
                Object.entries(organizationMetrics.fileExtensionMetrics)
                  .sort(([, a], [, b]) => b.completionsCount - a.completionsCount)
                  .slice(0, 5)
                  .map(([extension, metrics]) => {
                  const percentage = organizationMetrics.totalCompletionsCount ? 
                    (metrics.completionsCount / organizationMetrics.totalCompletionsCount) * 100 : 0;
                  
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
      )}
    </DashboardLayout>
  );
}
