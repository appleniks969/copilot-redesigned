'use client';

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendPoint } from '@/domain/models/metrics/trend-point';
import { format, parseISO } from 'date-fns';

interface LineChartProps {
  data: TrendPoint[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  showTooltip?: boolean;
  color?: string;
  formatY?: (value: number) => string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  xAxisLabel,
  yAxisLabel,
  height = 300,
  showTooltip = true,
  color = '#2563eb',
  formatY,
}) => {
  // Format the data for Recharts and filter out invalid points
  const chartData = data
    .filter(point => point && point.date && !isNaN(point.value))
    .map((point) => {
      try {
        return {
          date: point.date,
          value: point.value,
          // Format date for display
          formattedDate: format(parseISO(point.date), 'MMM dd'),
        };
      } catch (e) {
        console.error(`Error formatting date: ${point.date}`, e);
        return null;
      }
    })
    .filter(point => point !== null);

  // If no valid data, show a message
  if (!chartData || chartData.length === 0) {
    return (
      <div 
        className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center justify-center" 
        style={{ height }}
      >
        <p className="text-gray-500">No data available for chart</p>
      </div>
    );
  }

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium">{point.formattedDate}</p>
          <p className="text-blue-600">
            Value: {formatY ? formatY(point.value) : point.value}
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ opacity: 0.3 }}
            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10 } : undefined}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ opacity: 0.3 }}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
            tickFormatter={formatY}
          />
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            activeDot={{ r: 8 }}
            dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};
