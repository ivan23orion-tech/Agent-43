import crypto from 'crypto';
import prisma from '../../../lib/prisma';

const FREE_TASK_DURATION_DAYS = 3;
const ALLOWED_REWARD_CURRENCIES = ['USDT', 'USDC'];
const CREATOR_KEY_HEADER_NAMES = ['x-creator-key', 'creator-key'];
const CREATOR_LABEL_HEADER_NAMES = ['x-creator-label', 'creator-label'];

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

function readHeaderValue(req, headerNames) {
  for (const headerName of headerNames) {
    const value = req.headers[headerName];

    if (Array.isArray(value)) {
      const firstNonEmptyValue = value.find((headerValue) => typeof headerValue === 'string' && headerValue.trim());
      if (firstNonEmptyValue) {
        return firstNonEmptyValue.trim();
      }
      continue;
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function getCreatorCredentials(req) {
  const creatorKey = normalizeOptionalString(req.body?.creatorKey)
    ?? readHeaderValue(req, CREATOR_KEY_HEADER_NAMES);
  const creatorLabel = normalizeOptionalString(req.body?.creatorLabel)
    ?? readHeaderValue(req, CREATOR_LABEL_HEADER_NAMES);

  return { creatorKey, creatorLabel };
}

function hashCreatorKey(creatorKey) {
  return crypto.createHash('sha256').update(creatorKey).digest('hex');
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
            creatorKeyHash: null,
            creatorLabel: null,
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

    const { creatorKey, creatorLabel } = getCreatorCredentials(req);

    if (!creatorKey) {
      return res.status(400).json({
        error: 'Tarefas pagas exigem creatorKey via header HTTP ou campo separado',
      });
    }

    try {
      const task = await prisma.task.create({
        data: {
          title,
          description,
          isFree: false,
          rewardAmount: parsedRewardAmount,
          rewardCurrency: normalizedRewardCurrency,
          creatorKeyHash: hashCreatorKey(creatorKey),
          creatorLabel,
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
