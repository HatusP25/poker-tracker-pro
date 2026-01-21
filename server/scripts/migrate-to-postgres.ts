import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const BACKUP_FILE = path.join(__dirname, '..', 'backup-for-migration.json');

async function exportData() {
  console.log('📦 Starting SQLite data export...');

  const sqlite = new PrismaClient();

  try {
    const groups = await sqlite.group.findMany({
      include: {
        players: {
          include: {
            entries: true,
            notes: true
          }
        },
        sessions: {
          include: {
            entries: {
              include: {
                player: true
              }
            }
          }
        },
        templates: true
      }
    });

    await sqlite.$disconnect();

    // Save to JSON file
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(groups, null, 2));
    console.log(`✅ Data exported successfully to: ${BACKUP_FILE}`);
    console.log(`📊 Exported ${groups.length} group(s) with all related data`);
  } catch (error) {
    console.error('❌ Export failed:', error);
    await sqlite.$disconnect();
    process.exit(1);
  }
}

async function importData() {
  console.log('📥 Starting PostgreSQL data import...');

  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`❌ Backup file not found: ${BACKUP_FILE}`);
    console.log('Run export first: tsx scripts/migrate-to-postgres.ts export');
    process.exit(1);
  }

  const postgres = new PrismaClient();

  try {
    const groups = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
    console.log(`📂 Found ${groups.length} group(s) to import`);

    for (const group of groups) {
      const { players, sessions, templates, ...groupData } = group;

      console.log(`\n📁 Importing group: ${group.name}`);

      // Create group
      const newGroup = await postgres.group.create({
        data: {
          id: groupData.id,
          name: groupData.name,
          defaultBuyIn: groupData.defaultBuyIn,
          currency: groupData.currency,
          createdAt: new Date(groupData.createdAt),
          updatedAt: new Date(groupData.updatedAt)
        }
      });
      console.log(`  ✓ Group created`);

      // Create players
      const playerIdMap = new Map(); // Old ID -> New Player
      for (const player of players) {
        const { entries, notes, ...playerData } = player;
        const newPlayer = await postgres.player.create({
          data: {
            id: playerData.id,
            groupId: newGroup.id,
            name: playerData.name,
            avatarUrl: playerData.avatarUrl,
            isActive: playerData.isActive,
            createdAt: new Date(playerData.createdAt),
            updatedAt: new Date(playerData.updatedAt)
          }
        });
        playerIdMap.set(player.id, newPlayer);

        // Create player notes
        for (const note of notes) {
          await postgres.playerNote.create({
            data: {
              id: note.id,
              playerId: newPlayer.id,
              content: note.content,
              createdAt: new Date(note.createdAt),
              updatedAt: new Date(note.updatedAt)
            }
          });
        }
      }
      console.log(`  ✓ ${players.length} player(s) imported`);

      // Create sessions
      for (const session of sessions) {
        const { entries, ...sessionData } = session;
        const newSession = await postgres.session.create({
          data: {
            id: sessionData.id,
            groupId: newGroup.id,
            date: sessionData.date,
            startTime: sessionData.startTime,
            endTime: sessionData.endTime,
            location: sessionData.location,
            notes: sessionData.notes,
            photoUrls: sessionData.photoUrls,
            deletedAt: sessionData.deletedAt ? new Date(sessionData.deletedAt) : null,
            createdAt: new Date(sessionData.createdAt),
            updatedAt: new Date(sessionData.updatedAt)
          }
        });

        // Create session entries
        for (const entry of entries) {
          await postgres.sessionEntry.create({
            data: {
              id: entry.id,
              sessionId: newSession.id,
              playerId: entry.playerId,
              buyIn: entry.buyIn,
              cashOut: entry.cashOut,
              createdAt: new Date(entry.createdAt),
              updatedAt: new Date(entry.updatedAt)
            }
          });
        }
      }
      console.log(`  ✓ ${sessions.length} session(s) imported`);

      // Create templates
      for (const template of templates) {
        await postgres.sessionTemplate.create({
          data: {
            id: template.id,
            groupId: newGroup.id,
            name: template.name,
            location: template.location,
            defaultTime: template.defaultTime,
            playerIds: template.playerIds,
            createdAt: new Date(template.createdAt),
            updatedAt: new Date(template.updatedAt)
          }
        });
      }
      console.log(`  ✓ ${templates.length} template(s) imported`);
    }

    await postgres.$disconnect();
    console.log('\n🎉 Migration completed successfully!');
    console.log('💡 You can now delete the SQLite database and backup file if desired');
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    await postgres.$disconnect();
    process.exit(1);
  }
}

// Run export or import based on command line argument
const command = process.argv[2];

if (command === 'export') {
  exportData();
} else if (command === 'import') {
  importData();
} else {
  console.log('Usage: tsx migrate-to-postgres.ts [export|import]');
  console.log('');
  console.log('Commands:');
  console.log('  export  - Export data from SQLite to JSON file');
  console.log('  import  - Import data from JSON file to PostgreSQL');
  console.log('');
  console.log('Example workflow:');
  console.log('  1. DATABASE_URL="file:./data/poker.db" tsx migrate-to-postgres.ts export');
  console.log('  2. Update schema.prisma to use PostgreSQL');
  console.log('  3. DATABASE_URL="postgresql://..." tsx migrate-to-postgres.ts import');
  process.exit(1);
}
