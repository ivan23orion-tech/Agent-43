import prisma from '../../../../lib/prisma';
import { requireAdmin } from '../../../../lib/admin-auth';
import { serializeTask } from '../../../../lib/task-access';

function getTaskStatus(task) {
  if (task.expiresAt && new Date(task.expiresAt) <= new Date()) {
    return 'expired';
  }

  return 'active';
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  if (req.method === 'GET') {
    try {
      const tasks = await prisma.task.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { submissions: true } },
        },
      });

      return res.status(200).json({
        tasks: tasks.map((task) => ({
          ...serializeTask(task),
          status: getTaskStatus(task),
          submissionCount: task._count.submissions,
        })),
      });
    } catch (error) {
      console.error('Error fetching admin tasks:', error);
      return res.status(500).json({ error: 'Falha ao carregar tarefas do admin' });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
