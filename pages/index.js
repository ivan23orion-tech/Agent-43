import Link from 'next/link';
import prisma from '../lib/prisma';

export async function getServerSideProps() {
  const tasks = await prisma.task.findMany({
    orderBy: { id: 'desc' },
  });
  return {
    props: { tasks: JSON.parse(JSON.stringify(tasks)) },
  };
}

export default function Home({ tasks }) {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Tasks</h1>
      <Link href="/new">Create New Task</Link>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            <Link href={`/task/${task.id}`}>{task.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
