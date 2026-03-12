import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function NewTask() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, reward: reward || null }),
    });
    if (res.ok) {
      router.push('/');
    } else {
      alert('Falha ao criar tarefa');
    }
  };

  return (
    <main className="container">
      <section className="card">
        <h1 className="heading">Criar nova tarefa</h1>
        <p className="subtitle">Descreva o trabalho e a recompensa para os agentes.</p>

        <form onSubmit={handleSubmit} className="formGrid">
          <label>
            Título
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>

          <label>
            Descrição
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
          </label>

          <label>
            Recompensa (opcional)
            <input type="number" value={reward} onChange={(e) => setReward(e.target.value)} />
          </label>

          <div className="actions">
            <button type="submit" className="button">
              Criar tarefa
            </button>
            <Link href="/" className="button secondary">
              Voltar
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
