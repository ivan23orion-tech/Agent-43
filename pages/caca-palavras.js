import Head from 'next/head';
import { useMemo, useState } from 'react';

const SIZE = 12;

const WORDS = [
  { text: 'AGENTE', clue: 'Quem executa tarefas no Agent43', row: 0, col: 0, dr: 0, dc: 1 },
  { text: 'CODIGO', clue: 'Entrega tecnica que pode virar produto', row: 2, col: 1, dr: 1, dc: 0 },
  { text: 'DADOS', clue: 'Materia-prima para analise', row: 4, col: 0, dr: 0, dc: 1 },
  { text: 'TOKEN', clue: 'Chave usada para acesso seguro', row: 0, col: 11, dr: 1, dc: 0 },
  { text: 'PROMPT', clue: 'Pedido que guia uma IA', row: 7, col: 2, dr: 0, dc: 1 },
  { text: 'VERCEL', clue: 'Plataforma onde este jogo esta publicado', row: 10, col: 1, dr: 0, dc: 1 },
  { text: 'NEON', clue: 'Banco Postgres usado no projeto', row: 8, col: 10, dr: -1, dc: 0 },
  { text: 'REACT', clue: 'Biblioteca da interface', row: 11, col: 7, dr: -1, dc: 1 },
];

const FILLER = 'LUMIAREXOSBFQTZPVNCHJGKYW';

function makeCellKey(row, col) {
  return `${row}-${col}`;
}

function buildBoard() {
  const board = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => ''));
  const wordPaths = {};

  WORDS.forEach((word) => {
    const path = [];
    [...word.text].forEach((letter, index) => {
      const row = word.row + word.dr * index;
      const col = word.col + word.dc * index;
      board[row][col] = letter;
      path.push(makeCellKey(row, col));
    });
    wordPaths[word.text] = path;
  });

  let fillerIndex = 0;
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (!board[row][col]) {
        board[row][col] = FILLER[fillerIndex % FILLER.length];
        fillerIndex += 1;
      }
    }
  }

  return { board, wordPaths };
}

function normalizeSelection(selection) {
  if (selection.length <= 2) return selection;

  const [first, second] = selection;
  const rowStep = Math.sign(second.row - first.row);
  const colStep = Math.sign(second.col - first.col);

  return selection.filter((cell, index) => (
    cell.row === first.row + rowStep * index
    && cell.col === first.col + colStep * index
  ));
}

export default function CacaPalavras() {
  const { board, wordPaths } = useMemo(buildBoard, []);
  const [selection, setSelection] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [message, setMessage] = useState('Arraste pelas letras para selecionar uma palavra.');
  const [hintIndex, setHintIndex] = useState(0);

  const foundSet = new Set(foundWords);
  const selectedKeys = new Set(selection.map((cell) => makeCellKey(cell.row, cell.col)));
  const foundCellKeys = new Set(
    foundWords.flatMap((word) => wordPaths[word] ?? []),
  );
  const remainingWords = WORDS.filter((word) => !foundSet.has(word.text));
  const progress = Math.round((foundWords.length / WORDS.length) * 100);

  function addCell(row, col) {
    setSelection((currentSelection) => {
      const key = makeCellKey(row, col);
      if (currentSelection.some((cell) => makeCellKey(cell.row, cell.col) === key)) {
        return currentSelection;
      }
      return normalizeSelection([...currentSelection, { row, col }]);
    });
  }

  function finishSelection() {
    if (selection.length === 0) return;

    const selectedWord = selection.map((cell) => board[cell.row][cell.col]).join('');
    const reversedWord = [...selectedWord].reverse().join('');
    const match = WORDS.find((word) => (
      !foundSet.has(word.text)
      && (word.text === selectedWord || word.text === reversedWord)
    ));

    if (match) {
      const nextFoundWords = [...foundWords, match.text];
      setFoundWords(nextFoundWords);
      setMessage(nextFoundWords.length === WORDS.length
        ? 'Parabens, voce encontrou todas as palavras.'
        : `Boa! Voce encontrou ${match.text}.`);
    } else {
      setMessage('Essa selecao ainda nao forma uma palavra da lista.');
    }

    setSelection([]);
  }

  function handlePointerMove(event) {
    if (selection.length === 0) return;

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const cell = element?.closest?.('[data-row][data-col]');
    if (!cell) return;

    addCell(Number(cell.dataset.row), Number(cell.dataset.col));
  }

  function resetGame() {
    setSelection([]);
    setFoundWords([]);
    setMessage('Jogo reiniciado. Encontre as palavras escondidas.');
    setHintIndex(0);
  }

  function showHint() {
    if (remainingWords.length === 0) {
      setMessage('Todas as palavras ja foram encontradas.');
      return;
    }

    const hint = remainingWords[hintIndex % remainingWords.length];
    setMessage(`Dica para ${hint.text}: ${hint.clue}.`);
    setHintIndex((current) => current + 1);
  }

  return (
    <>
      <Head>
        <title>Caca Palavras | Agent43</title>
        <meta
          name="description"
          content="Jogo publico de caca palavras criado como entrega de tarefa no Agent43."
        />
      </Head>
      <main className="gameShell">
        <section className="hero">
          <div>
            <p className="eyebrow">Agent43 apresenta</p>
            <h1>Caca Palavras de IA</h1>
            <p>
              Encontre termos ligados a agentes, codigo e infraestrutura. Arraste em linha reta
              pela grade e complete a lista.
            </p>
          </div>
          <div className="scorePanel" aria-label="Progresso do jogo">
            <strong>{foundWords.length}/{WORDS.length}</strong>
            <span>palavras encontradas</span>
            <div className="meter"><span style={{ width: `${progress}%` }} /></div>
          </div>
        </section>

        <section className="playArea">
          <div
            className="board"
            onPointerMove={handlePointerMove}
            onPointerUp={finishSelection}
            onPointerLeave={finishSelection}
            aria-label="Grade do caca palavras"
          >
            {board.map((row, rowIndex) => row.map((letter, colIndex) => {
              const key = makeCellKey(rowIndex, colIndex);
              const isSelected = selectedKeys.has(key);
              const isFound = foundCellKeys.has(key);

              return (
                <button
                  key={key}
                  type="button"
                  className={`cell ${isSelected ? 'selected' : ''} ${isFound ? 'found' : ''}`}
                  data-row={rowIndex}
                  data-col={colIndex}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                    setSelection([{ row: rowIndex, col: colIndex }]);
                    setMessage('Continue arrastando ate completar a palavra.');
                  }}
                  onPointerEnter={() => addCell(rowIndex, colIndex)}
                  aria-label={`Letra ${letter}, linha ${rowIndex + 1}, coluna ${colIndex + 1}`}
                >
                  {letter}
                </button>
              );
            }))}
          </div>

          <aside className="sidePanel">
            <div className="messageBox" role="status" aria-live="polite">
              {message}
            </div>

            <div className="actions">
              <button type="button" onClick={showHint}>Dica</button>
              <button type="button" onClick={resetGame} className="secondary">Reiniciar</button>
            </div>

            <div>
              <h2>Palavras</h2>
              <ul className="wordList">
                {WORDS.map((word) => (
                  <li key={word.text} className={foundSet.has(word.text) ? 'done' : ''}>
                    {word.text}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>
      </main>

      <style jsx>{`
        .gameShell {
          min-height: 100vh;
          padding: 32px;
          color: #16201d;
          background:
            radial-gradient(circle at top left, rgba(25, 118, 210, 0.18), transparent 32rem),
            linear-gradient(135deg, #f7fbff 0%, #ecf8f3 48%, #fff6dc 100%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .hero,
        .playArea {
          width: min(1120px, 100%);
          margin: 0 auto;
        }

        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 24px;
          align-items: end;
          padding: 24px 0 28px;
        }

        .eyebrow {
          margin: 0 0 10px;
          color: #0f766e;
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: clamp(2rem, 4vw, 4rem);
          line-height: 1;
          letter-spacing: 0;
        }

        .hero p:not(.eyebrow) {
          max-width: 680px;
          margin: 16px 0 0;
          color: #3b4d48;
          font-size: 1.05rem;
          line-height: 1.6;
        }

        .scorePanel,
        .sidePanel {
          border: 1px solid rgba(22, 32, 29, 0.14);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 18px 50px rgba(22, 32, 29, 0.1);
        }

        .scorePanel {
          padding: 18px;
        }

        .scorePanel strong {
          display: block;
          font-size: 2rem;
        }

        .scorePanel span {
          color: #52645f;
        }

        .meter {
          height: 10px;
          margin-top: 16px;
          overflow: hidden;
          border-radius: 999px;
          background: #d9e5df;
        }

        .meter span {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #0f766e, #f59e0b);
          transition: width 180ms ease;
        }

        .playArea {
          display: grid;
          grid-template-columns: minmax(320px, 1fr) 320px;
          gap: 24px;
          align-items: start;
        }

        .board {
          display: grid;
          grid-template-columns: repeat(${SIZE}, minmax(0, 1fr));
          gap: 6px;
          touch-action: none;
          user-select: none;
        }

        .cell {
          aspect-ratio: 1;
          min-width: 0;
          border: 1px solid rgba(22, 32, 29, 0.14);
          border-radius: 8px;
          color: #152420;
          background: rgba(255, 255, 255, 0.9);
          font-size: clamp(0.9rem, 2.4vw, 1.35rem);
          font-weight: 900;
          letter-spacing: 0;
          cursor: pointer;
          transition: transform 120ms ease, background 120ms ease, color 120ms ease;
        }

        .cell:hover {
          transform: translateY(-1px);
        }

        .cell.selected {
          color: #fff;
          background: #1976d2;
        }

        .cell.found {
          color: #14211d;
          background: #f6c453;
          border-color: #c78613;
        }

        .sidePanel {
          padding: 20px;
        }

        .messageBox {
          min-height: 74px;
          padding: 14px;
          border-radius: 8px;
          color: #12332d;
          background: #e7f5ef;
          line-height: 1.45;
        }

        .actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin: 16px 0 22px;
        }

        button {
          border: 0;
          border-radius: 8px;
          padding: 12px 14px;
          color: #fff;
          background: #0f766e;
          font-weight: 800;
          cursor: pointer;
        }

        button.secondary {
          color: #152420;
          background: #f6c453;
        }

        h2 {
          margin: 0 0 12px;
          font-size: 1.1rem;
        }

        .wordList {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .wordList li {
          padding: 10px;
          border: 1px solid rgba(22, 32, 29, 0.12);
          border-radius: 8px;
          background: #fff;
          font-weight: 800;
          text-align: center;
        }

        .wordList li.done {
          color: #5a4203;
          text-decoration: line-through;
          background: #fff2bf;
        }

        @media (max-width: 820px) {
          .gameShell {
            padding: 18px;
          }

          .hero,
          .playArea {
            grid-template-columns: 1fr;
          }

          .board {
            gap: 4px;
          }

          .sidePanel {
            order: -1;
          }
        }
      `}</style>
    </>
  );
}
