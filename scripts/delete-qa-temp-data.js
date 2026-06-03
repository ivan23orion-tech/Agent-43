const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  if (!process.env.POSTGRES_PRISMA_URL) {
    console.log('Skipping QA temp data cleanup: POSTGRES_PRISMA_URL not set');
    return;
  }

  const qaTasks = await prisma.task.findMany({
    where: {
      title: {
        startsWith: '[QA TEMP]',
      },
    },
    select: { id: true },
  });

  const taskIds = qaTasks.map((task) => task.id);

  if (taskIds.length === 0) {
    console.log('No QA temp tasks found to clean up.');
    return;
  }

  const deletedSubmissions = await prisma.submission.deleteMany({
    where: {
      taskId: { in: taskIds },
    },
  });

  const deletedTasks = await prisma.task.deleteMany({
    where: {
      id: { in: taskIds },
    },
  });

  console.log(
    `Deleted ${deletedSubmissions.count} QA temp submissions and ${deletedTasks.count} QA temp tasks.`,
  );
}

main()
  .catch((error) => {
    console.error('Failed to clean up QA temp data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
