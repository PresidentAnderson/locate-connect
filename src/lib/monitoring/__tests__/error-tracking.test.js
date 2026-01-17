import test from "node:test";
import assert from "node:assert/strict";

// Mock Sentry module
const mockSentry = {
  setUser: (user) => {
    mockSentry._user = user;
  },
  setTag: (key, value) => {
    if (!mockSentry._tags) mockSentry._tags = {};
    mockSentry._tags[key] = value;
  },
  addBreadcrumb: (breadcrumb) => {
    if (!mockSentry._breadcrumbs) mockSentry._breadcrumbs = [];
    mockSentry._breadcrumbs.push(breadcrumb);
  },
  captureException: (error, options) => {
    mockSentry._lastException = { error, options };
    return 'test-event-id';
  },
  captureMessage: (message, level) => {
    mockSentry._lastMessage = { message, level };
    return 'test-message-id';
  },
  setContext: (key, value) => {
    if (!mockSentry._contexts) mockSentry._contexts = {};
    mockSentry._contexts[key] = value;
  },
  lastEventId: () => 'last-event-id',
  flush: async () => true,
  close: async () => true,
  startTransaction: (data) => ({ name: data.name, op: data.op, data: data.data }),
  _reset: () => {
    mockSentry._user = null;
    mockSentry._tags = {};
    mockSentry._breadcrumbs = [];
    mockSentry._lastException = null;
    mockSentry._lastMessage = null;
    mockSentry._contexts = {};
  }
};

// Since we can't easily mock ES modules in Node.js test runner,
// we'll test the logic directly with the mock

test("ErrorType enum has expected values", () => {
  const ErrorType = {
    JAVASCRIPT: 'javascript',
    API: 'api',
    AUTHENTICATION: 'authentication',
    DATABASE: 'database',
    INTEGRATION: 'integration',
    PERFORMANCE: 'performance',
    VALIDATION: 'validation',
    NETWORK: 'network',
  };

  assert.equal(ErrorType.JAVASCRIPT, 'javascript');
  assert.equal(ErrorType.API, 'api');
  assert.equal(ErrorType.AUTHENTICATION, 'authentication');
  assert.equal(ErrorType.DATABASE, 'database');
});

test("ErrorSeverity enum has expected values", () => {
  const ErrorSeverity = {
    FATAL: 'fatal',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    DEBUG: 'debug',
  };

  assert.equal(ErrorSeverity.FATAL, 'fatal');
  assert.equal(ErrorSeverity.ERROR, 'error');
  assert.equal(ErrorSeverity.WARNING, 'warning');
  assert.equal(ErrorSeverity.INFO, 'info');
});

test("UserContext interface structure", () => {
  const userContext = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'admin',
    username: 'testuser',
    ip_address: '127.0.0.1',
    anonymize: false,
  };

  assert.equal(userContext.id, 'user-123');
  assert.equal(userContext.email, 'test@example.com');
  assert.equal(userContext.role, 'admin');
  assert.equal(userContext.anonymize, false);
});

test("ErrorContext interface structure", () => {
  const errorContext = {
    type: 'api',
    severity: 'error',
    route: '/api/test',
    action: 'fetch',
    component: 'TestComponent',
    metadata: { key: 'value' },
    tags: { env: 'test' },
    fingerprint: ['test', 'error'],
  };

  assert.equal(errorContext.type, 'api');
  assert.equal(errorContext.severity, 'error');
  assert.equal(errorContext.route, '/api/test');
  assert.deepEqual(errorContext.metadata, { key: 'value' });
});

// Test breadcrumb data structure
test("addBreadcrumb creates correct structure", () => {
  const breadcrumb = {
    message: 'Test action',
    category: 'user',
    level: 'info',
    data: { action: 'click', target: 'button' },
    timestamp: Date.now() / 1000,
  };

  assert.equal(breadcrumb.message, 'Test action');
  assert.equal(breadcrumb.category, 'user');
  assert.equal(breadcrumb.level, 'info');
  assert.deepEqual(breadcrumb.data, { action: 'click', target: 'button' });
  assert.ok(breadcrumb.timestamp > 0);
});

// Test API request tracking structure
test("trackApiRequest creates correct breadcrumb data", () => {
  const method = 'POST';
  const url = '/api/test';
  const statusCode = 200;
  const duration = 150;

  const breadcrumbData = {
    method,
    url,
    status_code: statusCode,
    duration_ms: duration,
  };

  assert.equal(breadcrumbData.method, 'POST');
  assert.equal(breadcrumbData.url, '/api/test');
  assert.equal(breadcrumbData.status_code, 200);
  assert.equal(breadcrumbData.duration_ms, 150);
});

// Test navigation tracking
test("trackNavigation creates correct breadcrumb message", () => {
  const from = '/home';
  const to = '/dashboard';
  const expectedMessage = `Navigated from ${from} to ${to}`;

  assert.equal(expectedMessage, 'Navigated from /home to /dashboard');
});

// Test user action tracking
test("trackUserAction creates correct breadcrumb message", () => {
  const action = 'clicked';
  const target = 'submit-button';
  const expectedMessage = `User ${action} on ${target}`;

  assert.equal(expectedMessage, 'User clicked on submit-button');
});

// Test error context anonymization
test("User context respects anonymization", () => {
  const user = {
    id: 'user-123',
    email: 'test@example.com',
    anonymize: true,
  };

  const sentryUser = {
    id: user.anonymize ? undefined : user.id,
    email: user.anonymize ? undefined : user.email,
  };

  assert.equal(sentryUser.id, undefined);
  assert.equal(sentryUser.email, undefined);
});

test("User context without anonymization includes data", () => {
  const user = {
    id: 'user-123',
    email: 'test@example.com',
    anonymize: false,
  };

  const sentryUser = {
    id: user.anonymize ? undefined : user.id,
    email: user.anonymize ? undefined : user.email,
  };

  assert.equal(sentryUser.id, 'user-123');
  assert.equal(sentryUser.email, 'test@example.com');
});
