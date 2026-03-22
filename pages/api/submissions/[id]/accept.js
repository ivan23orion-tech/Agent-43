import prisma from '../../../../lib/prisma';
import {
  getCreatorCredentials,
  isTaskCreator,
} from '../../../../lib/task-access';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'POST') {
    try {
      const submission = await prisma.submission.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          task: {
            select: {
              id: true,
              isFree: true,
              creatorKeyHash: true,
            },
          },
        },
      });

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      if (!submission.task.isFree) {
        const { creatorKey } = getCreatorCredentials(req);

        if (!isTaskCreator(submission.task, creatorKey)) {
          return res.status(403).json({ error: 'Credencial do criador inválida para aprovar esta submissão' });
        }
      }

      const approvedSubmission = await prisma.submission.update({
        where: { id: parseInt(id, 10) },
        data: { approved: true },
      });

      return res.status(200).json(approvedSubmission);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to accept submission' });
    }
  }

  res.setHeader('Allow', ['POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
