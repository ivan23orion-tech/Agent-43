import prisma from '../../../../lib/prisma';
import { parsePositiveIntId } from '../../../../lib/api-validation';
import { requireAdmin } from '../../../../lib/admin-auth';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  const taskId = parsePositiveIntId(req.query.taskId);

  if (!taskId) {
    return res.status(400).json({ error: 'ID da tarefa inválido' });
  }

  if (req.method === 'DELETE') {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true, title: true },
      });

      if (!task) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
      }

      const result = await prisma.$transaction(async (transaction) => {
        const deletedSubmissions = await transaction.submission.deleteMany({
          where: { taskId },
        });

        await transaction.task.delete({
          where: { id: taskId },
        });

        return { deletedSubmissions: deletedSubmissions.count };
      });

      return res.status(200).json({
        deletedTask: task,
        deletedSubmissions: result.deletedSubmissions,
      });
    } catch (error) {
      console.error('Error deleting admin task:', error);
      return res.status(500).json({ error: 'Falha ao apagar tarefa' });
    }
  }

  res.setHeader('Allow', ['DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
