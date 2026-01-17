/**
 * Data Ingestion Engine
 * Core architecture for processing incoming data from multiple sources
 */

import { EventEmitter } from "events";

// Data source types
export type DataSourceType =
  | "api"
  | "webhook"
  | "file_upload"
  | "manual_entry"
  | "agent"
  | "integration";

// Ingestion job status
export type IngestionStatus =
  | "pending"
  | "validating"
  | "processing"
  | "completed"
  | "failed"
  | "partial";

// Base data record interface
export interface IngestionRecord {
  id: string;
  sourceType: DataSourceType;
  sourceId: string;
  rawData: unknown;
  normalizedData?: Record<string, unknown>;
  validationErrors: ValidationError[];
  status: IngestionStatus;
  createdAt: string;
  processedAt?: string;
  metadata: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface IngestionJob {
  id: string;
  name: string;
  sourceType: DataSourceType;
  sourceId: string;
  status: IngestionStatus;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: ValidationError[];
  startedAt: string;
  completedAt?: string;
  createdBy: string;
  metadata: Record<string, unknown>;
}

export interface DataSource {
  id: string;
  type: DataSourceType;
  name: string;
  config: Record<string, unknown>;
  schema: DataSchema;
  enabled: boolean;
}

export interface DataSchema {
  fields: SchemaField[];
  requiredFields: string[];
  transformations: Transformation[];
}

export interface SchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "array" | "object";
  nullable: boolean;
  mapping?: string; // Maps to internal field name
  validation?: FieldValidation;
}

export interface FieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  allowedValues?: unknown[];
}

export interface Transformation {
  field: string;
  type: "normalize" | "format" | "split" | "merge" | "lookup" | "custom";
  config: Record<string, unknown>;
}

// Pipeline step interface
export interface PipelineStep<T = unknown, R = unknown> {
  name: string;
  execute(data: T): Promise<R>;
  rollback?(data: T): Promise<void>;
}

// Main ingestion engine class
export class DataIngestionEngine extends EventEmitter {
  private sources: Map<string, DataSource> = new Map();
  private pipelines: Map<string, PipelineStep[]> = new Map();
  private activeJobs: Map<string, IngestionJob> = new Map();

  constructor() {
    super();
  }

  /**
   * Register a data source
   */
  registerSource(source: DataSource): void {
    this.sources.set(source.id, source);
    console.log(`[IngestionEngine] Registered source: ${source.name}`);
    this.emit("source:registered", source);
  }

  /**
   * Register a processing pipeline
   */
  registerPipeline(sourceType: DataSourceType, steps: PipelineStep[]): void {
    this.pipelines.set(sourceType, steps);
    console.log(
      `[IngestionEngine] Registered pipeline for ${sourceType} with ${steps.length} steps`
    );
  }

  /**
   * Start an ingestion job
   */
  async startIngestion(
    sourceId: string,
    data: unknown[],
    createdBy: string
  ): Promise<IngestionJob> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Unknown source: ${sourceId}`);
    }

    if (!source.enabled) {
      throw new Error(`Source ${sourceId} is disabled`);
    }

    const job: IngestionJob = {
      id: crypto.randomUUID(),
      name: `${source.name} Import`,
      sourceType: source.type,
      sourceId: source.id,
      status: "pending",
      totalRecords: data.length,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      errors: [],
      startedAt: new Date().toISOString(),
      createdBy,
      metadata: {},
    };

    this.activeJobs.set(job.id, job);
    this.emit("job:started", job);

    // Process asynchronously
    this.processJob(job, source, data).catch((error) => {
      console.error(`[IngestionEngine] Job ${job.id} failed:`, error);
      job.status = "failed";
      job.errors.push({
        field: "_system",
        message: error.message,
        severity: "error",
      });
      this.emit("job:failed", job, error);
    });

    return job;
  }

  /**
   * Process ingestion job
   */
  private async processJob(
    job: IngestionJob,
    source: DataSource,
    data: unknown[]
  ): Promise<void> {
    job.status = "validating";
    this.emit("job:progress", job);

    const pipeline = this.pipelines.get(source.type) || [];
    const records: IngestionRecord[] = [];

    // Validate and transform each record
    for (const rawRecord of data) {
      const record: IngestionRecord = {
        id: crypto.randomUUID(),
        sourceType: source.type,
        sourceId: source.id,
        rawData: rawRecord,
        validationErrors: [],
        status: "pending",
        createdAt: new Date().toISOString(),
        metadata: {},
      };

      try {
        // Validate against schema
        const validationErrors = this.validateRecord(rawRecord, source.schema);
        record.validationErrors = validationErrors;

        if (validationErrors.some((e) => e.severity === "error")) {
          record.status = "failed";
          job.failedRecords++;
        } else {
          // Transform data
          record.normalizedData = this.transformRecord(
            rawRecord,
            source.schema
          );
          record.status = "validating";
        }
      } catch (error) {
        record.status = "failed";
        record.validationErrors.push({
          field: "_system",
          message: error instanceof Error ? error.message : String(error),
          severity: "error",
        });
        job.failedRecords++;
      }

      records.push(record);
      job.processedRecords++;
      this.emit("job:progress", job);
    }

    // Process through pipeline
    job.status = "processing";
    this.emit("job:progress", job);

    for (const record of records) {
      if (record.status === "failed") continue;

      try {
        let processedData = record.normalizedData;

        for (const step of pipeline) {
          processedData = (await step.execute(processedData)) as Record<
            string,
            unknown
          >;
        }

        record.normalizedData = processedData;
        record.status = "completed";
        record.processedAt = new Date().toISOString();
        job.successfulRecords++;

        this.emit("record:processed", record);
      } catch (error) {
        record.status = "failed";
        record.validationErrors.push({
          field: "_pipeline",
          message: error instanceof Error ? error.message : String(error),
          severity: "error",
        });
        job.failedRecords++;

        // Attempt rollback
        for (const step of pipeline) {
          if (step.rollback) {
            try {
              await step.rollback(record.normalizedData);
            } catch (rollbackError) {
              console.error(
                `[IngestionEngine] Rollback failed for step ${step.name}:`,
                rollbackError
              );
            }
          }
        }
      }
    }

    // Finalize job
    job.completedAt = new Date().toISOString();
    job.status =
      job.failedRecords === 0
        ? "completed"
        : job.successfulRecords === 0
          ? "failed"
          : "partial";

    // Collect all errors from records
    for (const record of records) {
      job.errors.push(...record.validationErrors);
    }

    this.activeJobs.delete(job.id);
    this.emit("job:completed", job);
  }

  /**
   * Validate a record against schema
   */
  private validateRecord(
    data: unknown,
    schema: DataSchema
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const record = data as Record<string, unknown>;

    // Check required fields
    for (const field of schema.requiredFields) {
      if (record[field] === undefined || record[field] === null) {
        errors.push({
          field,
          message: `Required field '${field}' is missing`,
          severity: "error",
        });
      }
    }

    // Validate field types and constraints
    for (const fieldDef of schema.fields) {
      const value = record[fieldDef.name];

      if (value === undefined || value === null) {
        if (!fieldDef.nullable && schema.requiredFields.includes(fieldDef.name)) {
          // Already caught above
          continue;
        }
        continue;
      }

      // Type validation
      const actualType = Array.isArray(value) ? "array" : typeof value;
      if (actualType !== fieldDef.type && fieldDef.type !== "date") {
        errors.push({
          field: fieldDef.name,
          message: `Expected ${fieldDef.type}, got ${actualType}`,
          severity: "error",
        });
        continue;
      }

      // Field-specific validation
      if (fieldDef.validation) {
        const validationErrors = this.validateField(
          fieldDef.name,
          value,
          fieldDef.validation
        );
        errors.push(...validationErrors);
      }
    }

    return errors;
  }

  /**
   * Validate a single field value
   */
  private validateField(
    fieldName: string,
    value: unknown,
    validation: FieldValidation
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof value === "string") {
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          errors.push({
            field: fieldName,
            message: `Value does not match pattern: ${validation.pattern}`,
            severity: "error",
          });
        }
      }

      if (validation.minLength && value.length < validation.minLength) {
        errors.push({
          field: fieldName,
          message: `Minimum length is ${validation.minLength}`,
          severity: "error",
        });
      }

      if (validation.maxLength && value.length > validation.maxLength) {
        errors.push({
          field: fieldName,
          message: `Maximum length is ${validation.maxLength}`,
          severity: "error",
        });
      }
    }

    if (typeof value === "number") {
      if (validation.minValue !== undefined && value < validation.minValue) {
        errors.push({
          field: fieldName,
          message: `Minimum value is ${validation.minValue}`,
          severity: "error",
        });
      }

      if (validation.maxValue !== undefined && value > validation.maxValue) {
        errors.push({
          field: fieldName,
          message: `Maximum value is ${validation.maxValue}`,
          severity: "error",
        });
      }
    }

    if (validation.allowedValues) {
      if (!validation.allowedValues.includes(value)) {
        errors.push({
          field: fieldName,
          message: `Value must be one of: ${validation.allowedValues.join(", ")}`,
          severity: "error",
        });
      }
    }

    return errors;
  }

  /**
   * Transform record according to schema
   */
  private transformRecord(
    data: unknown,
    schema: DataSchema
  ): Record<string, unknown> {
    const record = data as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    // Map fields
    for (const fieldDef of schema.fields) {
      const sourceValue = record[fieldDef.name];
      const targetField = fieldDef.mapping || fieldDef.name;

      if (sourceValue !== undefined) {
        result[targetField] = sourceValue;
      }
    }

    // Apply transformations
    for (const transform of schema.transformations) {
      result[transform.field] = this.applyTransformation(
        result[transform.field],
        transform
      );
    }

    return result;
  }

  /**
   * Apply a transformation to a field value
   */
  private applyTransformation(
    value: unknown,
    transform: Transformation
  ): unknown {
    switch (transform.type) {
      case "normalize":
        // Normalize string values
        if (typeof value === "string") {
          return value.trim().toLowerCase();
        }
        return value;

      case "format":
        // Format dates, phones, etc.
        if (transform.config.format === "phone" && typeof value === "string") {
          return value.replace(/\D/g, "");
        }
        return value;

      case "split":
        // Split string into array
        if (typeof value === "string") {
          const delimiter = (transform.config.delimiter as string) || ",";
          return value.split(delimiter).map((s) => s.trim());
        }
        return value;

      case "merge":
        // Merge multiple fields (handled separately)
        return value;

      case "lookup":
        // Lookup value from mapping
        const mapping = transform.config.mapping as Record<string, unknown>;
        if (mapping && value !== undefined) {
          return mapping[String(value)] ?? value;
        }
        return value;

      case "custom":
        // Custom transformation (would use eval or function reference)
        return value;

      default:
        return value;
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): IngestionJob | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): IngestionJob[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Get registered sources
   */
  getSources(): DataSource[] {
    return Array.from(this.sources.values());
  }
}

// Singleton instance
export const ingestionEngine = new DataIngestionEngine();

// Export factory function
export function createDataIngestionEngine(): DataIngestionEngine {
  return new DataIngestionEngine();
}
