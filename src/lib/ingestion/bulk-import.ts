/**
 * Bulk Data Import System
 * Handles large-scale data imports from various file formats
 */

import { ingestionEngine, type DataSource, type DataSchema, type IngestionJob } from "./data-ingestion-engine";

// Supported file formats
export type ImportFormat = "csv" | "json" | "xlsx" | "xml";

// Import configuration
export interface BulkImportConfig {
  format: ImportFormat;
  sourceId: string;
  mapping?: FieldMapping[];
  options: ImportOptions;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: "uppercase" | "lowercase" | "trim" | "date" | "number" | "boolean";
  defaultValue?: unknown;
}

export interface ImportOptions {
  // CSV options
  delimiter?: string;
  hasHeader?: boolean;
  encoding?: string;

  // General options
  skipEmptyRows?: boolean;
  maxRows?: number;
  startRow?: number;
  validateOnly?: boolean;
  batchSize?: number;

  // Error handling
  stopOnError?: boolean;
  maxErrors?: number;
}

export interface ImportResult {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  startedAt: string;
  completedAt?: string;
  duration?: number;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  value?: unknown;
}

export interface ImportWarning {
  row: number;
  field?: string;
  message: string;
}

// Import preview
export interface ImportPreview {
  totalRows: number;
  sampleRows: Record<string, unknown>[];
  detectedFields: string[];
  suggestedMappings: FieldMapping[];
  validationErrors: ImportError[];
}

/**
 * Bulk Import Service
 */
export class BulkImportService {
  private activeImports: Map<string, ImportResult> = new Map();

  /**
   * Preview import file
   */
  async previewImport(
    fileContent: string | ArrayBuffer,
    format: ImportFormat,
    options: Partial<ImportOptions> = {}
  ): Promise<ImportPreview> {
    const rows = await this.parseFile(fileContent, format, {
      ...options,
      maxRows: 10, // Only parse first 10 rows for preview
    });

    const detectedFields = this.detectFields(rows);
    const suggestedMappings = this.suggestMappings(detectedFields);
    const validationErrors = this.validatePreview(rows);

    return {
      totalRows: rows.length,
      sampleRows: rows.slice(0, 5),
      detectedFields,
      suggestedMappings,
      validationErrors,
    };
  }

  /**
   * Start bulk import
   */
  async startImport(
    fileContent: string | ArrayBuffer,
    config: BulkImportConfig,
    userId: string
  ): Promise<ImportResult> {
    const jobId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    const result: ImportResult = {
      jobId,
      status: "pending",
      totalRows: 0,
      processedRows: 0,
      successfulRows: 0,
      failedRows: 0,
      errors: [],
      warnings: [],
      startedAt,
    };

    this.activeImports.set(jobId, result);

    // Process asynchronously
    this.processImport(fileContent, config, userId, result).catch((error) => {
      result.status = "failed";
      result.errors.push({
        row: -1,
        message: error.message,
      });
      result.completedAt = new Date().toISOString();
    });

    return result;
  }

  /**
   * Get import status
   */
  getImportStatus(jobId: string): ImportResult | undefined {
    return this.activeImports.get(jobId);
  }

  /**
   * Cancel import
   */
  async cancelImport(jobId: string): Promise<boolean> {
    const result = this.activeImports.get(jobId);
    if (!result || result.status !== "processing") {
      return false;
    }

    // Mark as cancelled
    result.status = "failed";
    result.completedAt = new Date().toISOString();
    result.errors.push({
      row: -1,
      message: "Import cancelled by user",
    });

    return true;
  }

  /**
   * Process import
   */
  private async processImport(
    fileContent: string | ArrayBuffer,
    config: BulkImportConfig,
    userId: string,
    result: ImportResult
  ): Promise<void> {
    result.status = "processing";

    // Parse file
    const rows = await this.parseFile(fileContent, config.format, config.options);
    result.totalRows = rows.length;

    if (rows.length === 0) {
      result.status = "completed";
      result.completedAt = new Date().toISOString();
      return;
    }

    // Apply field mappings
    const mappedRows = rows.map((row, index) => {
      try {
        return this.applyMapping(row, config.mapping || []);
      } catch (error) {
        result.errors.push({
          row: index + 1,
          message: error instanceof Error ? error.message : "Mapping error",
        });
        return null;
      }
    });

    // Filter out failed mappings
    const validRows = mappedRows.filter((row) => row !== null) as Record<
      string,
      unknown
    >[];

    // Validate only mode
    if (config.options.validateOnly) {
      result.status = "completed";
      result.processedRows = rows.length;
      result.successfulRows = validRows.length;
      result.failedRows = rows.length - validRows.length;
      result.completedAt = new Date().toISOString();
      return;
    }

    // Process in batches
    const batchSize = config.options.batchSize || 100;
    const batches = this.chunk(validRows, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        // Submit to ingestion engine
        const job = await ingestionEngine.startIngestion(
          config.sourceId,
          batch,
          userId
        );

        // Wait for batch to complete
        await this.waitForJob(job.id);

        result.processedRows += batch.length;
        result.successfulRows += batch.length; // Simplified - would check actual results

        // Check for max errors
        if (
          config.options.maxErrors &&
          result.failedRows >= config.options.maxErrors
        ) {
          result.status = "failed";
          result.errors.push({
            row: -1,
            message: `Max errors (${config.options.maxErrors}) exceeded`,
          });
          break;
        }
      } catch (error) {
        result.failedRows += batch.length;

        if (config.options.stopOnError) {
          result.status = "failed";
          result.errors.push({
            row: result.processedRows + 1,
            message: error instanceof Error ? error.message : "Batch error",
          });
          break;
        }
      }

      // Progress delay
      await this.sleep(100);
    }

    result.status = result.failedRows === 0 ? "completed" : result.successfulRows === 0 ? "failed" : "completed";
    result.completedAt = new Date().toISOString();
    result.duration = new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime();
  }

  /**
   * Parse file content based on format
   */
  private async parseFile(
    content: string | ArrayBuffer,
    format: ImportFormat,
    options: Partial<ImportOptions>
  ): Promise<Record<string, unknown>[]> {
    const textContent =
      content instanceof ArrayBuffer
        ? new TextDecoder(options.encoding || "utf-8").decode(content)
        : content;

    switch (format) {
      case "csv":
        return this.parseCSV(textContent, options);
      case "json":
        return this.parseJSON(textContent);
      case "xlsx":
        return this.parseXLSX(content);
      case "xml":
        return this.parseXML(textContent);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Parse CSV
   */
  private parseCSV(
    content: string,
    options: Partial<ImportOptions>
  ): Record<string, unknown>[] {
    const delimiter = options.delimiter || ",";
    const lines = content.split("\n").filter((line) => line.trim());

    if (lines.length === 0) return [];

    const hasHeader = options.hasHeader !== false;
    const startRow = options.startRow || 0;
    const maxRows = options.maxRows;

    // Parse header
    let headers: string[];
    let dataStartIndex: number;

    if (hasHeader) {
      headers = this.parseCSVLine(lines[0], delimiter);
      dataStartIndex = 1 + startRow;
    } else {
      // Generate column names
      const firstLine = this.parseCSVLine(lines[0], delimiter);
      headers = firstLine.map((_, i) => `column_${i + 1}`);
      dataStartIndex = startRow;
    }

    // Parse data rows
    const rows: Record<string, unknown>[] = [];
    const endRow = maxRows ? dataStartIndex + maxRows : lines.length;

    for (let i = dataStartIndex; i < Math.min(endRow, lines.length); i++) {
      const line = lines[i];
      if (options.skipEmptyRows && !line.trim()) continue;

      const values = this.parseCSVLine(line, delimiter);
      const row: Record<string, unknown> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });

      rows.push(row);
    }

    return rows;
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * Parse JSON
   */
  private parseJSON(content: string): Record<string, unknown>[] {
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    // Handle wrapped response
    if (parsed.data && Array.isArray(parsed.data)) {
      return parsed.data;
    }

    // Single object
    return [parsed];
  }

  /**
   * Parse XLSX (placeholder - would use library like xlsx)
   */
  private parseXLSX(content: string | ArrayBuffer): Record<string, unknown>[] {
    // In production, use xlsx library
    console.log("[BulkImport] XLSX parsing requires xlsx library");
    return [];
  }

  /**
   * Parse XML (placeholder)
   */
  private parseXML(content: string): Record<string, unknown>[] {
    // In production, use xml parser
    console.log("[BulkImport] XML parsing not implemented");
    return [];
  }

  /**
   * Detect fields from parsed data
   */
  private detectFields(rows: Record<string, unknown>[]): string[] {
    const fields = new Set<string>();

    for (const row of rows) {
      Object.keys(row).forEach((key) => fields.add(key));
    }

    return Array.from(fields);
  }

  /**
   * Suggest field mappings based on field names
   */
  private suggestMappings(fields: string[]): FieldMapping[] {
    const commonMappings: Record<string, string> = {
      // Name variations
      name: "name",
      full_name: "name",
      fullname: "name",
      first_name: "firstName",
      firstname: "firstName",
      fname: "firstName",
      last_name: "lastName",
      lastname: "lastName",
      lname: "lastName",

      // Contact variations
      email: "email",
      email_address: "email",
      emailaddress: "email",
      phone: "phone",
      phone_number: "phone",
      phonenumber: "phone",
      telephone: "phone",

      // Location variations
      address: "address",
      street: "street",
      city: "city",
      state: "state",
      zip: "zip",
      zipcode: "zip",
      zip_code: "zip",
      postal_code: "zip",
      country: "country",
      latitude: "latitude",
      lat: "latitude",
      longitude: "longitude",
      lng: "longitude",
      lon: "longitude",

      // Date variations
      date: "date",
      created_at: "createdAt",
      createdat: "createdAt",
      updated_at: "updatedAt",
      updatedat: "updatedAt",

      // ID variations
      id: "id",
      case_id: "caseId",
      caseid: "caseId",
      case_number: "caseNumber",
      casenumber: "caseNumber",
    };

    return fields.map((field) => {
      const normalizedField = field.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const targetField = commonMappings[normalizedField] || field;

      return {
        sourceField: field,
        targetField,
      };
    });
  }

  /**
   * Validate preview rows
   */
  private validatePreview(rows: Record<string, unknown>[]): ImportError[] {
    const errors: ImportError[] = [];

    rows.forEach((row, index) => {
      // Check for empty required fields
      if (!row.description && !row.name && !row.title) {
        errors.push({
          row: index + 1,
          message: "Row appears to be missing key identifying fields",
        });
      }
    });

    return errors;
  }

  /**
   * Apply field mapping to a row
   */
  private applyMapping(
    row: Record<string, unknown>,
    mappings: FieldMapping[]
  ): Record<string, unknown> {
    if (mappings.length === 0) {
      return row;
    }

    const result: Record<string, unknown> = {};

    for (const mapping of mappings) {
      let value = row[mapping.sourceField];

      // Apply default if value is missing
      if (value === undefined || value === null) {
        if (mapping.defaultValue !== undefined) {
          value = mapping.defaultValue;
        } else {
          continue;
        }
      }

      // Apply transform
      if (mapping.transform && value !== null) {
        value = this.applyTransform(value, mapping.transform);
      }

      result[mapping.targetField] = value;
    }

    return result;
  }

  /**
   * Apply transform to a value
   */
  private applyTransform(
    value: unknown,
    transform: FieldMapping["transform"]
  ): unknown {
    if (value === null || value === undefined) return value;

    switch (transform) {
      case "uppercase":
        return String(value).toUpperCase();
      case "lowercase":
        return String(value).toLowerCase();
      case "trim":
        return String(value).trim();
      case "date":
        return new Date(String(value)).toISOString();
      case "number":
        return Number(value);
      case "boolean":
        const str = String(value).toLowerCase();
        return str === "true" || str === "1" || str === "yes";
      default:
        return value;
    }
  }

  /**
   * Wait for ingestion job to complete
   */
  private async waitForJob(jobId: string, timeout = 60000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = ingestionEngine.getJobStatus(jobId);
      if (!job) return;

      if (job.status === "completed" || job.status === "failed" || job.status === "partial") {
        return;
      }

      await this.sleep(500);
    }

    throw new Error("Job timeout");
  }

  /**
   * Chunk array into batches
   */
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const bulkImportService = new BulkImportService();

// Export convenience functions
export async function previewBulkImport(
  fileContent: string | ArrayBuffer,
  format: ImportFormat,
  options?: Partial<ImportOptions>
): Promise<ImportPreview> {
  return bulkImportService.previewImport(fileContent, format, options);
}

export async function startBulkImport(
  fileContent: string | ArrayBuffer,
  config: BulkImportConfig,
  userId: string
): Promise<ImportResult> {
  return bulkImportService.startImport(fileContent, config, userId);
}

export function getBulkImportStatus(jobId: string): ImportResult | undefined {
  return bulkImportService.getImportStatus(jobId);
}

export async function cancelBulkImport(jobId: string): Promise<boolean> {
  return bulkImportService.cancelImport(jobId);
}
