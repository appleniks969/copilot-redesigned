import { FileExtensionMetrics } from './file-extension-metrics';
import { RepositoryMetrics } from './repository-metrics';

/**
 * Time range for metrics
 */
export interface TimeRange {
  startDate: string;
  endDate: string;
}

/**
 * Main Copilot metrics entity
 */
export interface CopilotMetrics {
  totalCompletionsCount: number;
  totalSuggestionCount: number;
  totalAcceptanceCount: number;
  totalAcceptancePercentage: number;
  totalActiveUsers: number;
  avgCompletionsPerUser: number;
  avgSuggestionsPerUser: number;
  avgAcceptancePercentage: number;
  repositoryMetrics: RepositoryMetrics[];
  dateRange: TimeRange;
  fileExtensionMetrics: Record<string, FileExtensionMetrics>;
  
  // Derived metrics (not directly from API)
  estimatedTimeSaved?: number;
}
