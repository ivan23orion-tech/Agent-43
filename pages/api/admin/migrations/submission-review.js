import prisma from '../../../../lib/prisma';
import { requireAdmin } from '../../../../lib/admin-auth';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "reviewStatus" TEXT NOT NULL DEFAULT \'PENDING\'');
    await prisma.$executeRawUnsafe('ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT');
    await prisma.$executeRawUnsafe('UPDATE "Submission" SET "reviewStatus" = CASE WHEN approved = true THEN \'ACCEPTED\' ELSE \'PENDING\' END WHERE "reviewStatus" = \'PENDING\'');

    return res.status(200).json({ migrated: true });
  } catch (error) {
    console.error('Error running submission review migration:', error);
    return res.status(500).json({ error: 'Falha ao migrar revisão de submissões' });
  }
}
