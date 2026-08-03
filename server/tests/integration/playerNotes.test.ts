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

describe('player nicknames', () => {
  async function group() {
    return prisma.group.create({ data: { name: 'Nickname Group', defaultBuyIn: 5 } });
  }

  it('stores a nickname on create', async () => {
    const g = await group();
    const res = await request(app)
      .post('/api/players')
      .send({ groupId: g.id, name: 'Ana', nickname: 'The Closer' });

    expect(res.status).toBe(201);
    expect(res.body.nickname).toBe('The Closer');
  });

  it('defaults to no nickname', async () => {
    const g = await group();
    const res = await request(app).post('/api/players').send({ groupId: g.id, name: 'Dave' });

    expect(res.status).toBe(201);
    expect(res.body.nickname).toBeNull();
  });

  it('trims surrounding whitespace', async () => {
    const g = await group();
    const res = await request(app)
      .post('/api/players')
      .send({ groupId: g.id, name: 'Ana', nickname: '  Rocket  ' });

    expect(res.body.nickname).toBe('Rocket');
  });

  it('stores an empty nickname as null rather than an empty string', async () => {
    const g = await group();
    const res = await request(app)
      .post('/api/players')
      .send({ groupId: g.id, name: 'Ana', nickname: '   ' });

    expect(res.body.nickname).toBeNull();
  });

  it('rejects a nickname that would not fit on a share card', async () => {
    const g = await group();
    const res = await request(app)
      .post('/api/players')
      .send({ groupId: g.id, name: 'Ana', nickname: 'x'.repeat(25) });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/24 characters/i);
  });

  it('can be set and cleared on update', async () => {
    const g = await group();
    const created = await request(app).post('/api/players').send({ groupId: g.id, name: 'Ana' });

    const set = await request(app)
      .patch(`/api/players/${created.body.id}`)
      .send({ nickname: 'The Closer' });
    expect(set.body.nickname).toBe('The Closer');

    const cleared = await request(app)
      .patch(`/api/players/${created.body.id}`)
      .send({ nickname: '' });
    expect(cleared.body.nickname).toBeNull();
  });

  it('rides along on session entries so share cards can use it', async () => {
    const g = await group();
    const ana = await request(app)
      .post('/api/players')
      .send({ groupId: g.id, name: 'Ana', nickname: 'The Closer' });
    const dave = await request(app).post('/api/players').send({ groupId: g.id, name: 'Dave' });

    const session = await request(app)
      .post('/api/sessions')
      .send({
        groupId: g.id,
        date: '2026-05-01',
        entries: [
          { playerId: ana.body.id, buyIn: 5, cashOut: 10 },
          { playerId: dave.body.id, buyIn: 5, cashOut: 0 },
        ],
      });

    const detail = await request(app).get(`/api/sessions/${session.body.id}`);
    const entry = detail.body.entries.find((e: any) => e.playerId === ana.body.id);
    expect(entry.player.nickname).toBe('The Closer');
  });

  it('survives a backup round trip without anyone updating the backup code', async () => {
    const g = await group();
    await request(app)
      .post('/api/players')
      .send({ groupId: g.id, name: 'Ana', nickname: 'The Closer' });

    const backup = await request(app).get(`/api/backup/export/${g.id}`);
    await prisma.player.deleteMany();
    await request(app)
      .post('/api/backup/import')
      .send({ backup: backup.body, options: { mode: 'merge', skipDuplicates: false } });

    const restored = await prisma.player.findFirst({ where: { name: 'Ana' } });
    expect(restored?.nickname).toBe('The Closer');
  });
});
