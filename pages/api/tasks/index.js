import prisma from '../../../lib/prisma';

const FREE_TASK_DURATION_DAYS = 3;

function getFreeTaskExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + FREE_TASK_DURATION_DAYS);
  return expiresAt;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const tasks = await prisma.task.findMany({
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: { submissions: true },
      });
      return res.status(200).json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  }

  if (req.method === 'POST') {
    const { title, description, reward, isFree } = req.body;
    const isTaskFree = isFree === true || isFree === "true";
    const numericReward = reward !== null && reward !== '' && reward !== undefined ? parseFloat(reward) : null;

    if (!isTaskFree && (!numericReward || Number.isNaN(numericReward) || numericReward <= 0)) {
      return res.status(400).json({ error: 'Preço obrigatório para tarefas pagas' });
    }

    try {
      const task = await prisma.task.create({
        data: {
          title,
          description,
          isFree: isTaskFree,
          reward: isTaskFree ? null : numericReward,
          expiresAt: isTaskFree ? getFreeTaskExpiryDate() : null,
        },
      });
      return res.status(201).json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      return res.status(500).json({ error: 'Failed to create task' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
