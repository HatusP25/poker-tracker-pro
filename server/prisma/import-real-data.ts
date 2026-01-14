import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎯 Starting real data import...');

  // Get or create the Friday Night Poker group
  let group = await prisma.group.findFirst({
    where: { name: 'Friday Night Poker' },
  });

  if (!group) {
    group = await prisma.group.create({
      data: {
        name: 'Friday Night Poker',
        defaultBuyIn: 5,
        currency: 'USD',
      },
    });
    console.log('✅ Created group: Friday Night Poker');
  } else {
    console.log('✅ Using existing group: Friday Night Poker');
  }

  // Create or get players
  const playerNames = ['Lucho', 'Hatus', 'Muel', 'Rauw', 'Dylan', 'Yepes'];
  const players: Record<string, any> = {};

  for (const name of playerNames) {
    let player = await prisma.player.findFirst({
      where: {
        groupId: group.id,
        name: name,
      },
    });

    if (!player) {
      player = await prisma.player.create({
        data: {
          groupId: group.id,
          name: name,
          isActive: true,
        },
      });
      console.log(`✅ Created player: ${name}`);
    } else {
      console.log(`✅ Using existing player: ${name}`);
    }

    players[name] = player;
  }

  // Parse the real data
  const sessionsData = [
    // Session 1: 2026-01-04 (Lucho, Hatus, Muel)
    {
      date: new Date('2026-01-04T00:00:00.000Z'),
      entries: [
        { player: 'Lucho', buyIn: 5, cashOut: 50 },
        { player: 'Hatus', buyIn: 35, cashOut: 0 },
        { player: 'Muel', buyIn: 10, cashOut: 0 },
      ],
    },
    // Session 2: 2026-01-03 (Muel, Rauw, Lucho)
    {
      date: new Date('2026-01-03T00:00:00.000Z'),
      entries: [
        { player: 'Muel', buyIn: 15, cashOut: 0 },
        { player: 'Rauw', buyIn: 10, cashOut: 17 },
        { player: 'Lucho', buyIn: 20, cashOut: 28 },
      ],
    },
    // Session 3: 2026-01-08 (Lucho, Hatus, Muel, Dylan, Yepes)
    {
      date: new Date('2026-01-08T00:00:00.000Z'),
      entries: [
        { player: 'Lucho', buyIn: 30, cashOut: 53.70 },
        { player: 'Hatus', buyIn: 5, cashOut: 0 },
        { player: 'Muel', buyIn: 10, cashOut: 0 },
        { player: 'Dylan', buyIn: 10, cashOut: 0 },
        { player: 'Yepes', buyIn: 5, cashOut: 6.30 },
      ],
    },
  ];

  // Delete existing sessions (to avoid duplicates if run multiple times)
  console.log('🗑️  Clearing old seed data...');
  await prisma.sessionEntry.deleteMany({});
  await prisma.session.deleteMany({});

  // Create sessions
  for (const sessionData of sessionsData) {
    const session = await prisma.session.create({
      data: {
        groupId: group.id,
        date: sessionData.date,
        location: 'Home Game',
        notes: 'Imported real data',
      },
    });

    // Create entries for this session
    for (const entryData of sessionData.entries) {
      await prisma.sessionEntry.create({
        data: {
          sessionId: session.id,
          playerId: players[entryData.player].id,
          buyIn: entryData.buyIn,
          cashOut: entryData.cashOut,
        },
      });
    }

    console.log(`✅ Created session for ${sessionData.date.toISOString().split('T')[0]}`);
  }

  console.log('🎉 Real data import complete!');
  console.log('\n📊 Summary:');
  console.log(`- Players: ${playerNames.length}`);
  console.log(`- Sessions: ${sessionsData.length}`);

  // Calculate totals
  const allPlayers = await prisma.player.findMany({
    where: { groupId: group.id },
    include: {
      entries: true,
    },
  });

  console.log('\n💰 Player Balances:');
  for (const player of allPlayers) {
    const totalBuyIn = player.entries.reduce((sum, e) => sum + e.buyIn, 0);
    const totalCashOut = player.entries.reduce((sum, e) => sum + e.cashOut, 0);
    const balance = totalCashOut - totalBuyIn;
    console.log(`   ${player.name}: ${balance >= 0 ? '+' : ''}$${balance.toFixed(2)}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error importing data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
