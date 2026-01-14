import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying imported data...\n');

  const sessions = await prisma.session.findMany({
    include: {
      entries: {
        include: {
          player: true,
        },
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  console.log('📊 Sessions found:', sessions.length);
  console.log('');

  for (const session of sessions) {
    const date = session.date.toISOString().split('T')[0];
    console.log(`\n📅 Session: ${date}`);
    console.log('─'.repeat(60));

    for (const entry of session.entries) {
      const profit = entry.cashOut - entry.buyIn;
      console.log(
        `${entry.player.name.padEnd(10)} | Buy-in: $${entry.buyIn.toFixed(2).padStart(6)} | Cash-out: $${entry.cashOut.toFixed(2).padStart(6)} | Profit: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`
      );
    }

    const totalBuyIn = session.entries.reduce((sum, e) => sum + e.buyIn, 0);
    const totalCashOut = session.entries.reduce((sum, e) => sum + e.cashOut, 0);
    console.log('─'.repeat(60));
    console.log(`Total Buy-in: $${totalBuyIn.toFixed(2)} | Total Cash-out: $${totalCashOut.toFixed(2)} | Balanced: ${Math.abs(totalBuyIn - totalCashOut) < 0.01 ? '✅' : '❌'}`);
  }

  console.log('\n\n💰 Player Summary:');
  console.log('─'.repeat(60));

  const players = await prisma.player.findMany({
    include: {
      entries: true,
    },
  });

  for (const player of players) {
    const totalBuyIn = player.entries.reduce((sum, e) => sum + e.buyIn, 0);
    const totalCashOut = player.entries.reduce((sum, e) => sum + e.cashOut, 0);
    const balance = totalCashOut - totalBuyIn;
    const games = player.entries.length;

    console.log(
      `${player.name.padEnd(10)} | Games: ${games} | Buy-in: $${totalBuyIn.toFixed(2).padStart(6)} | Cash-out: $${totalCashOut.toFixed(2).padStart(6)} | Balance: ${balance >= 0 ? '+' : ''}$${balance.toFixed(2)}`
    );
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
