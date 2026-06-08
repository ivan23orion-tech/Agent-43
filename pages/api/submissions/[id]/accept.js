import prisma from '../../../../lib/prisma';
import { parsePositiveIntId } from '../../../../lib/api-validation';
import { isAdminRequest } from '../../../../lib/admin-auth';
import {
  getCreatorCredentials,
  isTaskCreator,
} from '../../../../lib/task-access';

function canReviewSubmission(req, task) {
  if (isAdminRequest(req)) {
    return true;
  }

  const { creatorKey } = getCreatorCredentials(req);
  return isTaskCreator(task, creatorKey);
}

export default async function handler(req, res) {
  const submissionId = parsePositiveIntId(req.query.id);

  if (!submissionId) {
    return res.status(400).json({ error: 'ID da submissão inválido' });
  }

  if (req.method === 'POST') {
    try {
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
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
        return res.status(404).json({ error: 'Submissão não encontrada' });
      }

      if (!canReviewSubmission(req, submission.task)) {
        return res.status(403).json({ error: 'Credencial inválida para revisar esta submissão' });
      }

      const approvedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          approved: true,
          reviewStatus: 'ACCEPTED',
          reviewNote: null,
        },
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
