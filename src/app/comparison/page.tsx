'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/ui/components/layout/DashboardLayout';
import { DateRangePicker } from '@/ui/components/metrics/DateRangePicker';
import { useAuth } from '@/ui/context/AuthContext';
import { useMetrics } from '@/ui/context/MetricsContext';
import { CopilotApiClient } from '@/infrastructure/api/github/copilot-api-client';
import { ComparisonResult } from '@/domain/models/metrics/comparison-result';
import { MetricsService } from '@/application/metrics/metrics-service';
import { format } from 'date-fns';
import { env } from '@/infrastructure/config/env';

// Available metrics to compare
const comparisonMetrics = [
  { id: 'completions', name: 'Completions', description: 'Total number of Copilot suggestions shown' },
  { id: 'acceptanceRate', name: 'Acceptance Rate', description: 'Percentage of suggestions accepted' },
  { id: 'activeUsers', name: 'Active Users', description: 'Number of users actively using Copilot' },
  { id: 'avgCompletions', name: 'Avg Completions per User', description: 'Average completions per active user' },
];

export default function ComparisonPage() {
  const { token } = useAuth();
  const { loading: teamsLoading } = useMetrics();
  
  const [selectedMetric, setSelectedMetric] = useState('completions');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - env.defaultMetricsPeriodDays * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  
  const [comparisonData, setComparisonData] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle team selection
  const toggleTeamSelection = (teamSlug: string) => {
    if (selectedTeams.includes(teamSlug)) {
      setSelectedTeams(selectedTeams.filter((slug) => slug !== teamSlug));
    } else {
      setSelectedTeams([...selectedTeams, teamSlug]);
    }
  };

  // Fetch comparison data
  useEffect(() => {
    const fetchComparisonData = async () => {
      if (!token || selectedTeams.length === 0) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const apiClient = new CopilotApiClient({
          token: token.value,
          secondsPerSuggestion: env.secondsPerSuggestion,
        });
        
        const metricsService = new MetricsService(apiClient);
        
        const result = await metricsService.getTeamComparisonData(
          token.organizationName,
          selectedTeams,
          selectedMetric,
          dateRange.startDate,
          dateRange.endDate
        );
        
        setComparisonData(result);
      } catch (err) {
        console.error('Error fetching comparison data:', err);
        setError('Failed to fetch comparison data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchComparisonData();
  }, [token, selectedTeams, selectedMetric, dateRange]);

  // Handle date range change
  const handleDateRangeChange = (range: { startDate: string; endDate: string }) => {
    setDateRange(range);
  };

  // Format value based on metric
  const formatValue = (value: number) => {
    if (selectedMetric === 'acceptanceRate') {
      return `${value.toFixed(2)}%`;
    }
    return value.toLocaleString();
  };

  // Get highest value team for highlighting
  const getHighestValueTeam = () => {
    if (!comparisonData || !comparisonData.values) return null;
    
    const entries = Object.entries(comparisonData.values);
    if (entries.length === 0) return null;
    
    return entries.reduce((highest, [team, value]) => {
      if (value > highest.value) {
        return { team, value };
      }
      return highest;
    }, { team: entries[0][0], value: entries[0][1] });
  };

  const highestValueTeam = getHighestValueTeam();

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Comparison</h1>
        <DateRangePicker onChange={handleDateRangeChange} />
      </div>
      
      {/* Control Panel */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Teams to Compare
            </label>
            <div className="flex flex-wrap gap-2">
              {env.defaultTeamSlugs.map((teamSlug) => (
                <button
                  key={teamSlug}
                  onClick={() => toggleTeamSelection(teamSlug)}
                  className={`px-4 py-2 rounded-full text-sm ${
                    selectedTeams.includes(teamSlug)
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {teamSlug}
                </button>
              ))}
            </div>
          </div>
          
          {/* Metric Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Metric to Compare
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {comparisonMetrics.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {comparisonMetrics.find((m) => m.id === selectedMetric)?.description}
            </p>
          </div>
        </div>
      </div>
      
      {/* Comparison Results */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Comparison Results
          </h2>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="p-4">
            <div className="bg-red-50 p-4 rounded-md text-red-700">
              <p>{error}</p>
            </div>
          </div>
        )}
        
        {/* Empty Selection State */}
        {!loading && !error && selectedTeams.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">
              Please select at least one team to compare
            </p>
          </div>
        )}
        
        {/* Results Content */}
        {!loading && !error && selectedTeams.length > 0 && comparisonData && (
          <div className="p-4">
            {/* Bar Chart */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-3">
                {comparisonMetrics.find((m) => m.id === selectedMetric)?.name} by Team
              </h3>
              
              <div className="space-y-4">
                {selectedTeams.map((teamSlug) => {
                  const value = comparisonData.values[teamSlug] || 0;
                  const maxValue = Math.max(...Object.values(comparisonData.values));
                  const percentage = maxValue === 0 ? 0 : (value / maxValue) * 100;
                  
                  const isHighest = highestValueTeam?.team === teamSlug;
                  
                  return (
                    <div key={teamSlug}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {teamSlug}
                        </span>
                        <span className={`text-sm ${isHighest ? 'font-bold text-blue-700' : 'text-gray-500'}`}>
                          {formatValue(value)}
                          {isHighest && ' (Highest)'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`${isHighest ? 'bg-blue-600' : 'bg-blue-400'} h-2.5 rounded-full`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Comparison Table */}
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-3">
                Detailed Comparison
              </h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {comparisonMetrics.find((m) => m.id === selectedMetric)?.name}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        % of Highest
                      </th>
                    </tr>
                  </thead>
                  
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedTeams.map((teamSlug) => {
                      const value = comparisonData.values[teamSlug] || 0;
                      const maxValue = Math.max(...Object.values(comparisonData.values));
                      const percentage = maxValue === 0 ? 0 : (value / maxValue) * 100;
                      
                      const isHighest = highestValueTeam?.team === teamSlug;
                      
                      return (
                        <tr key={teamSlug}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {teamSlug}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${isHighest ? 'font-bold text-blue-700' : 'text-gray-800'}`}>
                            {formatValue(value)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {percentage.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Analysis Panel */}
      {!loading && !error && comparisonData && selectedTeams.length > 1 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Comparison Analysis
          </h2>
          
          <div className="text-gray-700 space-y-3">
            {highestValueTeam && (
              <p>
                <span className="font-semibold">{highestValueTeam.team}</span> has the highest 
                {' '}{comparisonMetrics.find((m) => m.id === selectedMetric)?.name.toLowerCase()}{' '}
                among the compared teams at {formatValue(highestValueTeam.value)}.
              </p>
            )}
            
            {selectedMetric === 'acceptanceRate' && (
              <p>
                Higher acceptance rates may indicate better quality suggestions tailored to the team's codebase
                and programming patterns.
              </p>
            )}
            
            {selectedMetric === 'completions' && (
              <p>
                Teams with higher completion counts are engaging more actively with Copilot, 
                potentially leveraging it to accelerate their development work.
              </p>
            )}
            
            {selectedMetric === 'activeUsers' && (
              <p>
                Teams with more active users show broader adoption of Copilot across team members.
                Consider sharing best practices from these teams with lower-adoption teams.
              </p>
            )}
            
            {selectedMetric === 'avgCompletions' && (
              <p>
                Higher average completions per user suggest individual developers are relying more
                heavily on Copilot in their workflow.
              </p>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
