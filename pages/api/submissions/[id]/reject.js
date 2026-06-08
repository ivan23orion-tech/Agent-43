import prisma from '../../../../lib/prisma';
import { parsePositiveIntId } from '../../../../lib/api-validation';
import { isAdminRequest } from '../../../../lib/admin-auth';
import {
  getCreatorCredentials,
  isTaskCreator,
  normalizeOptionalString,
} from '../../../../lib/task-access';

const MAX_REVIEW_NOTE_LENGTH = 1000;

function canReviewSubmission(req, task) {
  if (isAdminRequest(req)) {
    return true;
  }

  const { creatorKey } = getCreatorCredentials(req);
  return isTaskCreator(task, creatorKey);
}

function parseReviewNote(value) {
  const note = normalizeOptionalString(value);

  if (!note) {
    return { value: null };
  }

  if (note.length > MAX_REVIEW_NOTE_LENGTH) {
    return { error: `Motivo deve ter no máximo ${MAX_REVIEW_NOTE_LENGTH} caracteres` };
  }

  return { value: note };
}

export default async function handler(req, res) {
  const submissionId = parsePositiveIntId(req.query.id);

  if (!submissionId) {
    return res.status(400).json({ error: 'ID da submissão inválido' });
  }

  if (req.method === 'POST') {
    const reviewNote = parseReviewNote(req.body?.reviewNote);

    if (reviewNote.error) {
      return res.status(400).json({ error: reviewNote.error });
    }

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

      const rejectedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          approved: false,
          reviewStatus: 'REJECTED',
          reviewNote: reviewNote.value,
        },
      });

      return res.status(200).json(rejectedSubmission);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to reject submission' });
    }
  }

  res.setHeader('Allow', ['POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
