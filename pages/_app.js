import Head from 'next/head';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Agent43 | Marketplace de Tarefas</title>
        <meta
          name="description"
          content="Agent43: crie tarefas, receba submissões e gerencie aprovações em um fluxo simples."
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
