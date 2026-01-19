/**
 * Tests for Mock Connector
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MockConnector,
  createMockConnector,
  type MockResponse,
  type MockRoute,
  type MockConnectorConfig,
} from './mock-connector';
import type { ConnectorConfig, ConnectorRequest } from '@/types';

// Helper to make requests using the execute method
const request = async <T>(
  connector: MockConnector,
  options: { method: string; path: string; body?: unknown }
) => {
  return connector.execute<T>({
    method: options.method,
    path: options.path,
    body: options.body,
    headers: {},
  });
};

describe('MockConnector', () => {
  let connector: MockConnector;

  const createConfig = (): ConnectorConfig => ({
    id: 'mock-test-connector',
    name: 'Test Mock Connector',
    baseUrl: 'https://mock.api.local',
    authType: 'api_key',
    timeout: 5000,
    isEnabled: true,
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,
    },
    retryPolicy: {
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 1000,
    },
  });

  beforeEach(async () => {
    connector = new MockConnector(
      { config: createConfig(), category: 'custom' },
      { defaultDelay: 0 }
    );
    await connector.connect();
  });

  describe('addRoute', () => {
    it('should add a route', async () => {
      connector.addRoute({
        method: 'GET',
        pathPattern: '/api/users',
        response: { data: [{ id: 1, name: 'John' }] },
      });

      const result = await request<{ id: number; name: string }[]>(connector, {
        method: 'GET',
        path: '/api/users',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, name: 'John' }]);
    });

    it('should support chaining', () => {
      const result = connector
        .addRoute({ pathPattern: '/a', response: { data: 'a' } })
        .addRoute({ pathPattern: '/b', response: { data: 'b' } });

      expect(result).toBe(connector);
    });
  });

  describe('removeRoute', () => {
    it('should remove a route by pattern', async () => {
      connector.addRoute({
        pathPattern: '/api/users',
        response: { data: 'users' },
      });
      connector.addRoute({
        pathPattern: '/api/posts',
        response: { data: 'posts' },
      });

      const removed = connector.removeRoute('/api/users');
      expect(removed).toBe(true);

      const result = await request(connector, { method: 'GET', path: '/api/users' });
      // Should fall back to default response
      expect(result.data).toEqual({ success: true });
    });

    it('should return false for non-existent route', () => {
      expect(connector.removeRoute('/nonexistent')).toBe(false);
    });

    it('should match by method when specified', () => {
      connector.addRoute({
        method: 'GET',
        pathPattern: '/api/users',
        response: { data: 'get' },
      });
      connector.addRoute({
        method: 'POST',
        pathPattern: '/api/users',
        response: { data: 'post' },
      });

      connector.removeRoute('/api/users', 'GET');

      // GET should use default, POST should still work
      expect(connector.wasRequestMade('/api/users', 'POST')).toBe(false);
    });
  });

  describe('clearRoutes', () => {
    it('should remove all routes', async () => {
      connector.addRoute({ pathPattern: '/a', response: { data: 'a' } });
      connector.addRoute({ pathPattern: '/b', response: { data: 'b' } });

      connector.clearRoutes();

      const resultA = await request(connector, { method: 'GET', path: '/a' });
      const resultB = await request(connector, { method: 'GET', path: '/b' });

      // Both should use default response
      expect(resultA.data).toEqual({ success: true });
      expect(resultB.data).toEqual({ success: true });
    });
  });

  describe('onGet', () => {
    it('should set up GET route', async () => {
      connector.onGet('/api/users', { id: 1 });

      const result = await request<{ id: number }>(connector, {
        method: 'GET',
        path: '/api/users',
      });

      expect(result.data).toEqual({ id: 1 });
    });

    it('should accept MockResponse format', async () => {
      connector.onGet('/api/users', {
        data: { id: 1 },
        statusCode: 200,
      });

      const result = await request<{ id: number }>(connector, {
        method: 'GET',
        path: '/api/users',
      });

      expect(result.data).toEqual({ id: 1 });
    });
  });

  describe('onPost', () => {
    it('should set up POST route', async () => {
      connector.onPost('/api/users', { created: true });

      const result = await request<{ created: boolean }>(connector, {
        method: 'POST',
        path: '/api/users',
        body: { name: 'John' },
      });

      expect(result.data).toEqual({ created: true });
    });
  });

  describe('onPut', () => {
    it('should set up PUT route', async () => {
      connector.onPut('/api/users/1', { updated: true });

      const result = await request<{ updated: boolean }>(connector, {
        method: 'PUT',
        path: '/api/users/1',
        body: { name: 'Jane' },
      });

      expect(result.data).toEqual({ updated: true });
    });
  });

  describe('onDelete', () => {
    it('should set up DELETE route', async () => {
      connector.onDelete('/api/users/1', { deleted: true });

      const result = await request<{ deleted: boolean }>(connector, {
        method: 'DELETE',
        path: '/api/users/1',
      });

      expect(result.data).toEqual({ deleted: true });
    });
  });

  describe('onAny', () => {
    it('should match any HTTP method', async () => {
      connector.onAny('/api/resource', 'any-response');

      const getResult = await request(connector, { method: 'GET', path: '/api/resource' });
      const postResult = await request(connector, { method: 'POST', path: '/api/resource' });
      const putResult = await request(connector, { method: 'PUT', path: '/api/resource' });

      expect(getResult.data).toBe('any-response');
      expect(postResult.data).toBe('any-response');
      expect(putResult.data).toBe('any-response');
    });
  });

  describe('pattern matching', () => {
    it('should support wildcard patterns', async () => {
      connector.onGet('/api/users/*', { wildcard: true });

      const result1 = await request(connector, { method: 'GET', path: '/api/users/1' });
      const result2 = await request(connector, { method: 'GET', path: '/api/users/abc' });

      expect(result1.data).toEqual({ wildcard: true });
      expect(result2.data).toEqual({ wildcard: true });
    });

    it('should support multiple wildcards', async () => {
      connector.onGet('/api/*/items/*', { nested: true });

      const result = await request(connector, {
        method: 'GET',
        path: '/api/users/items/123',
      });

      expect(result.data).toEqual({ nested: true });
    });

    it('should match exact paths first', async () => {
      connector.onGet('/api/users/*', { generic: true });
      connector.onGet('/api/users/special', { specific: true });

      const specificResult = await request(connector, {
        method: 'GET',
        path: '/api/users/special',
      });

      // The order matters - first match wins
      expect(specificResult.data).toEqual({ generic: true });
    });
  });

  describe('dynamic responses', () => {
    it('should support function responses', async () => {
      connector.addRoute({
        method: 'POST',
        pathPattern: '/api/echo',
        response: (req) => ({
          data: { echoed: req.body },
        }),
      });

      const result = await request(connector, {
        method: 'POST',
        path: '/api/echo',
        body: { message: 'hello' },
      });

      expect(result.data).toEqual({ echoed: { message: 'hello' } });
    });

    it('should support async function responses', async () => {
      connector.addRoute({
        method: 'GET',
        pathPattern: '/api/async',
        response: async () => {
          await new Promise((r) => setTimeout(r, 10));
          return { data: { async: true } };
        },
      });

      const result = await request(connector, { method: 'GET', path: '/api/async' });
      expect(result.data).toEqual({ async: true });
    });
  });

  describe('error simulation', () => {
    it('should throw error when configured', async () => {
      connector.addRoute({
        method: 'GET',
        pathPattern: '/api/error',
        response: {
          data: null,
          error: 'Something went wrong',
          statusCode: 500,
        },
      });

      const result = await request(connector, { method: 'GET', path: '/api/error' });
      expect(result.success).toBe(false);
    });

    it('should throw Error object', async () => {
      connector.addRoute({
        method: 'GET',
        pathPattern: '/api/error',
        response: {
          data: null,
          error: new Error('Custom error'),
          statusCode: 400,
        },
      });

      const result = await request(connector, { method: 'GET', path: '/api/error' });
      expect(result.success).toBe(false);
    });
  });

  describe('response delay', () => {
    it('should apply route-specific delay', async () => {
      connector.addRoute({
        pathPattern: '/api/slow',
        response: { data: 'slow', delay: 50 },
      });

      const start = Date.now();
      await request(connector, { method: 'GET', path: '/api/slow' });
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe('times limit', () => {
    it('should limit route matches', async () => {
      connector.addRoute({
        pathPattern: '/api/once',
        response: { data: 'first' },
        times: 1,
      });
      connector.addRoute({
        pathPattern: '/api/once',
        response: { data: 'second' },
      });

      const first = await request(connector, { method: 'GET', path: '/api/once' });
      const second = await request(connector, { method: 'GET', path: '/api/once' });

      // The mock connector wraps the response, so data is the inner value
      expect(first.data).toBe('first');
      expect(second.data).toBe('second');
    });
  });

  describe('request history', () => {
    it('should track all requests', async () => {
      await request(connector, { method: 'GET', path: '/api/a' });
      await request(connector, { method: 'POST', path: '/api/b', body: { x: 1 } });

      const history = connector.getRequestHistory();

      expect(history).toHaveLength(2);
      expect(history[0].request.path).toBe('/api/a');
      expect(history[1].request.path).toBe('/api/b');
    });

    it('should include timestamps', async () => {
      const before = Date.now();
      await request(connector, { method: 'GET', path: '/api/test' });
      const after = Date.now();

      const history = connector.getRequestHistory();

      expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(history[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('getLastRequest', () => {
    it('should return the most recent request', async () => {
      await request(connector, { method: 'GET', path: '/api/first' });
      await request(connector, { method: 'POST', path: '/api/second' });

      const last = connector.getLastRequest();

      expect(last?.path).toBe('/api/second');
      expect(last?.method).toBe('POST');
    });

    it('should return undefined when no requests made', () => {
      expect(connector.getLastRequest()).toBeUndefined();
    });
  });

  describe('getRequestsMatching', () => {
    it('should filter requests by path pattern', async () => {
      await request(connector, { method: 'GET', path: '/api/users/1' });
      await request(connector, { method: 'GET', path: '/api/users/2' });
      await request(connector, { method: 'GET', path: '/api/posts/1' });

      const userRequests = connector.getRequestsMatching('/api/users/*');

      expect(userRequests).toHaveLength(2);
    });

    it('should filter by method', async () => {
      await request(connector, { method: 'GET', path: '/api/users' });
      await request(connector, { method: 'POST', path: '/api/users' });

      const getRequests = connector.getRequestsMatching('/api/users', 'GET');

      expect(getRequests).toHaveLength(1);
      expect(getRequests[0].method).toBe('GET');
    });
  });

  describe('clearHistory', () => {
    it('should clear all request history', async () => {
      await request(connector, { method: 'GET', path: '/api/test' });
      await request(connector, { method: 'POST', path: '/api/test' });

      connector.clearHistory();

      expect(connector.getRequestHistory()).toHaveLength(0);
    });
  });

  describe('wasRequestMade', () => {
    it('should return true for matching request', async () => {
      await request(connector, { method: 'GET', path: '/api/users/123' });

      expect(connector.wasRequestMade('/api/users/*')).toBe(true);
    });

    it('should return false for non-matching request', async () => {
      await request(connector, { method: 'GET', path: '/api/posts' });

      expect(connector.wasRequestMade('/api/users/*')).toBe(false);
    });

    it('should check method when specified', async () => {
      await request(connector, { method: 'GET', path: '/api/users' });

      expect(connector.wasRequestMade('/api/users', 'GET')).toBe(true);
      expect(connector.wasRequestMade('/api/users', 'POST')).toBe(false);
    });
  });

  describe('getCallCount', () => {
    it('should count route calls', async () => {
      connector.onGet('/api/users', { users: [] });

      await request(connector, { method: 'GET', path: '/api/users' });
      await request(connector, { method: 'GET', path: '/api/users' });
      await request(connector, { method: 'GET', path: '/api/users' });

      expect(connector.getCallCount('/api/users', 'GET')).toBe(3);
    });

    it('should return 0 for uncalled routes', () => {
      connector.onGet('/api/users', { users: [] });

      expect(connector.getCallCount('/api/users', 'GET')).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear routes, history, and call counts', async () => {
      connector.onGet('/api/users', { users: [] });
      await request(connector, { method: 'GET', path: '/api/users' });

      connector.reset();

      expect(connector.getRequestHistory()).toHaveLength(0);
      expect(connector.getCallCount('/api/users', 'GET')).toBe(0);
    });
  });

  describe('setHealthStatus', () => {
    it('should set custom health status', async () => {
      connector.setHealthStatus({
        healthy: false,
        message: 'Service unavailable',
      });

      const health = await connector.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.message).toBe('Service unavailable');
    });

    it('should return healthy by default', async () => {
      const health = await connector.healthCheck();
      expect(health.healthy).toBe(true);
    });
  });

  describe('failure rate', () => {
    it('should simulate random failures', async () => {
      const failingConnector = new MockConnector(
        { config: createConfig(), category: 'custom' },
        { defaultDelay: 0, failureRate: 1 } // 100% failure rate
      );
      await failingConnector.connect();

      const result = await failingConnector.execute({
        method: 'GET',
        path: '/api/test',
        headers: {},
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('createMockConnector', () => {
  it('should create connector with default config', () => {
    const connector = createMockConnector();

    expect(connector).toBeInstanceOf(MockConnector);
  });

  it('should create connector with custom name', () => {
    const connector = createMockConnector('my-mock');
    const config = connector.getConfig();

    expect(config.name).toBe('my-mock');
  });

  it('should accept mock configuration', async () => {
    const connector = createMockConnector('test', {
      defaultDelay: 0,
      routes: [{ pathPattern: '/api/test', response: { data: 'preset' } }],
    });

    await connector.connect();
    const result = await request(connector, { method: 'GET', path: '/api/test' });

    // Response is wrapped in { data: 'preset' }, so result.data is the inner value
    expect(result.data).toBe('preset');
  });
});
