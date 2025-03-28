'use client';

import React, { useState } from 'react';
import { format, subDays } from 'date-fns';
import { env } from '@/infrastructure/config/env';

interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

interface DateRangePickerProps {
  onChange: (range: { startDate: string; endDate: string }) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRange, setActiveRange] = useState('last7Days');

  // Predefined date ranges
  const dateRanges: Record<string, DateRange> = {
    last7Days: {
      startDate: subDays(new Date(), 7),
      endDate: new Date(),
      label: 'Last 7 days',
    },
    last14Days: {
      startDate: subDays(new Date(), 14),
      endDate: new Date(),
      label: 'Last 14 days',
    },
    last28Days: {
      startDate: subDays(new Date(), env.maxHistoricalDays),
      endDate: new Date(),
      label: `Last ${env.maxHistoricalDays} days`,
    },
  };

  // Handle range selection
  const handleRangeSelect = (rangeKey: string) => {
    setActiveRange(rangeKey);
    setIsOpen(false);
    
    const range = dateRanges[rangeKey];
    
    onChange({
      startDate: format(range.startDate, 'yyyy-MM-dd'),
      endDate: format(range.endDate, 'yyyy-MM-dd'),
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100"
      >
        <span>{dateRanges[activeRange]?.label || 'Select date range'}</span>
        <svg
          className="w-4 h-4 ml-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isOpen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 py-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
          {Object.entries(dateRanges).map(([key, range]) => (
            <button
              key={key}
              onClick={() => handleRangeSelect(key)}
              className={`block w-full text-left px-4 py-2 text-sm ${
                activeRange === key
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
