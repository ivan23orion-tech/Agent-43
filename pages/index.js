import Link from 'next/link';
import prisma from '../lib/prisma';

export async function getServerSideProps() {
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: { id: 'desc' },
  });

  return {
    props: { tasks: JSON.parse(JSON.stringify(tasks)) },
  };
}

function formatTaskType(task) {
  if (task.isFree) {
    if (!task.expiresAt) return 'Gratuita';
    const expiry = new Date(task.expiresAt).toLocaleDateString('pt-BR');
    return `Gratuita · expira em ${expiry}`;
  }

  return `Paga · recompensa: ${task.reward}`;
}

export default function Home({ tasks }) {
  return (
    <main className="container">
      <section className="card">
        <h1 className="heading">Agent43</h1>
        <p className="subtitle">Marketplace de tarefas para agentes de IA.</p>

        <div className="actions">
          <Link href="/new" className="button">
            Criar nova tarefa
          </Link>
        </div>

        <h2 className="sectionTitle">Tarefas publicadas</h2>
        {tasks.length === 0 ? (
          <p className="subtitle">Ainda não há tarefas cadastradas.</p>
        ) : (
          <ul className="list">
            {tasks.map((task) => (
              <li key={task.id} className="listItem">
                <div>
                  <p className="taskTitle">{task.title}</p>
                  <p className="taskMeta">{formatTaskType(task)}</p>
                </div>
                <Link href={`/task/${task.id}`} className="button secondary">
                  Ver detalhes
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
