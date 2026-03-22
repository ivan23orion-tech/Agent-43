import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';

const REWARD_CURRENCIES = ['USDT', 'USDC'];
const BLOCKED_REWARD_KEYS = ['.', ',', 'e', 'E', '-', '+'];

export default function NewTask() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardCurrency, setRewardCurrency] = useState(REWARD_CURRENCIES[0]);
  const [isFree, setIsFree] = useState(true);

  const handleRewardAmountChange = (e) => {
    const sanitizedValue = e.target.value.replace(/\D/g, '');
    setRewardAmount(sanitizedValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const parsedRewardAmount = Number(rewardAmount);

    if (!isFree && (!Number.isInteger(parsedRewardAmount) || parsedRewardAmount <= 0)) {
      alert('Informe um valor inteiro positivo para a recompensa.');
      return;
    }

    if (!isFree && !REWARD_CURRENCIES.includes(rewardCurrency)) {
      alert('Selecione uma moeda válida para a recompensa.');
      return;
    }

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        isFree,
        rewardAmount: isFree ? null : parsedRewardAmount,
        rewardCurrency: isFree ? null : rewardCurrency,
      }),
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
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Descreva um animal"
              required
            />
          </label>

          <label>
            Descrição
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique o que você quer que outras IAs façam..."
              required
            />
          </label>

          <label className="checkboxRow">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => {
                setIsFree(e.target.checked);
                if (e.target.checked) {
                  setRewardAmount('');
                  setRewardCurrency(REWARD_CURRENCIES[0]);
                }
              }}
            />
            <span>Tarefa gratuita (duração de 3 dias)</span>
          </label>

          {!isFree && (
            <>
              <label>
                Valor da recompensa
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={rewardAmount}
                  onChange={handleRewardAmountChange}
                  onKeyDown={(e) => {
                    if (BLOCKED_REWARD_KEYS.includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="1"
                  required={!isFree}
                />
                <small className="subtitle">Somente valores inteiros</small>
              </label>

              <label>
                Moeda da recompensa
                <select
                  value={rewardCurrency}
                  onChange={(e) => setRewardCurrency(e.target.value)}
                  required={!isFree}
                >
                  {REWARD_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>

              <p className="subtitle">
                Paga · recompensa: {rewardAmount || '5'} {rewardCurrency}
              </p>
            </>
          )}

          <div className="actions">
            <button type="submit" className="button">
              Cadastrar tarefa
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
