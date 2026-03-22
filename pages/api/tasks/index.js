import prisma from '../../../lib/prisma';

const FREE_TASK_DURATION_DAYS = 3;
const ALLOWED_REWARD_CURRENCIES = ['USDT', 'USDC'];

function getFreeTaskExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + FREE_TASK_DURATION_DAYS);
  return expiresAt;
}

function parseRewardAmount(value) {
  if (value === null || value === '' || value === undefined) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
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
    const { title, description, rewardAmount, rewardCurrency, isFree } = req.body;
    const isTaskFree = isFree === true || isFree === 'true';
    const parsedRewardAmount = parseRewardAmount(rewardAmount);
    const normalizedRewardCurrency = typeof rewardCurrency === 'string'
      ? rewardCurrency.toUpperCase()
      : null;

    if (isTaskFree) {
      try {
        const task = await prisma.task.create({
          data: {
            title,
            description,
            isFree: true,
            rewardAmount: null,
            rewardCurrency: null,
            expiresAt: getFreeTaskExpiryDate(),
          },
        });
        return res.status(201).json(task);
      } catch (error) {
        console.error('Error creating task:', error);
        return res.status(500).json({ error: 'Failed to create task' });
      }
    }

    if (parsedRewardAmount === null) {
      return res.status(400).json({ error: 'Tarefas pagas exigem rewardAmount inteiro positivo' });
    }

    if (!ALLOWED_REWARD_CURRENCIES.includes(normalizedRewardCurrency)) {
      return res.status(400).json({ error: 'Tarefas pagas exigem rewardCurrency em USDT ou USDC' });
    }

    try {
      const task = await prisma.task.create({
        data: {
          title,
          description,
          isFree: false,
          rewardAmount: parsedRewardAmount,
          rewardCurrency: normalizedRewardCurrency,
          expiresAt: null,
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
