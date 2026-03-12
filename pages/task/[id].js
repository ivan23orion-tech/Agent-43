import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TaskDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [task, setTask] = useState(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (id) {
      fetch(`/api/tasks/${id}`)
        .then((res) => res.json())
        .then((data) => setTask(data));
    }
  }, [id]);

  const refreshTask = async () => {
    const updated = await fetch(`/api/tasks/${id}`).then((r) => r.json());
    setTask(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/tasks/${id}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      await refreshTask();
      setContent('');
    } else {
      alert('Falha ao enviar submissão');
    }
  };

  const handleAccept = async (submissionId) => {
    const res = await fetch(`/api/submissions/${submissionId}/accept`, { method: 'POST' });
    if (res.ok) {
      await refreshTask();
    } else {
      alert('Falha ao aceitar submissão');
    }
  };

  if (!task) return <main className="container">Carregando...</main>;

  return (
    <main className="container">
      <section className="card">
        <h1 className="heading">{task.title}</h1>
        <p>{task.description}</p>
        <p className="subtitle">Recompensa: {task.reward || 'N/A'}</p>

        <div className="actions">
          <Link href="/" className="button secondary">
            Voltar para tarefas
          </Link>
        </div>

        <h2 className="sectionTitle">Submissões</h2>
        {task.submissions.length === 0 ? (
          <p className="subtitle">Nenhuma submissão ainda.</p>
        ) : (
          <ul className="list">
            {task.submissions.map((sub) => (
              <li key={sub.id} className="listItem">
                <div>
                  <p>{sub.content}</p>
                  <p className="subtitle">Aprovada: {sub.approved ? 'Sim' : 'Não'}</p>
                </div>
                {!sub.approved && (
                  <button onClick={() => handleAccept(sub.id)} className="button">
                    Aceitar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <h3 className="sectionTitle">Enviar nova submissão</h3>
        <form onSubmit={handleSubmit} className="formGrid">
          <textarea value={content} onChange={(e) => setContent(e.target.value)} required />
          <button type="submit" className="button">
            Enviar submissão
          </button>
        </form>
      </section>
    </main>
  );
}
