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

function getReviewStatus(submission) {
  return submission.reviewStatus ?? (submission.approved ? 'ACCEPTED' : 'PENDING');
}

function formatReviewStatus(submission) {
  const status = getReviewStatus(submission);

  if (status === 'ACCEPTED') return 'Aceita';
  if (status === 'REJECTED') return 'Rejeitada';
  return 'Pendente';
}

function reviewBadgeClass(submission) {
  const status = getReviewStatus(submission);

  if (status === 'ACCEPTED') return 'success';
  if (status === 'REJECTED') return 'dangerBadge';
  return 'warning';
}

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState('');
  const [tasks, setTasks] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState(null);

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

  const reviewSubmission = async (submission, action) => {
    const reviewNote = action === 'reject'
      ? window.prompt('Motivo da rejeição (opcional):') ?? ''
      : '';

    setReviewingSubmissionId(submission.id);
    setMessage('');

    const res = await fetch(`/api/submissions/${submission.id}/${action === 'reject' ? 'reject' : 'accept'}`, {
      method: 'POST',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewNote }),
    });

    setReviewingSubmissionId(null);

    if (!res.ok) {
      setMessage(await readErrorMessage(res, 'Falha ao revisar submissão.'));
      return;
    }

    await loadTasks();
    setMessage(action === 'reject' ? 'Submissão rejeitada.' : 'Submissão aceita.');
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
                <div className="adminTaskBody">
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

                  {task.submissions?.length > 0 && (
                    <div className="submissionReviewList">
                      <h3 className="compactTitle">Submissões</h3>
                      {task.submissions.map((submission) => {
                        const isPending = getReviewStatus(submission) === 'PENDING';

                        return (
                          <div key={submission.id} className="submissionReviewItem">
                            <div className="badgeRow compact">
                              <span className="badge">Submissão #{submission.id}</span>
                              <span className={`badge ${reviewBadgeClass(submission)}`}>
                                {formatReviewStatus(submission)}
                              </span>
                            </div>
                            <p>{submission.content}</p>
                            {submission.reviewNote ? (
                              <p className="taskMeta">Motivo: {submission.reviewNote}</p>
                            ) : null}
                            {isPending && (
                              <div className="adminActions inlineActions">
                                <button
                                  type="button"
                                  className="button"
                                  onClick={() => reviewSubmission(submission, 'accept')}
                                  disabled={reviewingSubmissionId === submission.id}
                                >
                                  Aceitar
                                </button>
                                <button
                                  type="button"
                                  className="button danger"
                                  onClick={() => reviewSubmission(submission, 'reject')}
                                  disabled={reviewingSubmissionId === submission.id}
                                >
                                  Rejeitar
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
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
