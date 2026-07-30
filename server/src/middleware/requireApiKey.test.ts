import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireApiKey } from './requireApiKey';

const ORIGINAL_KEY = process.env.API_KEY;

/** Minimal Express doubles — the middleware only touches method, headers, status/json, next. */
const makeReq = (method: string, headers: Record<string, string> = {}): Request => {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    method,
    get: (name: string) => lower[name.toLowerCase()],
  } as unknown as Request;
};

const makeRes = () => {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: any };
};

describe('requireApiKey', () => {
  let next: NextFunction & { mock: { calls: unknown[][] } };

  beforeEach(() => {
    next = vi.fn() as unknown as NextFunction & { mock: { calls: unknown[][] } };
    delete process.env.API_KEY;
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = ORIGINAL_KEY;
  });

  describe('when API_KEY is not configured', () => {
    it('passes every request through so local dev is unaffected', () => {
      const res = makeRes();
      requireApiKey(makeReq('POST'), res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.statusCode).toBe(0);
    });

    it('passes an empty-string API_KEY through too (treated as unset)', () => {
      process.env.API_KEY = '';
      const res = makeRes();
      requireApiKey(makeReq('DELETE'), res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.statusCode).toBe(0);
    });
  });

  describe('when API_KEY is configured', () => {
    beforeEach(() => {
      process.env.API_KEY = 'correct-horse-battery-staple';
    });

    it.each(['GET', 'HEAD', 'OPTIONS'])(
      'lets unauthenticated %s through — reads are not the risk',
      (method) => {
        const res = makeRes();
        requireApiKey(makeReq(method), res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.statusCode).toBe(0);
      }
    );

    it.each(['POST', 'PATCH', 'PUT', 'DELETE'])('rejects %s with no key', (method) => {
      const res = makeRes();
      requireApiKey(makeReq(method), res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
      expect(res.body).toMatchObject({ error: 'Unauthorized' });
    });

    it('rejects a wrong key', () => {
      const res = makeRes();
      requireApiKey(makeReq('POST', { 'X-Api-Key': 'wrong' }), res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
    });

    it('rejects a key that is a prefix of the real one', () => {
      const res = makeRes();
      requireApiKey(makeReq('POST', { 'X-Api-Key': 'correct-horse' }), res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
    });

    it('accepts the correct key', () => {
      const res = makeRes();
      requireApiKey(
        makeReq('POST', { 'X-Api-Key': 'correct-horse-battery-staple' }),
        res,
        next
      );

      expect(next).toHaveBeenCalledOnce();
      expect(res.statusCode).toBe(0);
    });

    it('accepts the header case-insensitively', () => {
      const res = makeRes();
      requireApiKey(
        makeReq('POST', { 'x-api-key': 'correct-horse-battery-staple' }),
        res,
        next
      );

      expect(next).toHaveBeenCalledOnce();
    });

    it('never echoes the expected key in the rejection body', () => {
      const res = makeRes();
      requireApiKey(makeReq('POST', { 'X-Api-Key': 'wrong' }), res, next);

      expect(JSON.stringify(res.body)).not.toContain('correct-horse');
    });

    it('reads API_KEY per request, not once at module load', () => {
      const first = makeRes();
      requireApiKey(makeReq('POST', { 'X-Api-Key': 'rotated' }), first, next);
      expect(first.statusCode).toBe(401);

      process.env.API_KEY = 'rotated';
      const second = makeRes();
      requireApiKey(makeReq('POST', { 'X-Api-Key': 'rotated' }), second, next);
      expect(second.statusCode).toBe(0);
      expect(next).toHaveBeenCalledOnce();
    });
  });
});
