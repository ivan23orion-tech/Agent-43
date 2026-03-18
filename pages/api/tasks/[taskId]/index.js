import prisma from '../../../../lib/prisma';

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
      return res.status(200).json(task);
    } catch (error) {
      console.error('Error fetching task:', error);
      return res.status(500).json({ error: 'Failed to fetch task' });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
