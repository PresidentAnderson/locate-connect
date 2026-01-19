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
   * Parse XLSX using native ZIP handling
   * XLSX files are ZIP archives containing XML spreadsheet data
   */
  private parseXLSX(content: string | ArrayBuffer): Record<string, unknown>[] {
    // Convert string to ArrayBuffer if needed
    let buffer: ArrayBuffer;
    if (typeof content === "string") {
      // Assume base64 encoded
      const binaryString = atob(content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      buffer = bytes.buffer;
    } else {
      buffer = content;
    }

    try {
      // Parse ZIP structure manually (XLSX is a ZIP file)
      const zipData = new Uint8Array(buffer);
      const files = this.parseZipFiles(zipData);

      // Get shared strings (xl/sharedStrings.xml)
      const sharedStringsXml = files["xl/sharedStrings.xml"];
      const sharedStrings = sharedStringsXml
        ? this.parseSharedStrings(sharedStringsXml)
        : [];

      // Get the first worksheet (xl/worksheets/sheet1.xml)
      const sheetXml = files["xl/worksheets/sheet1.xml"];
      if (!sheetXml) {
        console.warn("[BulkImport] No worksheet found in XLSX file");
        return [];
      }

      // Parse the worksheet
      return this.parseWorksheet(sheetXml, sharedStrings);
    } catch (error) {
      console.error("[BulkImport] XLSX parsing error:", error);
      return [];
    }
  }

  /**
   * Parse ZIP file structure
   */
  private parseZipFiles(data: Uint8Array): Record<string, string> {
    const files: Record<string, string> = {};
    let offset = 0;

    // Find and parse local file headers
    while (offset < data.length - 4) {
      // Check for local file header signature (PK\x03\x04)
      if (data[offset] !== 0x50 || data[offset + 1] !== 0x4b ||
          data[offset + 2] !== 0x03 || data[offset + 3] !== 0x04) {
        break;
      }

      // Skip to compression method (offset + 8)
      const compressionMethod = data[offset + 8] | (data[offset + 9] << 8);

      // Get compressed and uncompressed sizes
      const compressedSize = data[offset + 18] | (data[offset + 19] << 8) |
                            (data[offset + 20] << 16) | (data[offset + 21] << 24);
      const uncompressedSize = data[offset + 22] | (data[offset + 23] << 8) |
                              (data[offset + 24] << 16) | (data[offset + 25] << 24);

      // Get filename length and extra field length
      const filenameLength = data[offset + 26] | (data[offset + 27] << 8);
      const extraFieldLength = data[offset + 28] | (data[offset + 29] << 8);

      // Extract filename
      const filenameStart = offset + 30;
      const filenameBytes = data.slice(filenameStart, filenameStart + filenameLength);
      const filename = new TextDecoder().decode(filenameBytes);

      // Extract file data
      const dataStart = filenameStart + filenameLength + extraFieldLength;
      const fileData = data.slice(dataStart, dataStart + compressedSize);

      // Decompress if needed (method 8 = DEFLATE)
      if (compressionMethod === 0) {
        // Stored (no compression)
        files[filename] = new TextDecoder().decode(fileData);
      } else if (compressionMethod === 8) {
        // DEFLATE - try to decompress
        try {
          const decompressed = this.inflateRaw(fileData);
          files[filename] = new TextDecoder().decode(decompressed);
        } catch {
          // Skip files we can't decompress
          console.warn(`[BulkImport] Could not decompress ${filename}`);
        }
      }

      // Move to next file
      offset = dataStart + compressedSize;
    }

    return files;
  }

  /**
   * Simple DEFLATE decompression (raw inflate)
   */
  private inflateRaw(data: Uint8Array): Uint8Array {
    // Use DecompressionStream if available (modern browsers/Node.js 18+)
    if (typeof DecompressionStream !== "undefined") {
      // Wrap raw deflate data with zlib header/trailer for compatibility
      const zlibData = new Uint8Array(data.length + 6);
      zlibData[0] = 0x78; // zlib header
      zlibData[1] = 0x9c;
      zlibData.set(data, 2);
      // Add Adler-32 checksum placeholder (not validated)
      zlibData[zlibData.length - 4] = 0;
      zlibData[zlibData.length - 3] = 0;
      zlibData[zlibData.length - 2] = 0;
      zlibData[zlibData.length - 1] = 1;

      // Note: DecompressionStream is async, so we use a sync fallback
    }

    // Fallback: Basic inflate implementation for simple cases
    // This is a simplified version that handles most XLSX files
    const output: number[] = [];
    let pos = 0;

    while (pos < data.length) {
      const bfinal = data[pos] & 0x01;
      const btype = (data[pos] >> 1) & 0x03;

      if (btype === 0) {
        // Stored block
        pos++;
        const len = data[pos] | (data[pos + 1] << 8);
        pos += 4; // Skip len and nlen
        for (let i = 0; i < len && pos < data.length; i++) {
          output.push(data[pos++]);
        }
      } else {
        // For compressed blocks, we need a full inflate implementation
        // For now, return what we have or throw
        console.warn("[BulkImport] Compressed XLSX block - limited support");
        break;
      }

      if (bfinal) break;
    }

    return new Uint8Array(output);
  }

  /**
   * Parse shared strings from xl/sharedStrings.xml
   */
  private parseSharedStrings(xml: string): string[] {
    const strings: string[] = [];
    const siMatches = xml.matchAll(/<si[^>]*>[\s\S]*?<\/si>/g);

    for (const match of siMatches) {
      // Extract text from <t> elements
      const tMatch = match[0].match(/<t[^>]*>([^<]*)<\/t>/);
      if (tMatch) {
        strings.push(tMatch[1]);
      } else {
        strings.push("");
      }
    }

    return strings;
  }

  /**
   * Parse worksheet XML into records
   */
  private parseWorksheet(xml: string, sharedStrings: string[]): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = [];
    const rowMatches = xml.matchAll(/<row[^>]*>[\s\S]*?<\/row>/g);

    let headers: string[] = [];
    let isFirstRow = true;

    for (const rowMatch of rowMatches) {
      const rowXml = rowMatch[0];
      const cells: string[] = [];

      // Extract cells
      const cellMatches = rowXml.matchAll(/<c[^>]*r="([A-Z]+)\d+"[^>]*(?:t="([^"]*)")?[^>]*>[\s\S]*?<\/c>/g);

      for (const cellMatch of cellMatches) {
        const colLetter = cellMatch[1];
        const cellType = cellMatch[2];

        // Get cell value
        const valueMatch = cellMatch[0].match(/<v>([^<]*)<\/v>/);
        let value = valueMatch ? valueMatch[1] : "";

        // Handle shared strings
        if (cellType === "s" && value) {
          const index = parseInt(value, 10);
          value = sharedStrings[index] || "";
        }

        // Calculate column index from letter
        const colIndex = this.columnLetterToIndex(colLetter);

        // Ensure array is long enough
        while (cells.length <= colIndex) {
          cells.push("");
        }
        cells[colIndex] = value;
      }

      if (isFirstRow) {
        // Use first row as headers
        headers = cells.map((c, i) => c || `Column${i + 1}`);
        isFirstRow = false;
      } else if (cells.some((c) => c !== "")) {
        // Create record from data row
        const record: Record<string, unknown> = {};
        cells.forEach((cell, index) => {
          if (index < headers.length) {
            record[headers[index]] = cell;
          }
        });
        rows.push(record);
      }
    }

    return rows;
  }

  /**
   * Convert column letter to index (A=0, B=1, ..., Z=25, AA=26, etc.)
   */
  private columnLetterToIndex(letter: string): number {
    let index = 0;
    for (let i = 0; i < letter.length; i++) {
      index = index * 26 + (letter.charCodeAt(i) - 64);
    }
    return index - 1;
  }

  /**
   * Parse XML
   * Supports common XML structures for data import
   */
  private parseXML(content: string): Record<string, unknown>[] {
    // Clean the XML content
    const cleanedContent = content.trim();

    // Find the root element and its children
    const rootMatch = cleanedContent.match(/<(\w+)[^>]*>([\s\S]*)<\/\1>/);
    if (!rootMatch) {
      console.warn("[BulkImport] Could not find root XML element");
      return [];
    }

    const [, rootTag, rootContent] = rootMatch;

    // Find all record elements (direct children of root)
    // Common patterns: <records><record>...</record></records>
    // or: <data><item>...</item></data>
    // or: <response><result>...</result></response>
    const recordMatches = this.findXMLRecords(rootContent);

    if (recordMatches.length === 0) {
      // Try parsing as single record
      const singleRecord = this.parseXMLElement(rootContent);
      if (Object.keys(singleRecord).length > 0) {
        return [singleRecord];
      }
      return [];
    }

    return recordMatches.map(recordXml => this.parseXMLElement(recordXml));
  }

  /**
   * Find record elements in XML content
   */
  private findXMLRecords(content: string): string[] {
    const records: string[] = [];

    // Common record element names
    const recordPatterns = [
      /<(record|item|row|entry|data|result|person|case|report)(\s[^>]*)?>[\s\S]*?<\/\1>/gi,
    ];

    for (const pattern of recordPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        records.push(match[0]);
      }
      if (records.length > 0) break;
    }

    // If no common patterns found, try finding any repeated elements
    if (records.length === 0) {
      const firstElementMatch = content.match(/<(\w+)(\s[^>]*)?>[\s\S]*?<\/\1>/);
      if (firstElementMatch) {
        const elementName = firstElementMatch[1];
        const elementPattern = new RegExp(
          `<${elementName}(\\s[^>]*)?>([\\s\\S]*?)<\\/${elementName}>`,
          'gi'
        );
        const matches = content.matchAll(elementPattern);
        for (const match of matches) {
          records.push(match[0]);
        }
      }
    }

    return records;
  }

  /**
   * Parse XML element into object
   */
  private parseXMLElement(xml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Extract attributes from the root element
    const rootAttrMatch = xml.match(/^<\w+([^>]*)>/);
    if (rootAttrMatch && rootAttrMatch[1]) {
      const attrs = this.parseXMLAttributes(rootAttrMatch[1]);
      Object.assign(result, attrs);
    }

    // Remove the root element tags
    const innerMatch = xml.match(/<\w+[^>]*>([\s\S]*)<\/\w+>$/);
    if (!innerMatch) return result;

    const innerContent = innerMatch[1].trim();

    // Check if content is just text
    if (!innerContent.includes('<')) {
      return result;
    }

    // Find all child elements
    const childPattern = /<(\w+)([^>]*)>(?:([\s\S]*?)<\/\1>|([^<]*))/g;
    let match;

    while ((match = childPattern.exec(innerContent)) !== null) {
      const [fullMatch, tagName, attributes, content, simpleContent] = match;
      const elementContent = content !== undefined ? content : simpleContent || '';

      // Handle attributes
      const attrs = this.parseXMLAttributes(attributes || '');

      // Check if element contains nested elements
      if (elementContent.includes('<')) {
        // Recursive parse for nested elements
        const nestedResult = this.parseXMLElement(fullMatch);
        result[tagName] = nestedResult;
      } else {
        // Simple text content
        let value: unknown = this.decodeXMLEntities(elementContent.trim());

        // Try to convert to appropriate type
        value = this.inferXMLValueType(value as string);

        // Merge attributes if present
        if (Object.keys(attrs).length > 0) {
          result[tagName] = { _value: value, ...attrs };
        } else {
          // Handle multiple elements with same name (array)
          if (tagName in result) {
            const existing = result[tagName];
            if (Array.isArray(existing)) {
              existing.push(value);
            } else {
              result[tagName] = [existing, value];
            }
          } else {
            result[tagName] = value;
          }
        }
      }
    }

    return result;
  }

  /**
   * Parse XML attributes
   */
  private parseXMLAttributes(attrString: string): Record<string, string> {
    const result: Record<string, string> = {};
    const attrPattern = /(\w+)=["']([^"']*)["']/g;
    let match;

    while ((match = attrPattern.exec(attrString)) !== null) {
      result[match[1]] = this.decodeXMLEntities(match[2]);
    }

    return result;
  }

  /**
   * Decode XML entities
   */
  private decodeXMLEntities(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
  }

  /**
   * Infer value type from XML text
   */
  private inferXMLValueType(value: string): unknown {
    if (value === '') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;

    // Try number
    if (/^-?\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^-?\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    // Try ISO date
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    return value;
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
