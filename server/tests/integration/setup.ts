import { beforeEach, afterAll } from 'vitest';
import { prisma } from '../../src/lib/prisma';

// Safety: never run the destructive cleanup against a non-test database.
const url = process.env.DATABASE_URL || '';
if (!/test/i.test(url)) {
  throw new Error(
    `Refusing to run integration tests: DATABASE_URL does not look like a test DB (${url})`
  );
}

// Reset all tables before each test for deterministic state.
beforeEach(async () => {
  // Order respects FK constraints (children first).
  await prisma.rebuyEvent.deleteMany();
  await prisma.sessionEntry.deleteMany();
  await prisma.playerNote.deleteMany();
  await prisma.sessionTemplate.deleteMany();
  await prisma.session.deleteMany();
  await prisma.player.deleteMany();
  await prisma.group.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
