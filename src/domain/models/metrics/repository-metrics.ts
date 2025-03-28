import { FileExtensionMetrics } from './file-extension-metrics';

/**
 * Repository metrics representing Copilot usage per repository
 */
export interface RepositoryMetrics {
  repositoryName: string;
  repositoryId: number;
  completionsCount: number;
  suggestionCount: number;
  acceptanceCount: number;
  acceptancePercentage: number;
  activeUsers: number;
  files: Record<string, FileExtensionMetrics>;
}
