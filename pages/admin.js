import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const ADMIN_TOKEN_STORAGE_KEY = 'agent43.adminToken';

async function readErrorMessage(res, fallbackMessage) {
  try {
    const data = await res.json();
    return data?.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function formatDate(value) {
  if (!value) {
    return 'sem data';
  }

  return new Date(value).toLocaleString('pt-BR');
}

function formatTaskType(task) {
  if (task.isFree) {
    return task.expiresAt
      ? `Gratuita · expira em ${formatDate(task.expiresAt)}`
      : 'Gratuita · sem expiração';
  }

  return `Paga · ${task.rewardAmount} ${task.rewardCurrency}`;
}

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState('');
  const [tasks, setTasks] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setAdminToken(window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? '');
  }, []);

  const adminHeaders = useMemo(() => {
    if (!adminToken) {
      return {};
    }

    return { 'x-admin-token': adminToken };
  }, [adminToken]);

  const loadTasks = async () => {
    if (!adminToken) {
      setMessage('Informe o token de admin.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    const res = await fetch('/api/admin/tasks', {
      headers: adminHeaders,
    });

    setIsLoading(false);

    if (!res.ok) {
      setTasks([]);
      setMessage(await readErrorMessage(res, 'Falha ao carregar tarefas.'));
      return;
    }

    const data = await res.json();
    setTasks(data.tasks ?? []);
    setMessage('Tarefas carregadas.');

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, adminToken);
    }
  };

  const clearToken = () => {
    setAdminToken('');
    setTasks([]);
    setMessage('Token removido deste navegador.');

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    }
  };

  const deleteTask = async (task) => {
    const confirmed = window.confirm(
      `Apagar a tarefa "${task.title}" e ${task.submissionCount} submissão(ões)?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingTaskId(task.id);
    setMessage('');

    const res = await fetch(`/api/admin/tasks/${task.id}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });

    setDeletingTaskId(null);

    if (!res.ok) {
      setMessage(await readErrorMessage(res, 'Falha ao apagar tarefa.'));
      return;
    }

    const data = await res.json();
    setTasks((currentTasks) => currentTasks.filter((currentTask) => currentTask.id !== task.id));
    setMessage(`Tarefa apagada com ${data.deletedSubmissions} submissão(ões).`);
  };

  return (
    <main className="container">
      <section className="card">
        <div className="pageHeader">
          <div>
            <h1 className="heading">Admin</h1>
            <p className="subtitle">Gerenciamento interno de tarefas.</p>
          </div>
          <Link href="/" className="button secondary">
            Voltar
          </Link>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            loadTasks();
          }}
          className="formGrid"
        >
          <label>
            Token de admin
            <input
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              placeholder="AGENT43_ADMIN_TOKEN"
            />
          </label>

          <div className="actions">
            <button type="submit" className="button" disabled={isLoading}>
              {isLoading ? 'Carregando...' : 'Carregar tarefas'}
            </button>
            <button type="button" className="button secondary" onClick={clearToken}>
              Limpar token
            </button>
          </div>
        </form>

        {message ? <p className="adminMessage">{message}</p> : null}

        <h2 className="sectionTitle">Tarefas</h2>
        {tasks.length === 0 ? (
          <p className="subtitle">Nenhuma tarefa carregada.</p>
        ) : (
          <ul className="list adminList">
            {tasks.map((task) => (
              <li key={task.id} className="listItem adminListItem">
                <div>
                  <div className="badgeRow compact">
                    <span className="badge">#{task.id}</span>
                    <span className={`badge ${task.status === 'expired' ? 'warning' : 'success'}`}>
                      {task.status === 'expired' ? 'Expirada' : 'Ativa'}
                    </span>
                    <span className="badge">{task.submissionCount} submissão(ões)</span>
                  </div>
                  <p className="taskTitle">{task.title}</p>
                  <p className="taskMeta">{formatTaskType(task)}</p>
                  <p className="taskMeta">Criada em {formatDate(task.createdAt)}</p>
                </div>
                <div className="adminActions">
                  <Link href={`/task/${task.id}`} className="button secondary">
                    Ver
                  </Link>
                  <button
                    type="button"
                    className="button danger"
                    onClick={() => deleteTask(task)}
                    disabled={deletingTaskId === task.id}
                  >
                    {deletingTaskId === task.id ? 'Apagando...' : 'Apagar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
