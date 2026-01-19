/**
 * Tests for Request/Response Interceptors
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  InterceptorChain,
  correlationIdInterceptor,
  createLoggingInterceptor,
  timingResponseInterceptor,
  contentTypeInterceptor,
  createUserAgentInterceptor,
  retryHeaderInterceptor,
  errorNormalizationInterceptor,
  createTransformInterceptor,
  createRedactionInterceptor,
  createDefaultInterceptorChain,
  type RequestContext,
  type RequestInterceptor,
  type ResponseInterceptor,
} from './interceptors';
import type { ConnectorRequest, ConnectorResponse } from '@/types';

describe('InterceptorChain', () => {
  let chain: InterceptorChain;
  let context: RequestContext;

  const createRequest = (overrides: Partial<ConnectorRequest> = {}): ConnectorRequest => ({
    id: 'req-123',
    method: 'GET',
    path: '/api/test',
    headers: {},
    ...overrides,
  });

  const createResponse = <T>(data: T, overrides: Partial<ConnectorResponse<T>> = {}): ConnectorResponse<T> => ({
    success: true,
    data,
    metadata: { statusCode: 200 },
    ...overrides,
  });

  beforeEach(() => {
    chain = new InterceptorChain();
    context = {
      correlationId: 'corr-123',
      connectorId: 'test-connector',
      startTime: Date.now() - 100,
      metadata: {},
    };
  });

  describe('addRequestInterceptor', () => {
    it('should add and execute request interceptors', async () => {
      const interceptor: RequestInterceptor = (req) => ({
        ...req,
        headers: { ...req.headers, 'X-Custom': 'value' },
      });

      chain.addRequestInterceptor(interceptor);
      const request = createRequest();
      const result = await chain.processRequest(request, context);

      expect(result.headers['X-Custom']).toBe('value');
    });

    it('should execute interceptors in order', async () => {
      const order: number[] = [];

      chain.addRequestInterceptor((req) => {
        order.push(1);
        return req;
      });
      chain.addRequestInterceptor((req) => {
        order.push(2);
        return req;
      });
      chain.addRequestInterceptor((req) => {
        order.push(3);
        return req;
      });

      await chain.processRequest(createRequest(), context);

      expect(order).toEqual([1, 2, 3]);
    });

    it('should support async interceptors', async () => {
      chain.addRequestInterceptor(async (req) => {
        await new Promise((r) => setTimeout(r, 10));
        return { ...req, headers: { ...req.headers, 'X-Async': 'true' } };
      });

      const result = await chain.processRequest(createRequest(), context);
      expect(result.headers['X-Async']).toBe('true');
    });

    it('should chain return for fluent API', () => {
      const result = chain.addRequestInterceptor((req) => req);
      expect(result).toBe(chain);
    });
  });

  describe('addResponseInterceptor', () => {
    it('should add and execute response interceptors', async () => {
      const interceptor: ResponseInterceptor<{ value: number }> = (res) => ({
        ...res,
        metadata: { ...res.metadata, custom: 'added' },
      });

      chain.addResponseInterceptor(interceptor);
      const response = createResponse({ value: 1 });
      const result = await chain.processResponse(response, context);

      expect(result.metadata?.custom).toBe('added');
    });

    it('should transform response data', async () => {
      chain.addResponseInterceptor<{ doubled: number }>((res) => ({
        ...res,
        data: { doubled: (res.data as any).value * 2 },
      }));

      const response = createResponse({ value: 5 });
      const result = await chain.processResponse(response, context);

      expect((result.data as any).doubled).toBe(10);
    });
  });

  describe('addErrorInterceptor', () => {
    it('should add and execute error interceptors', async () => {
      chain.addErrorInterceptor((error, ctx) => {
        error.message = `[${ctx.correlationId}] ${error.message}`;
        return error;
      });

      const error = new Error('Test error');
      const result = await chain.processError(error, context);

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('corr-123');
    });

    it('should convert error to response', async () => {
      chain.addErrorInterceptor(() => ({
        success: false,
        data: null,
        error: { message: 'Converted error' },
      }));

      const error = new Error('Original error');
      const result = await chain.processError(error, context);

      expect(result).not.toBeInstanceOf(Error);
      expect((result as any).success).toBe(false);
    });
  });

  describe('removeRequestInterceptor', () => {
    it('should remove an existing interceptor', async () => {
      const interceptor: RequestInterceptor = (req) => ({
        ...req,
        headers: { ...req.headers, 'X-Removable': 'yes' },
      });

      chain.addRequestInterceptor(interceptor);
      expect(chain.removeRequestInterceptor(interceptor)).toBe(true);

      const result = await chain.processRequest(createRequest(), context);
      expect(result.headers['X-Removable']).toBeUndefined();
    });

    it('should return false for non-existent interceptor', () => {
      const interceptor: RequestInterceptor = (req) => req;
      expect(chain.removeRequestInterceptor(interceptor)).toBe(false);
    });
  });

  describe('removeResponseInterceptor', () => {
    it('should remove an existing interceptor', () => {
      const interceptor: ResponseInterceptor = (res) => res;

      chain.addResponseInterceptor(interceptor);
      expect(chain.removeResponseInterceptor(interceptor)).toBe(true);
    });

    it('should return false for non-existent interceptor', () => {
      const interceptor: ResponseInterceptor = (res) => res;
      expect(chain.removeResponseInterceptor(interceptor)).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all interceptors', async () => {
      chain.addRequestInterceptor((req) => ({
        ...req,
        headers: { 'X-Test': 'value' },
      }));
      chain.addResponseInterceptor((res) => ({
        ...res,
        metadata: { added: true },
      }));
      chain.addErrorInterceptor((err) => err);

      chain.clear();

      const request = createRequest();
      const response = createResponse({ value: 1 });
      const error = new Error('Test');

      const reqResult = await chain.processRequest(request, context);
      const resResult = await chain.processResponse(response, context);
      const errResult = await chain.processError(error, context);

      expect(reqResult.headers['X-Test']).toBeUndefined();
      expect(resResult.metadata?.added).toBeUndefined();
      expect(errResult).toBe(error);
    });
  });

  describe('processRequest', () => {
    it('should pass context through all interceptors', async () => {
      const contexts: RequestContext[] = [];

      chain.addRequestInterceptor((req, ctx) => {
        contexts.push(ctx);
        ctx.metadata.step1 = true;
        return req;
      });
      chain.addRequestInterceptor((req, ctx) => {
        contexts.push(ctx);
        ctx.metadata.step2 = true;
        return req;
      });

      await chain.processRequest(createRequest(), context);

      expect(contexts[0]).toBe(contexts[1]);
      expect(context.metadata.step1).toBe(true);
      expect(context.metadata.step2).toBe(true);
    });
  });
});

describe('Built-in Interceptors', () => {
  let context: RequestContext;

  const createRequest = (overrides: Partial<ConnectorRequest> = {}): ConnectorRequest => ({
    id: 'req-123',
    method: 'GET',
    path: '/api/test',
    headers: {},
    ...overrides,
  });

  const createResponse = <T>(data: T): ConnectorResponse<T> => ({
    success: true,
    data,
    metadata: { statusCode: 200 },
  });

  beforeEach(() => {
    context = {
      correlationId: 'corr-456',
      connectorId: 'test-connector',
      startTime: Date.now() - 50,
      metadata: {},
    };
  });

  describe('correlationIdInterceptor', () => {
    it('should add correlation ID header', () => {
      const request = createRequest();
      const result = correlationIdInterceptor(request, context);

      expect(result.headers['X-Correlation-ID']).toBe('corr-456');
    });

    it('should add request ID header', () => {
      const request = createRequest({ id: 'custom-id' });
      const result = correlationIdInterceptor(request, context);

      expect(result.headers['X-Request-ID']).toBe('custom-id');
    });

    it('should use correlation ID when request ID is missing', () => {
      const request = createRequest({ id: undefined });
      const result = correlationIdInterceptor(request, context);

      expect(result.headers['X-Request-ID']).toBe('corr-456');
    });
  });

  describe('contentTypeInterceptor', () => {
    it('should add Content-Type for requests with body', () => {
      const request = createRequest({ body: { data: 'test' } });
      const result = contentTypeInterceptor(request, context);

      expect(result.headers['Content-Type']).toBe('application/json');
    });

    it('should not override existing Content-Type', () => {
      const request = createRequest({
        body: { data: 'test' },
        headers: { 'Content-Type': 'text/plain' },
      });
      const result = contentTypeInterceptor(request, context);

      expect(result.headers['Content-Type']).toBe('text/plain');
    });

    it('should add Accept header', () => {
      const request = createRequest();
      const result = contentTypeInterceptor(request, context);

      expect(result.headers['Accept']).toBe('application/json');
    });

    it('should not override existing Accept header', () => {
      const request = createRequest({ headers: { Accept: 'text/html' } });
      const result = contentTypeInterceptor(request, context);

      expect(result.headers['Accept']).toBe('text/html');
    });
  });

  describe('timingResponseInterceptor', () => {
    it('should add client duration to metadata', () => {
      const response = createResponse({ value: 1 });
      const result = timingResponseInterceptor(response, context);

      expect(result.metadata?.clientDurationMs).toBeGreaterThanOrEqual(50);
    });

    it('should add request start time to metadata', () => {
      const response = createResponse({ value: 1 });
      const result = timingResponseInterceptor(response, context);

      expect(result.metadata?.requestStartTime).toBe(context.startTime);
    });
  });

  describe('createUserAgentInterceptor', () => {
    it('should add User-Agent header', () => {
      const interceptor = createUserAgentInterceptor('TestClient/1.0');
      const request = createRequest();
      const result = interceptor(request, context);

      expect(result.headers['User-Agent']).toBe('TestClient/1.0');
    });
  });

  describe('retryHeaderInterceptor', () => {
    it('should add retry attempt header when present in context', () => {
      context.metadata.retryAttempt = 2;
      const request = createRequest();
      const result = retryHeaderInterceptor(request, context);

      expect(result.headers['X-Retry-Attempt']).toBe('2');
    });

    it('should not add header when no retry attempt', () => {
      const request = createRequest();
      const result = retryHeaderInterceptor(request, context);

      expect(result.headers['X-Retry-Attempt']).toBeUndefined();
    });
  });

  describe('errorNormalizationInterceptor', () => {
    it('should add correlation ID to error', () => {
      const error = new Error('Test error');
      const result = errorNormalizationInterceptor(error, context);

      expect((result as any).correlationId).toBe('corr-456');
    });

    it('should add connector ID to error', () => {
      const error = new Error('Test error');
      const result = errorNormalizationInterceptor(error, context);

      expect((result as any).connectorId).toBe('test-connector');
    });
  });

  describe('createLoggingInterceptor', () => {
    it('should log requests', () => {
      const logs: unknown[] = [];
      const logger = (_msg: string, data?: unknown) => logs.push(data);
      const { request: interceptor } = createLoggingInterceptor({ logger });

      const req = createRequest({ method: 'POST', path: '/api/users' });
      interceptor(req, context);

      expect(logs[0]).toMatchObject({
        correlationId: 'corr-456',
        method: 'POST',
        path: '/api/users',
      });
    });

    it('should log responses', () => {
      const logs: unknown[] = [];
      const logger = (_msg: string, data?: unknown) => logs.push(data);
      const { response: interceptor } = createLoggingInterceptor({ logger });

      const res = createResponse({ value: 1 });
      interceptor(res, context);

      expect(logs[0]).toMatchObject({
        correlationId: 'corr-456',
        success: true,
        statusCode: 200,
      });
    });

    it('should log errors', () => {
      const logs: unknown[] = [];
      const logger = (_msg: string, data?: unknown) => logs.push(data);
      const { error: interceptor } = createLoggingInterceptor({ logger });

      const err = new Error('Failed');
      interceptor(err, context);

      expect(logs[0]).toMatchObject({
        correlationId: 'corr-456',
        error: 'Failed',
      });
    });

    it('should optionally log headers', () => {
      const logs: unknown[] = [];
      const logger = (_msg: string, data?: unknown) => logs.push(data);
      const { request: interceptor } = createLoggingInterceptor({
        logger,
        logHeaders: true,
      });

      const req = createRequest({ headers: { Authorization: 'Bearer token' } });
      interceptor(req, context);

      expect((logs[0] as any).headers).toEqual({ Authorization: 'Bearer token' });
    });

    it('should redact body by default', () => {
      const logs: unknown[] = [];
      const logger = (_msg: string, data?: unknown) => logs.push(data);
      const { request: interceptor } = createLoggingInterceptor({
        logger,
        logBody: true,
      });

      const req = createRequest({ body: { password: 'secret' } });
      interceptor(req, context);

      expect((logs[0] as any).body).toBe('[REDACTED]');
    });
  });

  describe('createTransformInterceptor', () => {
    it('should transform successful response data', () => {
      const interceptor = createTransformInterceptor<{ value: number }, { doubled: number }>(
        (data) => ({ doubled: data.value * 2 })
      );

      const response = createResponse({ value: 5 });
      const result = interceptor(response, context);

      expect(result.data).toEqual({ doubled: 10 });
    });

    it('should not transform failed responses', () => {
      const interceptor = createTransformInterceptor<{ value: number }, { doubled: number }>(
        (data) => ({ doubled: data.value * 2 })
      );

      const response: ConnectorResponse<{ doubled: number }> = {
        success: false,
        data: null as any,
        error: { message: 'Failed' },
      };
      const result = interceptor(response, context);

      expect(result.success).toBe(false);
    });
  });

  describe('createRedactionInterceptor', () => {
    it('should redact sensitive fields in body', () => {
      const interceptor = createRedactionInterceptor(['password', 'secret']);
      const request = createRequest({
        body: {
          username: 'john',
          password: 'secret123',
          data: {
            secret: 'hidden',
            public: 'visible',
          },
        },
      });

      interceptor(request, context);

      expect(context.metadata.redactedBody).toEqual({
        username: 'john',
        password: '[REDACTED]',
        data: {
          secret: '[REDACTED]',
          public: 'visible',
        },
      });
    });

    it('should be case-insensitive', () => {
      const interceptor = createRedactionInterceptor(['password']);
      const request = createRequest({
        body: { PASSWORD: 'secret' },
      });

      interceptor(request, context);

      expect((context.metadata.redactedBody as any).PASSWORD).toBe('[REDACTED]');
    });

    it('should return request unmodified', () => {
      const interceptor = createRedactionInterceptor(['password']);
      const request = createRequest({
        body: { password: 'secret' },
      });

      const result = interceptor(request, context);

      expect(result.body).toEqual({ password: 'secret' });
    });
  });

  describe('createDefaultInterceptorChain', () => {
    it('should create chain with common interceptors', async () => {
      const chain = createDefaultInterceptorChain('my-connector');
      const request: ConnectorRequest = {
        id: 'req-1',
        method: 'POST',
        path: '/api/data',
        headers: {},
        body: { value: 1 },
      };

      const ctx: RequestContext = {
        correlationId: 'corr-test',
        connectorId: 'my-connector',
        startTime: Date.now(),
        metadata: {},
      };

      const result = await chain.processRequest(request, ctx);

      // Check correlation ID interceptor worked
      expect(result.headers['X-Correlation-ID']).toBe('corr-test');
      // Check content type interceptor worked
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Accept']).toBe('application/json');
    });

    it('should add timing to responses', async () => {
      const chain = createDefaultInterceptorChain('my-connector');
      const response: ConnectorResponse<{ value: number }> = {
        success: true,
        data: { value: 1 },
        metadata: { statusCode: 200 },
      };

      const ctx: RequestContext = {
        correlationId: 'corr-test',
        connectorId: 'my-connector',
        startTime: Date.now() - 100,
        metadata: {},
      };

      const result = await chain.processResponse(response, ctx);

      expect(result.metadata?.clientDurationMs).toBeGreaterThanOrEqual(100);
    });

    it('should normalize errors', async () => {
      const chain = createDefaultInterceptorChain('my-connector');
      const error = new Error('API error');

      const ctx: RequestContext = {
        correlationId: 'corr-test',
        connectorId: 'my-connector',
        startTime: Date.now(),
        metadata: {},
      };

      const result = await chain.processError(error, ctx);

      expect((result as any).correlationId).toBe('corr-test');
      expect((result as any).connectorId).toBe('my-connector');
    });
  });
});
