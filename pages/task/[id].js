import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

const CREATOR_KEY_STORAGE_KEY = 'agent43.creatorKey';
const CREATOR_LABEL_STORAGE_KEY = 'agent43.creatorLabel';

async function readErrorMessage(res, fallbackMessage) {
  try {
    const data = await res.json();
    return data?.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function formatReward(task) {
  if (task.isFree) {
    const expiry = task.expiresAt
      ? new Date(task.expiresAt).toLocaleDateString('pt-BR')
      : 'sem expiração';
    return `Gratuita · expira em ${expiry}`;
  }

  return `Paga · recompensa: ${task.rewardAmount} ${task.rewardCurrency}`;
}

function formatReviewStatus(submission) {
  const status = submission.reviewStatus ?? (submission.approved ? 'ACCEPTED' : 'PENDING');

  if (status === 'ACCEPTED') return 'Aceita';
  if (status === 'REJECTED') return 'Rejeitada';
  return 'Pendente';
}

function buildCreatorHeaders(creatorKey, creatorLabel) {
  const headers = {};

  if (creatorKey) {
    headers['x-creator-key'] = creatorKey;
  }

  if (creatorLabel) {
    headers['x-creator-label'] = creatorLabel;
  }

  return headers;
}

export default function TaskDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [task, setTask] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [content, setContent] = useState('');
  const [creatorKey, setCreatorKey] = useState('');
  const [creatorLabel, setCreatorLabel] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setCreatorKey(window.localStorage.getItem(CREATOR_KEY_STORAGE_KEY) ?? '');
    setCreatorLabel(window.localStorage.getItem(CREATOR_LABEL_STORAGE_KEY) ?? '');
  }, []);

  const creatorHeaders = useMemo(
    () => buildCreatorHeaders(creatorKey, creatorLabel),
    [creatorKey, creatorLabel],
  );

  const fetchTask = async () => {
    if (!id) {
      return;
    }

    const res = await fetch(`/api/tasks/${id}`, {
      headers: creatorHeaders,
    });

    if (!res.ok) {
      setTask(null);
      setLoadError(await readErrorMessage(res, 'Falha ao carregar tarefa'));
      return;
    }

    const data = await res.json();
    setLoadError('');
    setTask(data);
  };

  useEffect(() => {
    fetchTask();
  }, [id, creatorHeaders]);

  const refreshTask = async () => {
    await fetchTask();
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
      alert(await readErrorMessage(res, 'Falha ao enviar submissão'));
    }
  };

  const handleAccept = async (submissionId) => {
    const res = await fetch(`/api/submissions/${submissionId}/accept`, {
      method: 'POST',
      headers: creatorHeaders,
    });

    if (res.ok) {
      await refreshTask();
    } else {
      alert(await readErrorMessage(res, 'Falha ao aceitar submissão'));
    }
  };

  const handleReject = async (submissionId) => {
    const reviewNote = window.prompt('Motivo da rejeição (opcional):') ?? '';
    const res = await fetch(`/api/submissions/${submissionId}/reject`, {
      method: 'POST',
      headers: { ...creatorHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewNote }),
    });

    if (res.ok) {
      await refreshTask();
    } else {
      alert(await readErrorMessage(res, 'Falha ao rejeitar submissão'));
    }
  };

  const handleCreatorAccessSubmit = async (e) => {
    e.preventDefault();

    if (typeof window !== 'undefined') {
      if (creatorKey) {
        window.localStorage.setItem(CREATOR_KEY_STORAGE_KEY, creatorKey);
      } else {
        window.localStorage.removeItem(CREATOR_KEY_STORAGE_KEY);
      }

      if (creatorLabel) {
        window.localStorage.setItem(CREATOR_LABEL_STORAGE_KEY, creatorLabel);
      } else {
        window.localStorage.removeItem(CREATOR_LABEL_STORAGE_KEY);
      }
    }

    await refreshTask();
    setAuthMessage('Credenciais atualizadas.');
  };

  if (loadError) {
    return (
      <main className="container">
        <section className="card">
          <h1 className="heading">Tarefa indisponível</h1>
          <p className="subtitle">{loadError}</p>
          <div className="actions">
            <Link href="/" className="button secondary">
              Voltar para tarefas
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!task) return <main className="container">Carregando...</main>;

  const canViewSubmissions = task.isFree || task.creatorAuthenticated;
  const canReviewSubmission = task.creatorAuthenticated;
  const submissions = task.submissions ?? [];

  return (
    <main className="container">
      <section className="card">
        <h1 className="heading">{task.title}</h1>
        <p>{task.description}</p>
        <p className="subtitle">{formatReward(task)}</p>

        {!task.isFree && (
          <section className="creatorPanel">
            <h2 className="sectionTitle">Acesso do criador</h2>
            <p className="subtitle">
              Tarefas pagas exibem e revisam respostas apenas para o criador autenticado.
            </p>
            <form onSubmit={handleCreatorAccessSubmit} className="formGrid">
              <label>
                Chave do criador
                <input
                  type="password"
                  value={creatorKey}
                  onChange={(e) => setCreatorKey(e.target.value)}
                  placeholder="Informe sua chave privada de criador"
                />
              </label>

              <label>
                Identificação do criador (opcional)
                <input
                  type="text"
                  value={creatorLabel}
                  onChange={(e) => setCreatorLabel(e.target.value)}
                  placeholder="Ex.: João / Wallet principal"
                />
              </label>

              <div className="actions">
                <button type="submit" className="button secondary">
                  Atualizar acesso
                </button>
              </div>
            </form>
            {authMessage ? <p className="subtitle">{authMessage}</p> : null}
            {task.submissionsPrivate && (
              <p className="subtitle">Respostas privadas do criador.</p>
            )}
          </section>
        )}

        <div className="actions">
          <Link href="/" className="button secondary">
            Voltar para tarefas
          </Link>
        </div>

        <h2 className="sectionTitle">Submissões</h2>
        {!canViewSubmissions ? (
          <p className="subtitle">Respostas privadas do criador.</p>
        ) : submissions.length === 0 ? (
          <p className="subtitle">Nenhuma submissão ainda.</p>
        ) : (
          <ul className="list">
            {submissions.map((sub) => {
              const isPending = (sub.reviewStatus ?? (sub.approved ? 'ACCEPTED' : 'PENDING')) === 'PENDING';

              return (
                <li key={sub.id} className="listItem">
                  <div>
                    <p>{sub.content}</p>
                    <p className="subtitle">Revisão: {formatReviewStatus(sub)}</p>
                    {sub.reviewNote ? <p className="subtitle">Motivo: {sub.reviewNote}</p> : null}
                  </div>
                  {isPending && canReviewSubmission && (
                    <div className="adminActions">
                      <button onClick={() => handleAccept(sub.id)} className="button">
                        Aceitar
                      </button>
                      <button onClick={() => handleReject(sub.id)} className="button danger">
                        Rejeitar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
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
