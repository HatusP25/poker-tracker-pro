import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';

async function seedPlayer() {
  const group = await prisma.group.create({
    data: { name: 'Notes Test Group', defaultBuyIn: 100 },
  });
  const player = await prisma.player.create({
    data: { groupId: group.id, name: 'Alice' },
  });
  return { group, player };
}

describe('Player notes API', () => {
  describe('GET /api/players/:playerId/notes', () => {
    it('returns an empty list for a player with no notes', async () => {
      const { player } = await seedPlayer();

      const res = await request(app).get(`/api/players/${player.id}/notes`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns notes newest first', async () => {
      const { player } = await seedPlayer();
      const older = await prisma.playerNote.create({
        data: { playerId: player.id, note: 'Always folds to a 3-bet' },
      });
      // Ensure a distinguishable createdAt ordering.
      await new Promise((resolve) => setTimeout(resolve, 5));
      const newer = await prisma.playerNote.create({
        data: { playerId: player.id, note: 'Bluffs the river a lot', tags: JSON.stringify(['bluffer']) },
      });

      const res = await request(app).get(`/api/players/${player.id}/notes`);

      expect(res.status).toBe(200);
      expect(res.body.map((n: { id: string }) => n.id)).toEqual([newer.id, older.id]);
    });

    it('returns 404 for a missing player', async () => {
      const res = await request(app).get('/api/players/does-not-exist/notes');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/players/:playerId/notes', () => {
    it('creates a note with tags', async () => {
      const { player } = await seedPlayer();

      const res = await request(app)
        .post(`/api/players/${player.id}/notes`)
        .send({ note: 'Always bluffs the river', tags: ['bluffer', 'aggressive'] });

      expect(res.status).toBe(201);
      expect(res.body.playerId).toBe(player.id);
      expect(res.body.note).toBe('Always bluffs the river');
      expect(JSON.parse(res.body.tags)).toEqual(['bluffer', 'aggressive']);
    });

    it('creates a note without tags', async () => {
      const { player } = await seedPlayer();

      const res = await request(app)
        .post(`/api/players/${player.id}/notes`)
        .send({ note: 'Only plays pocket aces' });

      expect(res.status).toBe(201);
      expect(res.body.tags).toBeNull();
    });

    it('rejects empty content with 400', async () => {
      const { player } = await seedPlayer();

      const res = await request(app)
        .post(`/api/players/${player.id}/notes`)
        .send({ note: '   ' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 404 for a missing player', async () => {
      const res = await request(app)
        .post('/api/players/does-not-exist/notes')
        .send({ note: 'Some note' });

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/players/notes/:noteId', () => {
    it('updates note content and tags', async () => {
      const { player } = await seedPlayer();
      const note = await prisma.playerNote.create({
        data: { playerId: player.id, note: 'Original note' },
      });

      const res = await request(app)
        .patch(`/api/players/notes/${note.id}`)
        .send({ note: 'Updated note', tags: ['nit'] });

      expect(res.status).toBe(200);
      expect(res.body.note).toBe('Updated note');
      expect(JSON.parse(res.body.tags)).toEqual(['nit']);
    });

    it('rejects empty content with 400', async () => {
      const { player } = await seedPlayer();
      const note = await prisma.playerNote.create({
        data: { playerId: player.id, note: 'Original note' },
      });

      const res = await request(app)
        .patch(`/api/players/notes/${note.id}`)
        .send({ note: '' });

      expect(res.status).toBe(400);
    });

    it('returns 404 for a missing note', async () => {
      const res = await request(app)
        .patch('/api/players/notes/does-not-exist')
        .send({ note: 'Updated note' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/players/notes/:noteId', () => {
    it('deletes a note', async () => {
      const { player } = await seedPlayer();
      const note = await prisma.playerNote.create({
        data: { playerId: player.id, note: 'Delete me' },
      });

      const res = await request(app).delete(`/api/players/notes/${note.id}`);

      expect(res.status).toBe(204);

      const found = await prisma.playerNote.findUnique({ where: { id: note.id } });
      expect(found).toBeNull();
    });

    it('returns 404 for a missing note', async () => {
      const res = await request(app).delete('/api/players/notes/does-not-exist');

      expect(res.status).toBe(404);
    });
  });
});
