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
    <div>
      <h1>Criar Nova Tarefa</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Título
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <br />
        <label>
          Descrição
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
        </label>
        <br />
        <label>
          Recompensa (opcional)
          <input type="number" value={reward} onChange={(e) => setReward(e.target.value)} />
        </label>
        <br />
        <button type="submit">Criar Tarefa</button>
      </form>
    </div>
  );
}
