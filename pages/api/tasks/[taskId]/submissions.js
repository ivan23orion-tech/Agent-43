import prisma from '../../../../lib/prisma';
import {
  getCreatorCredentials,
  isTaskCreator,
} from '../../../../lib/task-access';

export default async function handler(req, res) {
  const { taskId } = req.query;

  if (req.method === 'GET') {
    try {
      const task = await prisma.task.findUnique({
        where: { id: Number(taskId) },
        select: {
          id: true,
          isFree: true,
          creatorKeyHash: true,
          submissions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      if (!task.isFree) {
        const { creatorKey } = getCreatorCredentials(req);

        if (!isTaskCreator(task, creatorKey)) {
          return res.status(403).json({ error: 'Credencial do criador inválida para listar submissões desta tarefa paga' });
        }
      }

      return res.status(200).json(task.submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      return res.status(500).json({ error: 'Failed to fetch submissions' });
    }
  }

  if (req.method === 'POST') {
    const { content } = req.body;
    try {
      const task = await prisma.task.findUnique({
        where: { id: Number(taskId) },
        select: { id: true },
      });

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const submission = await prisma.submission.create({
        data: {
          taskId: Number(taskId),
          content,
        },
      });
      return res.status(201).json(submission);
    } catch (error) {
      console.error('Error creating submission:', error);
      return res.status(500).json({ error: 'Failed to create submission' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
