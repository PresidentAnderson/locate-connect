/**
 * Transform Executor
 * Safely executes transform expressions on data
 * Supports JSONPath-like syntax and safe subset of JavaScript operations
 */

import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Types
// =============================================================================

interface TransformConfig {
  name: string;
  transform_type: 'request' | 'response' | 'both';
  transform_expression: string;
}

interface TransformContext {
  $: unknown; // Root data reference
  data: unknown; // Alias for root
  request?: unknown; // Request context for request transforms
  response?: unknown; // Response context for response transforms
}

// =============================================================================
// Transform Cache
// =============================================================================

// In-memory cache for transform configurations
const transformCache = new Map<string, TransformConfig>();
const CACHE_TTL = 60000; // 1 minute
const cacheTimestamps = new Map<string, number>();

async function getTransformConfig(
  name: string,
  supabase?: Awaited<ReturnType<typeof createClient>>
): Promise<TransformConfig | null> {
  // Check cache
  const cached = transformCache.get(name);
  const timestamp = cacheTimestamps.get(name);

  if (cached && timestamp && Date.now() - timestamp < CACHE_TTL) {
    return cached;
  }

  // Fetch from database
  const client = supabase || (await createClient());

  const { data, error } = await client
    .from('route_transformers')
    .select('name, transform_type, transform_expression')
    .eq('name', name)
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    console.warn(`[TransformExecutor] Transform not found: ${name}`);
    return null;
  }

  // Update cache
  transformCache.set(name, data as TransformConfig);
  cacheTimestamps.set(name, Date.now());

  return data as TransformConfig;
}

// =============================================================================
// Expression Parser
// =============================================================================

/**
 * Parse and execute a transform expression safely
 * Supports:
 * - JSONPath: $.field.subfield, $.array[0]
 * - Array methods: .map(r => expr), .filter(r => expr)
 * - Object literals: { "key": value }
 * - Basic property access
 */
function executeExpression(expression: string, context: TransformContext): unknown {
  // Handle identity transform
  if (expression === '$.' || expression === '$') {
    return context.$;
  }

  // Try to parse as JSON object template first
  if (expression.trim().startsWith('{') && expression.trim().endsWith('}')) {
    return executeObjectTemplate(expression, context);
  }

  // Execute as path expression
  return executePath(expression, context);
}

/**
 * Execute a path expression like $.results.map(r => r.name)
 */
function executePath(expression: string, context: TransformContext): unknown {
  // Parse the expression into segments
  const segments = parsePathSegments(expression);
  let current: unknown = context;

  for (const segment of segments) {
    if (current === undefined || current === null) {
      return undefined;
    }

    if (segment.type === 'property' && segment.name) {
      if (segment.name === '$') {
        current = context.$;
      } else if (segment.name === 'data') {
        current = context.data;
      } else {
        current = (current as Record<string, unknown>)[segment.name];
      }
    } else if (segment.type === 'index' && segment.index !== undefined) {
      if (Array.isArray(current)) {
        current = current[segment.index];
      } else {
        return undefined;
      }
    } else if (segment.type === 'method' && segment.method) {
      current = executeMethod(current, segment.method, segment.args || '', context);
    }
  }

  return current;
}

interface PathSegment {
  type: 'property' | 'index' | 'method';
  name?: string;
  index?: number;
  method?: string;
  args?: string;
}

/**
 * Parse path into segments
 */
function parsePathSegments(path: string): PathSegment[] {
  const segments: PathSegment[] = [];
  let remaining = path.trim();

  // Remove leading $. if present
  if (remaining.startsWith('$.')) {
    segments.push({ type: 'property', name: '$' });
    remaining = remaining.slice(2);
  } else if (remaining.startsWith('$')) {
    segments.push({ type: 'property', name: '$' });
    remaining = remaining.slice(1);
    if (remaining.startsWith('.')) {
      remaining = remaining.slice(1);
    }
  }

  while (remaining.length > 0) {
    // Check for method call
    const methodMatch = remaining.match(/^(\w+)\((.*)\)/);
    if (methodMatch) {
      segments.push({
        type: 'method',
        method: methodMatch[1],
        args: methodMatch[2],
      });
      remaining = remaining.slice(methodMatch[0].length);
      if (remaining.startsWith('.')) {
        remaining = remaining.slice(1);
      }
      continue;
    }

    // Check for property with method
    const propMethodMatch = remaining.match(/^(\w+)\.(\w+)\((.*)\)/);
    if (propMethodMatch) {
      segments.push({ type: 'property', name: propMethodMatch[1] });
      segments.push({
        type: 'method',
        method: propMethodMatch[2],
        args: propMethodMatch[3],
      });
      remaining = remaining.slice(propMethodMatch[0].length);
      if (remaining.startsWith('.')) {
        remaining = remaining.slice(1);
      }
      continue;
    }

    // Check for array index
    const indexMatch = remaining.match(/^\[(\d+)\]/);
    if (indexMatch) {
      segments.push({ type: 'index', index: parseInt(indexMatch[1], 10) });
      remaining = remaining.slice(indexMatch[0].length);
      if (remaining.startsWith('.')) {
        remaining = remaining.slice(1);
      }
      continue;
    }

    // Check for property with index
    const propIndexMatch = remaining.match(/^(\w+)\[(\d+)\]/);
    if (propIndexMatch) {
      segments.push({ type: 'property', name: propIndexMatch[1] });
      segments.push({ type: 'index', index: parseInt(propIndexMatch[2], 10) });
      remaining = remaining.slice(propIndexMatch[0].length);
      if (remaining.startsWith('.')) {
        remaining = remaining.slice(1);
      }
      continue;
    }

    // Simple property
    const propMatch = remaining.match(/^(\w+)/);
    if (propMatch) {
      segments.push({ type: 'property', name: propMatch[1] });
      remaining = remaining.slice(propMatch[0].length);
      if (remaining.startsWith('.')) {
        remaining = remaining.slice(1);
      }
      continue;
    }

    // Unknown segment, break
    break;
  }

  return segments;
}

/**
 * Execute array methods safely
 */
function executeMethod(
  value: unknown,
  method: string,
  args: string,
  context: TransformContext
): unknown {
  if (!Array.isArray(value)) {
    console.warn(`[TransformExecutor] Cannot call ${method}() on non-array`);
    return value;
  }

  switch (method) {
    case 'map':
      return executeMapMethod(value, args, context);

    case 'filter':
      return executeFilterMethod(value, args, context);

    case 'find':
      return executeFindMethod(value, args, context);

    case 'slice':
      return executeSliceMethod(value, args);

    case 'length':
      return value.length;

    case 'first':
      return value[0];

    case 'last':
      return value[value.length - 1];

    case 'flat':
      return value.flat();

    case 'reverse':
      return [...value].reverse();

    case 'sort':
      return executeSortMethod(value, args);

    default:
      console.warn(`[TransformExecutor] Unknown method: ${method}`);
      return value;
  }
}

/**
 * Execute map method: .map(r => { ... })
 */
function executeMapMethod(
  array: unknown[],
  args: string,
  context: TransformContext
): unknown[] {
  // Parse arrow function: r => expr or (r) => expr
  const arrowMatch = args.match(/^\s*\(?\s*(\w+)\s*\)?\s*=>\s*([\s\S]+)$/);

  if (!arrowMatch) {
    console.warn('[TransformExecutor] Invalid map expression:', args);
    return array;
  }

  const [, varName, body] = arrowMatch;

  return array.map((item) => {
    const itemContext: TransformContext = {
      ...context,
      $: item,
      data: item,
      [varName]: item,
    };

    // If body is an object literal
    if (body.trim().startsWith('({') || body.trim().startsWith('{')) {
      const objectBody = body.trim().startsWith('({')
        ? body.trim().slice(1, -1)
        : body;
      return executeObjectTemplate(objectBody, itemContext);
    }

    // Execute as path
    return executePath(body, itemContext);
  });
}

/**
 * Execute filter method: .filter(r => condition)
 */
function executeFilterMethod(
  array: unknown[],
  args: string,
  context: TransformContext
): unknown[] {
  const arrowMatch = args.match(/^\s*\(?\s*(\w+)\s*\)?\s*=>\s*([\s\S]+)$/);

  if (!arrowMatch) {
    console.warn('[TransformExecutor] Invalid filter expression:', args);
    return array;
  }

  const [, varName, body] = arrowMatch;

  return array.filter((item) => {
    const itemContext: TransformContext = {
      ...context,
      $: item,
      data: item,
      [varName]: item,
    };

    const result = evaluateCondition(body, itemContext);
    return result;
  });
}

/**
 * Execute find method
 */
function executeFindMethod(
  array: unknown[],
  args: string,
  context: TransformContext
): unknown | undefined {
  const arrowMatch = args.match(/^\s*\(?\s*(\w+)\s*\)?\s*=>\s*([\s\S]+)$/);

  if (!arrowMatch) {
    return undefined;
  }

  const [, varName, body] = arrowMatch;

  return array.find((item) => {
    const itemContext: TransformContext = {
      ...context,
      $: item,
      data: item,
      [varName]: item,
    };

    return evaluateCondition(body, itemContext);
  });
}

/**
 * Execute slice method
 */
function executeSliceMethod(array: unknown[], args: string): unknown[] {
  const parts = args.split(',').map((s) => parseInt(s.trim(), 10));

  if (parts.length === 1) {
    return array.slice(parts[0]);
  } else if (parts.length === 2) {
    return array.slice(parts[0], parts[1]);
  }

  return array;
}

/**
 * Execute sort method
 */
function executeSortMethod(array: unknown[], args: string): unknown[] {
  const sortedArray = [...array];

  if (!args.trim()) {
    return sortedArray.sort();
  }

  // Sort by field: sort('field') or sort('field', 'desc')
  const sortMatch = args.match(/['"](\w+)['"](?:\s*,\s*['"]?(asc|desc)['"]?)?/i);

  if (sortMatch) {
    const [, field, direction] = sortMatch;
    const isDesc = direction?.toLowerCase() === 'desc';

    return sortedArray.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[field];
      const bVal = (b as Record<string, unknown>)[field];

      // Convert to strings for comparison
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');

      // Try numeric comparison if both are numbers
      const aNum = Number(aVal);
      const bNum = Number(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        if (aNum < bNum) return isDesc ? 1 : -1;
        if (aNum > bNum) return isDesc ? -1 : 1;
        return 0;
      }

      // String comparison
      if (aStr < bStr) return isDesc ? 1 : -1;
      if (aStr > bStr) return isDesc ? -1 : 1;
      return 0;
    });
  }

  return sortedArray;
}

/**
 * Evaluate a simple condition
 */
function evaluateCondition(condition: string, context: TransformContext): boolean {
  // Handle comparison operators
  const compMatch = condition.match(/^(.+?)\s*(===?|!==?|>=?|<=?)\s*(.+)$/);

  if (compMatch) {
    const [, left, op, right] = compMatch;
    const leftVal = resolveValue(left.trim(), context);
    const rightVal = resolveValue(right.trim(), context);

    switch (op) {
      case '==':
      case '===':
        return leftVal === rightVal;
      case '!=':
      case '!==':
        return leftVal !== rightVal;
      case '>':
        return Number(leftVal) > Number(rightVal);
      case '>=':
        return Number(leftVal) >= Number(rightVal);
      case '<':
        return Number(leftVal) < Number(rightVal);
      case '<=':
        return Number(leftVal) <= Number(rightVal);
    }
  }

  // Simple truthy check
  const value = resolveValue(condition, context);
  return Boolean(value);
}

/**
 * Resolve a value from context
 */
function resolveValue(expr: string, context: TransformContext): unknown {
  expr = expr.trim();

  // String literal
  if ((expr.startsWith("'") && expr.endsWith("'")) || (expr.startsWith('"') && expr.endsWith('"'))) {
    return expr.slice(1, -1);
  }

  // Number literal
  if (/^-?\d+(\.\d+)?$/.test(expr)) {
    return Number(expr);
  }

  // Boolean literal
  if (expr === 'true') return true;
  if (expr === 'false') return false;
  if (expr === 'null') return null;
  if (expr === 'undefined') return undefined;

  // Path expression
  return executePath(expr, context);
}

/**
 * Execute an object template like { "key": $.value }
 */
function executeObjectTemplate(
  template: string,
  context: TransformContext
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Remove outer braces and whitespace
  let content = template.trim();
  if (content.startsWith('{')) content = content.slice(1);
  if (content.endsWith('}')) content = content.slice(0, -1);

  // Parse key-value pairs
  // This is a simplified parser that handles common cases
  const pairs = parseObjectPairs(content);

  for (const [key, valueExpr] of pairs) {
    result[key] = resolveValue(valueExpr, context);
  }

  return result;
}

/**
 * Parse object key-value pairs
 */
function parseObjectPairs(content: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  let remaining = content.trim();

  while (remaining.length > 0) {
    // Match key: "key" or 'key' or key
    const keyMatch = remaining.match(/^\s*["']?(\w+)["']?\s*:\s*/);
    if (!keyMatch) break;

    const key = keyMatch[1];
    remaining = remaining.slice(keyMatch[0].length);

    // Find the value (handle nested objects, strings, paths)
    let value = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    let i = 0;

    while (i < remaining.length) {
      const char = remaining[i];

      if (!inString) {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
        } else if (char === '{' || char === '[' || char === '(') {
          depth++;
        } else if (char === '}' || char === ']' || char === ')') {
          depth--;
          if (depth < 0) break;
        } else if (char === ',' && depth === 0) {
          break;
        }
      } else if (char === stringChar && remaining[i - 1] !== '\\') {
        inString = false;
      }

      value += char;
      i++;
    }

    pairs.push([key, value.trim()]);
    remaining = remaining.slice(i);

    // Skip comma
    if (remaining.startsWith(',')) {
      remaining = remaining.slice(1).trim();
    }
  }

  return pairs;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Execute a named transform on data
 */
export async function executeTransform(
  transformName: string,
  data: unknown,
  type: 'request' | 'response',
  supabase?: Awaited<ReturnType<typeof createClient>>
): Promise<unknown> {
  // Handle identity transform
  if (transformName === 'identity' || !transformName) {
    return data;
  }

  // Get transform configuration
  const config = await getTransformConfig(transformName, supabase);

  if (!config) {
    console.warn(`[TransformExecutor] Transform not found, returning data as-is: ${transformName}`);
    return data;
  }

  // Check if transform applies to this type
  if (config.transform_type !== 'both' && config.transform_type !== type) {
    return data;
  }

  // Create context
  const context: TransformContext = {
    $: data,
    data: data,
    [type]: data,
  };

  try {
    const result = executeExpression(config.transform_expression, context);
    return result ?? data;
  } catch (error) {
    console.error(`[TransformExecutor] Transform execution failed:`, error);
    return data;
  }
}

/**
 * Execute an inline transform expression
 */
export function executeInlineTransform(expression: string, data: unknown): unknown {
  const context: TransformContext = {
    $: data,
    data: data,
  };

  try {
    return executeExpression(expression, context);
  } catch (error) {
    console.error(`[TransformExecutor] Inline transform failed:`, error);
    return data;
  }
}

/**
 * Clear the transform cache (useful for testing or after updates)
 */
export function clearTransformCache(): void {
  transformCache.clear();
  cacheTimestamps.clear();
}
