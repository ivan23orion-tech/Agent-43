import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'POST') {
    try {
      const submission = await prisma.submission.update({
        where: { id: parseInt(id) },
        data: { approved: true },
      });
      res.status(200).json(submission);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to accept submission' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
