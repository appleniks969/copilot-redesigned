'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/ui/components/layout/DashboardLayout';
import { LineChart } from '@/ui/components/metrics/charts/LineChart';
import { useAuth } from '@/ui/context/AuthContext';
import { CopilotApiClient } from '@/infrastructure/api/github/copilot-api-client';
import { Trend } from '@/domain/models/metrics/trend';
import { env } from '@/infrastructure/config/env';

// Available metrics to track
const availableMetrics = [
  { id: 'completions', name: 'Completions', color: '#2563eb' },
  { id: 'acceptanceRate', name: 'Acceptance Rate', color: '#10b981' },
  { id: 'activeUsers', name: 'Active Users', color: '#f59e0b' },
  { id: 'timeSaved', name: 'Time Saved', color: '#8b5cf6' },
];

// Available time periods
const timePeriods = [
  { id: 'weekly', name: 'Weekly', days: 7, periods: 12 },
  { id: 'monthly', name: 'Monthly', days: 30, periods: 6 },
  { id: 'quarterly', name: 'Quarterly', days: 90, periods: 4 },
];

export default function TrendsPage() {
  const { token } = useAuth();
  
  const [selectedMetric, setSelectedMetric] = useState('completions');
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [selectedScope, setSelectedScope] = useState('organization');
  const [selectedTeam, setSelectedTeam] = useState('');
  
  const [trendData, setTrendData] = useState<Trend | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current period config
  const currentPeriod = timePeriods.find(p => p.id === selectedPeriod) || timePeriods[0];
  
  // Get current metric config
  const currentMetric = availableMetrics.find(m => m.id === selectedMetric) || availableMetrics[0];

  const [errorOccurred, setErrorOccurred] = useState(false);

  const fetchTrendData = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    setErrorOccurred(false);
    
    try {
      const apiClient = new CopilotApiClient({
        token: token.value,
        secondsPerSuggestion: env.secondsPerSuggestion,
      });
      
      const teamSlug = selectedScope === 'team' ? selectedTeam : undefined;
      
      const trend = await apiClient.getMetricsTimeSeries(
        token.organizationName,
        selectedMetric,
        teamSlug,
        currentPeriod.periods,
        currentPeriod.days
      );
      
      setTrendData(trend);
    } catch (err) {
      console.error('Error fetching trend data:', err);
      setError('Failed to fetch trend data. Please try again.');
      setErrorOccurred(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch trend data
  useEffect(() => {
    if (token && !errorOccurred) {
      fetchTrendData();
    }
  }, [token, selectedMetric, selectedPeriod, selectedScope, selectedTeam, currentPeriod.periods, currentPeriod.days]);

  // Format y-axis values based on metric
  const formatY = (value: number) => {
    switch (selectedMetric) {
      case 'acceptanceRate':
        return `${value.toFixed(2)}%`;
      case 'timeSaved':
        return `${value.toFixed(1)}h`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Trend Analysis</h1>
        <p className="text-gray-500 mt-1">
          Analyze Copilot usage trends over time
        </p>
      </div>
      
      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Metric Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metric
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => {
                setSelectedMetric(e.target.value);
                setErrorOccurred(false); // Reset error state
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableMetrics.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Time Period Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Period
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setErrorOccurred(false); // Reset error state
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timePeriods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Scope Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scope
            </label>
            <select
              value={selectedScope}
              onChange={(e) => {
                setSelectedScope(e.target.value);
                setErrorOccurred(false); // Reset error state
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="organization">Organization</option>
              <option value="team">Team</option>
            </select>
          </div>
          
          {/* Team Selector (if scope is team) */}
          {selectedScope === 'team' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team
              </label>
              <select
                value={selectedTeam}
                onChange={(e) => {
                  setSelectedTeam(e.target.value);
                  setErrorOccurred(false); // Reset error state
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a team</option>
                {env.defaultTeamSlugs.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Trend Chart */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          {currentMetric.name} Trend ({currentPeriod.name})
        </h2>
        
        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md text-red-700">
            <p>{error}</p>
            <button
              onClick={fetchTrendData}
              className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        ) : trendData && trendData.points.length > 0 ? (
          <div className="h-80">
            <LineChart
              data={trendData.points}
              xAxisLabel="Date"
              yAxisLabel={currentMetric.name}
              formatY={formatY}
              color={currentMetric.color}
              height={320}
            />
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center">
            <p className="text-gray-500">No trend data available</p>
          </div>
        )}
      </div>
      
      {/* Insight Panel */}
      {trendData && trendData.points.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Insights</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Value */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Current Value</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatY(trendData.points[trendData.points.length - 1].value)}
              </p>
            </div>
            
            {/* Average */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Average</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatY(
                  trendData.points.reduce((sum, point) => sum + point.value, 0) / trendData.points.length
                )}
              </p>
            </div>
            
            {/* Change */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Change</h3>
              <p className={`text-2xl font-bold mt-1 ${
                trendData.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {trendData.changePercentage >= 0 ? '+' : ''}
                {trendData.changePercentage.toFixed(2)}%
              </p>
            </div>
          </div>
          
          {/* Trend Description */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Trend Analysis</h3>
            <p className="text-gray-700">
              {trendData.changePercentage > 5
                ? `There is a significant upward trend in ${currentMetric.name.toLowerCase()} over this period.`
                : trendData.changePercentage < -5
                ? `There is a significant downward trend in ${currentMetric.name.toLowerCase()} over this period.`
                : `${currentMetric.name} has remained relatively stable over this period.`
              }
              
              {selectedMetric === 'acceptanceRate' && trendData.changePercentage > 0 && 
                ` Higher acceptance rates indicate teams are finding Copilot suggestions more useful.`
              }
              
              {selectedMetric === 'completions' && trendData.changePercentage > 0 && 
                ` Increased completions suggest more active Copilot usage.`
              }
              
              {selectedMetric === 'timeSaved' && trendData.changePercentage > 0 && 
                ` The team is saving more time with Copilot, increasing productivity.`
              }
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
