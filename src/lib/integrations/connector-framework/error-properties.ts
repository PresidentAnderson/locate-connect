/** Read extension properties without assuming every thrown value is an Error. */
export function errorProperty(error: unknown, key: string): unknown {
  if ((typeof error !== 'object' || error === null) && typeof error !== 'function') return undefined;
  return Reflect.get(error, key);
}

export function errorStatusCode(error: unknown): number | undefined {
  const statusCode = errorProperty(error, 'statusCode');
  return typeof statusCode === 'number' ? statusCode : undefined;
}
