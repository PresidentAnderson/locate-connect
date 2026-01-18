/**
 * Data Transformer
 * Transforms data between systems using configurable rules
 */

import type { TransformationRule, DataMapping, RouteCondition } from '@/types';

export interface TransformContext {
  source: Record<string, unknown>;
  target: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

/**
 * Data Transformer Service
 */
export class DataTransformer {
  /**
   * Transform data using a set of rules
   */
  transform(
    data: Record<string, unknown>,
    rules: TransformationRule[],
    context?: Partial<TransformContext>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const ctx: TransformContext = {
      source: data,
      target: result,
      metadata: context?.metadata || {},
    };

    for (const rule of rules) {
      try {
        const value = this.applyRule(rule, ctx);
        if (value !== undefined) {
          this.setNestedValue(result, rule.targetField, value);
        }
      } catch (error) {
        console.warn(
          `[DataTransformer] Rule ${rule.id} failed:`,
          error instanceof Error ? error.message : error
        );
        // Use default value if available
        if (rule.config?.defaultValue !== undefined) {
          this.setNestedValue(result, rule.targetField, rule.config.defaultValue);
        }
      }
    }

    return result;
  }

  /**
   * Transform using simple data mappings
   */
  transformSimple(
    data: Record<string, unknown>,
    mappings: DataMapping[]
  ): Record<string, unknown> {
    const rules: TransformationRule[] = mappings.map((m, index) => ({
      id: `mapping_${index}`,
      name: `${m.sourceField} -> ${m.targetField}`,
      sourceField: m.sourceField,
      targetField: m.targetField,
      transformType: m.transform ? this.mapLegacyTransform(m.transform) : 'direct',
      config: m.customTransform
        ? { expression: m.customTransform }
        : undefined,
    }));

    return this.transform(data, rules);
  }

  /**
   * Apply a single transformation rule
   */
  private applyRule(rule: TransformationRule, ctx: TransformContext): unknown {
    const sourceValue = this.getNestedValue(ctx.source, rule.sourceField);

    switch (rule.transformType) {
      case 'direct':
        return sourceValue;

      case 'format':
        return this.applyFormat(sourceValue, rule.config?.format);

      case 'lookup':
        return this.applyLookup(sourceValue, rule.config?.lookupTable);

      case 'calculate':
        return this.applyCalculation(sourceValue, rule.config?.expression, ctx);

      case 'conditional':
        return this.applyConditional(sourceValue, rule.config?.condition, ctx);

      case 'custom':
        return this.applyCustom(sourceValue, rule.config?.expression, ctx);

      default:
        return sourceValue;
    }
  }

  /**
   * Apply format transformation
   */
  private applyFormat(value: unknown, format?: string): unknown {
    if (!format || value === undefined || value === null) {
      return value;
    }

    const strValue = String(value);

    switch (format) {
      case 'uppercase':
        return strValue.toUpperCase();

      case 'lowercase':
        return strValue.toLowerCase();

      case 'trim':
        return strValue.trim();

      case 'date':
        return new Date(strValue).toISOString();

      case 'date_short':
        return new Date(strValue).toISOString().split('T')[0];

      case 'number':
        return Number(value);

      case 'boolean':
        return Boolean(value);

      case 'json':
        return JSON.stringify(value);

      default:
        // Custom format string
        return format.replace('{value}', strValue);
    }
  }

  /**
   * Apply lookup transformation
   */
  private applyLookup(
    value: unknown,
    lookupTable?: Record<string, unknown>
  ): unknown {
    if (!lookupTable) {
      return value;
    }

    const key = String(value);
    return lookupTable[key] ?? value;
  }

  /**
   * Apply calculation transformation
   */
  private applyCalculation(
    value: unknown,
    expression?: string,
    ctx?: TransformContext
  ): unknown {
    if (!expression) {
      return value;
    }

    // Simple expression evaluation
    // In production, use a proper expression parser
    try {
      // Replace placeholders
      let evalExpr = expression
        .replace(/\{value\}/g, String(value))
        .replace(/\{(\w+)\}/g, (_, field) => {
          const val = this.getNestedValue(ctx?.source || {}, field);
          return String(val ?? '');
        });

      // Basic math operations only
      if (/^[\d\s+\-*/().]+$/.test(evalExpr)) {
        return Function(`"use strict"; return (${evalExpr})`)();
      }

      return value;
    } catch {
      return value;
    }
  }

  /**
   * Apply conditional transformation
   */
  private applyConditional(
    value: unknown,
    condition?: RouteCondition,
    ctx?: TransformContext
  ): unknown {
    if (!condition) {
      return value;
    }

    const conditionValue = this.getNestedValue(
      ctx?.source || {},
      condition.field
    );
    const conditionMet = this.evaluateCondition(
      conditionValue,
      condition.operator,
      condition.value
    );

    return conditionMet ? value : undefined;
  }

  /**
   * Apply custom transformation
   */
  private applyCustom(
    value: unknown,
    expression?: string,
    ctx?: TransformContext
  ): unknown {
    if (!expression) {
      return value;
    }

    // Custom transformations would be implemented here
    // In production, this could execute registered custom functions
    console.warn('[DataTransformer] Custom transformations not implemented');
    return value;
  }

  /**
   * Evaluate a condition
   */
  evaluateCondition(
    value: unknown,
    operator: RouteCondition['operator'],
    expected: unknown
  ): boolean {
    switch (operator) {
      case 'eq':
        return value === expected;

      case 'ne':
        return value !== expected;

      case 'gt':
        return Number(value) > Number(expected);

      case 'lt':
        return Number(value) < Number(expected);

      case 'contains':
        return String(value).includes(String(expected));

      case 'exists':
        return value !== undefined && value !== null;

      default:
        return false;
    }
  }

  /**
   * Get nested value from object
   */
  getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array access like "items[0]"
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        current = (current as Record<string, unknown>)[key];
        if (Array.isArray(current)) {
          current = current[parseInt(index, 10)];
        } else {
          return undefined;
        }
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }

    return current;
  }

  /**
   * Set nested value in object
   */
  setNestedValue(
    obj: Record<string, unknown>,
    path: string,
    value: unknown
  ): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      // Check if next part is array index
      const nextIsArray = /^\d+$/.test(parts[i + 1]);

      if (current[part] === undefined) {
        current[part] = nextIsArray ? [] : {};
      }

      current = current[part] as Record<string, unknown>;
    }

    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
  }

  /**
   * Map legacy transform type
   */
  private mapLegacyTransform(
    transform: DataMapping['transform']
  ): TransformationRule['transformType'] {
    switch (transform) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'date':
        return 'format';
      case 'array':
        return 'direct';
      case 'custom':
        return 'custom';
      default:
        return 'direct';
    }
  }
}

// Singleton instance
let transformerInstance: DataTransformer | null = null;

export function getDataTransformer(): DataTransformer {
  if (!transformerInstance) {
    transformerInstance = new DataTransformer();
  }
  return transformerInstance;
}
