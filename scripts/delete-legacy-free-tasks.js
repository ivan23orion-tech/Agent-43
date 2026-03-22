const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DEFAULT_CUTOFF = '2026-03-17T23:18:28.000Z';

function getLegacyFilter() {
  const createdBefore = process.env.LEGACY_FREE_TASKS_CREATED_BEFORE || DEFAULT_CUTOFF;
  const parsedCreatedBefore = new Date(createdBefore);

  if (Number.isNaN(parsedCreatedBefore.getTime())) {
    throw new Error(
      `Invalid LEGACY_FREE_TASKS_CREATED_BEFORE value: ${createdBefore}`,
    );
  }

  return {
    isFree: true,
    expiresAt: null,
    createdAt: {
      lt: parsedCreatedBefore,
    },
  };
}

async function main() {
  if (!process.env.POSTGRES_PRISMA_URL) {
    throw new Error(
      'Missing POSTGRES_PRISMA_URL. Run this script only in the environment connected to the target database.',
    );
  }

  const where = getLegacyFilter();

  console.log('Removing legacy free tasks with filter:', {
    ...where,
    createdAt: {
      lt: where.createdAt.lt.toISOString(),
    },
  });

  const totalToDelete = await prisma.task.count({ where });
  console.log(`Found ${totalToDelete} legacy free task(s) to delete.`);

  if (totalToDelete === 0) {
    console.log('No legacy free tasks found. Nothing to delete.');
    return;
  }

  const deleted = await prisma.task.deleteMany({ where });
  console.log(`Deleted ${deleted.count} legacy free task(s).`);
}

main()
  .catch((error) => {
    console.error('Failed to delete legacy free tasks:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
