import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('app security middleware', () => {
  it('health check responds and is exempt from the rate limiter', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    // Exempt routes carry no RateLimit headers.
    expect(res.headers['ratelimit-limit']).toBeUndefined();
  });

  it('sets helmet security headers on API responses', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    // helmet sets a frameguard header by default
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('applies the rate limiter to /api routes (standard headers present)', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.headers['ratelimit-limit']).toBe('300');
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });

  it('reflects the request origin in dev (no credentialed wildcard)', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    // No CORS_ORIGIN configured -> credentials must be disabled.
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });
});
