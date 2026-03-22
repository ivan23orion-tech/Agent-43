import prisma from '../../../../lib/prisma';
import {
  getCreatorCredentials,
  isTaskCreator,
  serializeTask,
} from '../../../../lib/task-access';

export default async function handler(req, res) {
  const { taskId } = req.query;

  if (req.method === 'GET') {
    try {
      const task = await prisma.task.findFirst({
        where: {
          id: Number(taskId),
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        include: { submissions: true },
      });

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      if (task.isFree) {
        return res.status(200).json(serializeTask(task, { includeSubmissions: true }));
      }

      const { creatorKey } = getCreatorCredentials(req);
      const isCreator = isTaskCreator(task, creatorKey);

      return res.status(200).json({
        ...serializeTask(task, { includeSubmissions: isCreator }),
        creatorAuthenticated: isCreator,
        submissionsPrivate: !isCreator,
      });
    } catch (error) {
      console.error('Error fetching task:', error);
      return res.status(500).json({ error: 'Failed to fetch task' });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
