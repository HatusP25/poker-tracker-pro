import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const verify = async () => {
  const groups = await prisma.group.count();
  const players = await prisma.player.count();
  const sessions = await prisma.session.count();
  const entries = await prisma.sessionEntry.count();
  const notes = await prisma.playerNote.count();

  console.log('\n✅ Database Verification:');
  console.log(`   Groups: ${groups}`);
  console.log(`   Players: ${players}`);
  console.log(`   Sessions: ${sessions}`);
  console.log(`   Session Entries: ${entries}`);
  console.log(`   Player Notes: ${notes}`);

  // Get sample session data
  const sampleSession = await prisma.session.findFirst({
    include: {
      entries: {
        include: {
          player: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  if (sampleSession) {
    console.log('\n📅 Most Recent Session:');
    console.log(`   Date: ${sampleSession.date.toISOString().split('T')[0]}`);
    console.log(`   Location: ${sampleSession.location || 'N/A'}`);
    console.log(`   Players: ${sampleSession.entries.length}`);
    console.log('\n   Results:');
    sampleSession.entries.forEach(entry => {
      const profit = entry.cashOut - entry.buyIn;
      const profitStr = profit >= 0 ? `+$${profit}` : `-$${Math.abs(profit)}`;
      console.log(`     ${entry.player.name}: $${entry.buyIn} → $${entry.cashOut} (${profitStr})`);
    });
  }
};

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
