const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  if (!process.env.POSTGRES_PRISMA_URL) {
    console.log('Skipping test data reset: POSTGRES_PRISMA_URL not set');
    return;
  }

  const deletedSubmissions = await prisma.submission.deleteMany({});
  const deletedTasks = await prisma.task.deleteMany({});

  console.log(
    `Deleted ${deletedSubmissions.count} submissions and ${deletedTasks.count} tasks from test data reset.`,
  );
}

main()
  .catch((error) => {
    console.error('Failed to reset test data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
