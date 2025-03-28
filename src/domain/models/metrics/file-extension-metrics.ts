/**
 * File extension metrics representing Copilot usage per file type
 */
export interface FileExtensionMetrics {
  completionsCount: number;
  suggestionsCount: number;
  acceptanceCount: number;
  acceptancePercentage: number;
}
