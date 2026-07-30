import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

/**
 * The shared-secret gate (server/src/middleware/requireApiKey.ts) exists because
 * this app is served from a public domain with no server-side authorization.
 * These tests pin the two things that matter: reads stay open, and the
 * destructive endpoints are unreachable without the key.
 *
 * API_KEY is read per request, so setting process.env here is enough — no app
 * rebuild or restart required.
 */

const REPLACE_WIPE = {
  backup: {
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    data: {
      groups: [],
      players: [],
      sessions: [],
      entries: [],
      rebuyEvents: [],
      playerNotes: [],
      templates: [],
    },
  },
  options: { mode: 'replace', skipDuplicates: false },
};

describe('API key gate', () => {
  afterEach(() => {
    delete process.env.API_KEY;
  });

  describe('when API_KEY is unset (default: dev, CI, existing suites)', () => {
    it('does not gate mutating requests', async () => {
      const res = await request(app).post('/api/groups').send({ name: 'Ungated Group' });
      expect(res.status).not.toBe(401);
    });
  });

  describe('when API_KEY is set', () => {
    it('still serves reads without a key', async () => {
      process.env.API_KEY = 'test-secret';
      const res = await request(app).get('/api/groups');
      expect(res.status).toBe(200);
    });

    it('rejects an unauthenticated backup import — the remote-wipe path', async () => {
      process.env.API_KEY = 'test-secret';
      const res = await request(app).post('/api/backup/import').send(REPLACE_WIPE);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('rejects an unauthenticated group delete', async () => {
      process.env.API_KEY = 'test-secret';
      const res = await request(app).delete('/api/groups/some-id');
      expect(res.status).toBe(401);
    });

    it('rejects a wrong key', async () => {
      process.env.API_KEY = 'test-secret';
      const res = await request(app)
        .post('/api/groups')
        .set('X-Api-Key', 'not-the-secret')
        .send({ name: 'Should Not Exist' });

      expect(res.status).toBe(401);
    });

    it('admits a request carrying the correct key', async () => {
      process.env.API_KEY = 'test-secret';
      const res = await request(app)
        .post('/api/groups')
        .set('X-Api-Key', 'test-secret')
        .send({ name: 'Gated Group', defaultBuyIn: 5 });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Gated Group');
    });

    it('never leaks the expected key in a rejection', async () => {
      process.env.API_KEY = 'super-secret-value';
      const res = await request(app).post('/api/groups').send({ name: 'x' });

      expect(JSON.stringify(res.body)).not.toContain('super-secret-value');
    });
  });
});
