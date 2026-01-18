/**
 * Data Ingestion Module Index
 * Export all ingestion services and utilities
 */

// Data ingestion engine
export {
  DataIngestionEngine,
  ingestionEngine,
  createDataIngestionEngine,
  type DataSourceType,
  type IngestionStatus,
  type IngestionRecord,
  type ValidationError,
  type IngestionJob,
  type DataSource,
  type DataSchema,
  type SchemaField,
  type FieldValidation,
  type Transformation,
  type PipelineStep,
} from "./data-ingestion-engine";

// Lead ingestion pipeline
export {
  registerLeadSources,
  ingestLead,
  ingestLeads,
  type LeadSourceType,
  type LeadPriority,
  type IncomingLead,
  type NormalizedLead,
} from "./lead-ingestion-pipeline";
import { registerLeadSources } from "./lead-ingestion-pipeline";

// Bulk import
export {
  BulkImportService,
  bulkImportService,
  previewBulkImport,
  startBulkImport,
  getBulkImportStatus,
  cancelBulkImport,
  type ImportFormat,
  type BulkImportConfig,
  type FieldMapping,
  type ImportOptions,
  type ImportResult,
  type ImportError,
  type ImportWarning,
  type ImportPreview,
} from "./bulk-import";

// Initialize ingestion system
export function initializeIngestion(): void {
  registerLeadSources();
  console.log("[Ingestion] Initialized data ingestion system");
}
