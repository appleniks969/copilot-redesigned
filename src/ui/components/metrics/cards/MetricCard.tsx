'use client';

import React from 'react';
import { TrendPoint } from '@/domain/models/metrics/trend-point';

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  format?: 'number' | 'percentage' | 'time' | 'users';
  trend?: TrendPoint[];
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  format = 'number',
  trend,
}) => {
  // Format the value based on the specified format
  const formattedValue = (): string => {
    if (typeof value === 'string') {
      return value;
    }

    // Handle undefined, null, or NaN values
    if (value === undefined || value === null || isNaN(value)) {
      return 'N/A';
    }

    switch (format) {
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'time':
        // Format time in hours
        return `${value.toFixed(1)}h`;
      case 'users':
        // Format users as whole number
        return `${Math.round(value)}`;
      default:
        // Format numbers with commas for thousands
        return value.toLocaleString();
    }
  };

  // Determine change indicator color
  const changeColor = (): string => {
    if (!change || isNaN(change)) return 'text-gray-500';
    return change >= 0 ? 'text-green-500' : 'text-red-500';
  };

  // Render mini-sparkline if trend data is provided
  const renderSparkline = () => {
    if (!trend || trend.length < 2) {
      return null;
    }

    // Simplified mini sparkline
    const height = 20;
    const width = 50;
    const margin = 5;
    
    // Find min and max values
    const values = trend.map((point) => point.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;
    
    // Create points for the polyline
    const points = trend.map((point, index) => {
      const x = margin + (index * (width - 2 * margin)) / (trend.length - 1);
      const y = height - margin - ((point.value - minValue) / range) * (height - 2 * margin);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="ml-2">
        <polyline
          points={points}
          fill="none"
          stroke={change === undefined ? '#94a3b8' : (change >= 0 ? '#10b981' : '#ef4444')}
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="mt-2 flex items-center">
        <span className="text-3xl font-bold text-gray-900">{formattedValue()}</span>
        {renderSparkline()}
      </div>
      {change !== undefined && !isNaN(change) && (
        <div className={`mt-2 ${changeColor()} text-sm flex items-center`}>
          <span className="mr-1">
            {change >= 0 ? '▲' : '▼'}
          </span>
          <span>
            {Math.abs(change || 0).toFixed(1)}% {change >= 0 ? 'increase' : 'decrease'}
          </span>
        </div>
      )}
    </div>
  );
};
