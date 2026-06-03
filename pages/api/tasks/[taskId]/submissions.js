import prisma from '../../../../lib/prisma';
import {
  MAX_SUBMISSION_CONTENT_LENGTH,
  parsePositiveIntId,
  validateRequiredText,
} from '../../../../lib/api-validation';
import {
  getCreatorCredentials,
  isTaskCreator,
} from '../../../../lib/task-access';

function activeTaskWhere(taskId) {
  return {
    id: taskId,
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ],
  };
}

export default async function handler(req, res) {
  const taskId = parsePositiveIntId(req.query.taskId);

  if (!taskId) {
    return res.status(400).json({ error: 'ID da tarefa inválido' });
  }

  if (req.method === 'GET') {
    try {
      const task = await prisma.task.findFirst({
        where: activeTaskWhere(taskId),
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
        return res.status(404).json({ error: 'Tarefa não encontrada' });
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
    const validatedContent = validateRequiredText(
      req.body?.content,
      'Conteúdo da submissão',
      MAX_SUBMISSION_CONTENT_LENGTH,
    );

    if (validatedContent.error) {
      return res.status(400).json({ error: validatedContent.error });
    }

    try {
      const task = await prisma.task.findFirst({
        where: activeTaskWhere(taskId),
        select: { id: true },
      });

      if (!task) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
      }

      const submission = await prisma.submission.create({
        data: {
          taskId,
          content: validatedContent.value,
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
