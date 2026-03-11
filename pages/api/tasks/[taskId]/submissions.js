import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  const { taskId } = req.query;
  if (req.method === 'GET') {
    try {
      const submissions = await prisma.submission.findMany({
        where: { taskId: Number(taskId) },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      return res.status(500).json({ error: 'Failed to fetch submissions' });
    }
  } else if (req.method === 'POST') {
    const { content } = req.body;
    try {
      const submission = await prisma.submission.create({
        data: {
          taskId: Number(taskId),
          content,
        },
      });
      return res.status(201).json(submission);
    } catch (error) {
      console.error('Error creating submission:', error);
      return res.status(500).json({ error: 'Failed to create submission' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
