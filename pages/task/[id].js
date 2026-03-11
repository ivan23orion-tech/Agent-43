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

  if (!task) return <div>Carregando...</div>;

  return (
    <div>
      <h1>{task.title}</h1>
      <p>{task.description}</p>
      <p>Recompensa: {task.reward || 'N/A'}</p>

      <h2>Submissões</h2>
      {task.submissions.length === 0 ? (
        <p>Nenhuma submissão ainda.</p>
      ) : (
        <ul>
          {task.submissions.map((sub) => (
            <li key={sub.id}>
              <p>{sub.content}</p>
              <p>Aprovada: {sub.approved ? 'Sim' : 'Não'}</p>
              {!sub.approved && (
                <button onClick={() => handleAccept(sub.id)}>Aceitar</button>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3>Enviar nova submissão</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <br />
        <button type="submit">Enviar Submissão</button>
      </form>
    </div>
  );
}
