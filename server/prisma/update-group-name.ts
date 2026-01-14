import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📝 Updating group name...');

  const group = await prisma.group.findFirst({
    where: { name: 'Friday Night Poker' },
  });

  if (!group) {
    console.log('❌ Group not found');
    return;
  }

  await prisma.group.update({
    where: { id: group.id },
    data: { name: '4 of a kind' },
  });

  console.log('✅ Group name updated to "4 of a kind"');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
