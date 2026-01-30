import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const main = async () => {
  console.log('🌱 Starting database seed...');

  // Clear existing data (in development)
  await prisma.sessionEntry.deleteMany();
  await prisma.session.deleteMany();
  await prisma.playerNote.deleteMany();
  await prisma.player.deleteMany();
  await prisma.group.deleteMany();

  console.log('🗑️  Cleared existing data');

  // Create a poker group
  const group = await prisma.group.create({
    data: {
      name: 'Friday Night Poker',
      defaultBuyIn: 5.0,
      currency: 'USD',
    },
  });

  console.log(`✅ Created group: ${group.name}`);

  // Create 4 players with different profiles
  const lucho = await prisma.player.create({
    data: {
      groupId: group.id,
      name: 'Lucho',
      isActive: true,
    },
  });

  const rauw = await prisma.player.create({
    data: {
      groupId: group.id,
      name: 'Rauw',
      isActive: true,
    },
  });

  const muel = await prisma.player.create({
    data: {
      groupId: group.id,
      name: 'Muel',
      isActive: true,
    },
  });

  const hatus = await prisma.player.create({
    data: {
      groupId: group.id,
      name: 'Hatus',
      isActive: true,
    },
  });

  console.log(`✅ Created 4 players: ${lucho.name}, ${rauw.name}, ${muel.name}, ${hatus.name}`);

  // Helper function to create balanced sessions
  const createSession = async (
    date: string,
    entries: Array<{ player: any; buyIn: number; cashOut: number }>,
    location?: string,
    notes?: string
  ) => {
    const sessionDate = new Date(date);

    const session = await prisma.session.create({
      data: {
        groupId: group.id,
        date: sessionDate,
        location,
        notes,
        entries: {
          create: entries.map(e => ({
            playerId: e.player.id,
            buyIn: e.buyIn,
            cashOut: e.cashOut,
          })),
        },
      },
      include: {
        entries: {
          include: {
            player: true,
          },
        },
      },
    });

    return session;
  };

  // Session 1: Most Recent (Jan 25, 2026) - Sets up for next session to create streak
  await createSession(
    '2026-01-25',
    [
      { player: lucho, buyIn: 5, cashOut: 25 },  // +20 (win)
      { player: rauw, buyIn: 10, cashOut: 5 },   // -5 (loss)
      { player: muel, buyIn: 15, cashOut: 0 },   // -15 (loss with rebuy)
    ],
    'Home',
    'Lucho on a hot streak!'
  );

  // Session 2: Jan 18, 2026 - Building streaks
  await createSession(
    '2026-01-18',
    [
      { player: lucho, buyIn: 5, cashOut: 20 },  // +15 (win - streak building)
      { player: rauw, buyIn: 10, cashOut: 5 },   // -5 (loss - streak building)
      { player: muel, buyIn: 5, cashOut: 10 },   // +5 (win)
      { player: hatus, buyIn: 10, cashOut: 0 },  // -10 (loss)
    ],
    'Garage',
    'Lucho keeps winning!'
  );

  // Session 3: Jan 11, 2026 - More streak setup
  await createSession(
    '2026-01-11',
    [
      { player: lucho, buyIn: 10, cashOut: 30 },  // +20 (win - 3rd in row!)
      { player: rauw, buyIn: 5, cashOut: 0 },     // -5 (loss - 3rd in row!)
      { player: muel, buyIn: 15, cashOut: 0 },    // -15 (loss)
    ],
    'Home'
  );

  // Session 4: Jan 4, 2026
  await createSession(
    '2026-01-04',
    [
      { player: lucho, buyIn: 5, cashOut: 50 },  // +45 (big win - 4th in row!)
      { player: hatus, buyIn: 35, cashOut: 0 },  // -35 (multiple rebuys, big loss)
      { player: muel, buyIn: 10, cashOut: 0 },   // -10 (1 rebuy)
    ],
    'Home',
    'Lucho dominated this session'
  );

  // Session 5: Jan 3, 2026
  await createSession(
    '2026-01-03',
    [
      { player: muel, buyIn: 15, cashOut: 0 },   // -15
      { player: rauw, buyIn: 10, cashOut: 17 },  // +7
      { player: lucho, buyIn: 20, cashOut: 28 }, // +8 (win - 5th in row!)
    ],
    'Home',
    'Close game, Lucho and Rauw split'
  );

  // Session 3: December 28, 2025
  await createSession(
    '2025-12-28',
    [
      { player: lucho, buyIn: 10, cashOut: 30 },  // +20
      { player: rauw, buyIn: 15, cashOut: 5 },    // -10
      { player: muel, buyIn: 10, cashOut: 0 },    // -10
      { player: hatus, buyIn: 5, cashOut: 0 },    // -5 (occasional player)
    ],
    'Home'
  );

  // Session 4: December 21, 2025
  await createSession(
    '2025-12-21',
    [
      { player: rauw, buyIn: 5, cashOut: 20 },    // +15 (Rauw wins)
      { player: muel, buyIn: 10, cashOut: 0 },    // -10
      { player: lucho, buyIn: 5, cashOut: 0 },    // -5 (Lucho has a bad night)
    ],
    'Garage'
  );

  // Session 5: December 14, 2025
  await createSession(
    '2025-12-14',
    [
      { player: lucho, buyIn: 15, cashOut: 25 },  // +10
      { player: rauw, buyIn: 10, cashOut: 10 },   // 0 (break even)
      { player: muel, buyIn: 5, cashOut: 0 },     // -5
      { player: hatus, buyIn: 10, cashOut: 5 },   // -5
    ],
    'Home'
  );

  // Session 6: December 7, 2025
  await createSession(
    '2025-12-07',
    [
      { player: muel, buyIn: 5, cashOut: 25 },    // +20 (Muel's big win!)
      { player: lucho, buyIn: 10, cashOut: 5 },   // -5
      { player: rauw, buyIn: 10, cashOut: 0 },    // -10
    ],
    'Home',
    'Muel finally got a big win!'
  );

  // Session 7: November 30, 2025
  await createSession(
    '2025-11-30',
    [
      { player: lucho, buyIn: 20, cashOut: 30 },  // +10 (2 rebuys)
      { player: rauw, buyIn: 5, cashOut: 5 },     // 0
      { player: muel, buyIn: 15, cashOut: 5 },    // -10
      { player: hatus, buyIn: 5, cashOut: 5 },    // 0
    ],
    'Garage'
  );

  // Session 8: November 23, 2025
  await createSession(
    '2025-11-23',
    [
      { player: rauw, buyIn: 10, cashOut: 20 },   // +10
      { player: lucho, buyIn: 5, cashOut: 5 },    // 0
      { player: muel, buyIn: 5, cashOut: 0 },     // -5
    ],
    'Home'
  );

  // Session 9: November 16, 2025
  await createSession(
    '2025-11-16',
    [
      { player: lucho, buyIn: 25, cashOut: 40 },  // +15 (4 rebuys but won)
      { player: rauw, buyIn: 10, cashOut: 10 },   // 0
      { player: muel, buyIn: 10, cashOut: 0 },    // -10
      { player: hatus, buyIn: 5, cashOut: 0 },    // -5
    ],
    'Home'
  );

  // Session 10: November 9, 2025
  await createSession(
    '2025-11-09',
    [
      { player: muel, buyIn: 10, cashOut: 15 },   // +5
      { player: rauw, buyIn: 15, cashOut: 15 },   // 0
      { player: lucho, buyIn: 5, cashOut: 0 },    // -5
    ],
    'Garage'
  );

  // Session 11: November 2, 2025
  await createSession(
    '2025-11-02',
    [
      { player: lucho, buyIn: 15, cashOut: 30 },  // +15
      { player: muel, buyIn: 10, cashOut: 5 },    // -5
      { player: rauw, buyIn: 10, cashOut: 5 },    // -5
    ],
    'Home'
  );

  // Session 12: October 26, 2025 - Slightly unbalanced for testing
  await createSession(
    '2025-10-26',
    [
      { player: lucho, buyIn: 10, cashOut: 18 },  // +8
      { player: rauw, buyIn: 5, cashOut: 2 },     // -3
      { player: muel, buyIn: 5, cashOut: 0 },     // -5
      { player: hatus, buyIn: 5, cashOut: 5 },    // 0
    ],
    'Home',
    'Note: This session has a small imbalance for testing'
  );

  console.log('✅ Created 15 sessions spanning 3 months');
  console.log('   📈 Lucho has a 5-game win streak going into the next session!');
  console.log('   📉 Rauw has a 3-game loss streak going into the next session!');

  // Add some player notes
  await prisma.playerNote.create({
    data: {
      playerId: lucho.id,
      note: 'Aggressive player, likes to bluff. Strong at reading opponents.',
      tags: JSON.stringify(['aggressive', 'bluffer', 'experienced']),
    },
  });

  await prisma.playerNote.create({
    data: {
      playerId: muel.id,
      note: 'Conservative player, tends to fold early. Improving over time.',
      tags: JSON.stringify(['conservative', 'beginner']),
    },
  });

  console.log('✅ Added player notes');

  // Calculate and display summary stats
  const sessions = await prisma.session.findMany({
    include: {
      entries: {
        include: {
          player: true,
        },
      },
    },
  });

  console.log('\n📊 Seed Summary:');
  console.log(`   Total Sessions: ${sessions.length}`);
  console.log(`   Total Players: 4 (Lucho, Rauw, Muel, Hatus)`);
  console.log(`   Date Range: Oct 26, 2025 - Jan 4, 2026`);

  // Calculate player stats
  const playerStats = [lucho, rauw, muel, hatus].map(player => {
    const entries = sessions.flatMap(s => s.entries).filter(e => e.playerId === player.id);
    const totalBuyIn = entries.reduce((sum, e) => sum + e.buyIn, 0);
    const totalCashOut = entries.reduce((sum, e) => sum + e.cashOut, 0);
    const profit = totalCashOut - totalBuyIn;

    return {
      name: player.name,
      games: entries.length,
      profit,
    };
  });

  console.log('\n🎯 Player Summaries:');
  playerStats.forEach(stat => {
    const profitStr = stat.profit >= 0 ? `+$${stat.profit}` : `-$${Math.abs(stat.profit)}`;
    console.log(`   ${stat.name}: ${stat.games} games, ${profitStr}`);
  });

  console.log('\n🎉 Database seeded successfully!');
};

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
