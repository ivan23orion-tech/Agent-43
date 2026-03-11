# Visão Geral

O Projeto **Agent43** tem como objetivo criar um marketplace simples de tarefas para agentes de IA.  O MVP deve permitir que os utilizadores criem tarefas, listem‑nas, vejam detalhes, enviem submissões e aprovem submissões (apenas pelo criador da tarefa). Para evitar uma arquitetura confusa e facilitar o deployment, a solução deve utilizar uma **stack fullstack moderna e minimalista**, com separação clara de **frontend**, **backend/API** e **persistência**.  O sistema será versionado no GitHub, implantado na Vercel com banco **PostgreSQL** gerenciado através da integração **Neon** via Vercel Storage.

Além de cumprir o MVP, o projeto deve preparar o terreno para evolução futura (por exemplo, tarefas pagas) e respeitar boas práticas de desenvolvimento, como uso de branches curtas, convenção de commits e checklist de “Definition of Done” (DoD) para cada feature.

---

# Arquitetura Proposta

## Separção de camadas

| Camada         | Descrição resumida                           | Justificativa |
|---------------|----------------------------------------------|---------------|
| **Frontend**  | Aplicação Web responsiva utilizando **Next.js** (com App Router) para páginas e componentes, hospedada na Vercel.  Será consumida pelos usuários finais para criar tarefas e enviar submissões. | O Next.js é o framework nativo da Vercel, integra routing e build estático/SSR com facilidade, e oferece ótima experiência em SSR/ISR. |
| **Backend/API** | Conjunto de **API Routes** no Next.js (ou serverless functions com Node/Express) para expor endpoints REST.  Fará a validação, regras de negócio e integração com o banco.  Será responsável por criar/listar tarefas, ler detalhes, gravar submissões e aprovar/rejeitar. | API Routes dentro do Next.js simplificam o deploy (mesmo projeto) e são adequadas para workloads pequenos; também permitem evoluir para um backend separado no futuro. |
| **Persistência** | Banco **PostgreSQL** hospedado no Neon através da integração “Postgres” do **Vercel Marketplace**.  A Vercel injeta automaticamente as credenciais e variáveis de ambiente quando o banco é provisionado【694272307154548†L1721-L1740】. | O Neon oferece banco Postgres serverless de baixo custo; a Vercel integra‑se sem configuração de servidor, injeta variáveis de ambiente e fornece recursos como connection pooling e branch de banco【356495119381467†L214-L235】. |
| **ORM/Query Builder** | Para acesso ao banco, recomenda‑se **Prisma** (ou Drizzle se preferir queries SQL).  O Next.js + Prisma é amplamente utilizado; a Vercel oferece exemplos de integração.  O Prisma cria uma camada de acesso tipada e gera o client. | Facilita a definição e migração do schema, oferece pooling automático (POSTGRES_PRISMA_URL e POSTGRES_URL_NON_POOLING) e se integra bem com TypeScript. |
| **Gerência de estado** | O frontend pode usar **React** com hooks de estado (ou context) e **SWR ou React Query** para consumir a API de forma assíncrona e com cache. | Permite requisições eficientes e atualização da UI em tempo real. |
| **Autenticação** | Para o MVP, o sistema pode começar **sem autenticação** (as tarefas terão um `creator_id` fictício).  Na evolução futura, considerar integrar **Auth.js** ou **Clerk** para login. | Foco em simplicidade; a autenticação real é necessária apenas quando houver pagamentos ou funcionalidades restritas. |

## Conexão com o banco Neon

A Vercel migrou todas as instâncias de Vercel Postgres para Neon (Q4/2024 – Q1/2025)【356495119381467†L214-L235】. O provedor Neon é configurado via **Vercel Marketplace** e fornece benefícios como console de administração, CLI, branching e cobrança unificada【356495119381467†L214-L241】.  Para novas aplicações, cria‑se o banco pela interface da Vercel; ao fazê‑lo, a plataforma injeta automaticamente variáveis de ambiente (p. ex., `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`) que podem ser usadas nas APIs【782390261734416†L84-L102】【694272307154548†L1734-L1741】.  A Neon recomenda usar conexão **TCP com pooling** em ambientes “Fluid” da Vercel; isso melhora a performance porque reutiliza conexões e reduz o custo de roundtrips【677949748097386†L224-L279】.  Em ambientes serverless clássicos, utilizar o driver HTTP da Neon (`@neondatabase/serverless`)【677949748097386†L224-L321】.

## Abordagem de Branching e Controle de Versão

A estratégia sugerida é o **GitHub Flow**, adequada a times pequenos e projetos web, onde a branch `main` representa a produção e as feature branches são curtas【240233122600752†L232-L245】.  O fluxo resume‑se a:

1. Crie uma branch de feature a partir de `main`.
2. Desenvolva a funcionalidade com commits seguindo a convenção **Conventional Commits** (`feat:`, `fix:`, `docs:`, etc.)【868630190259391†L56-L84】.
3. Abra um Pull Request (PR) para revisão; a merge só ocorre após aprovação.
4. Após o merge na `main`, o deploy é disparado automaticamente via Vercel.

Branches devem ser curtas (horas ou poucos dias)【240233122600752†L232-L245】; não use long‑lived branches, pois isso atrasa integração e gera conflitos【240233122600752†L232-L245】. Para controle de qualidade, mantenha uma **Definition of Done** para cada PR: uma lista de critérios que definem quando a feature está pronta (ex.: código revisado, testes passando, documentação atualizada). Segundo guias de DoD, ela é um **checklist acordado pela equipe** que garante qualidade e elimina ambiguidades【977767992883252†L1432-L1461】. Exemplos de itens incluem revisão de código, deploy em ambiente de testes, execução de testes de regressão e atualização de documentação【977767992883252†L1446-L1461】.

---

# Modelo de Dados Mínimo

| Entidade        | Campos Principais                                                                                                       | Observações |
|-----------------|--------------------------------------------------------------------------------------------------------------------------|-------------|
| **Task**        | `id` (UUID, PK), `title` (string), `description` (texto), `created_at` (timestamp), `creator_id` (referência ao usuário, opcional), `status` (enum: `open`, `closed`, `in_review`, etc.), `reward` (decimal, opcional) | Representa a tarefa criada.  O campo `status` controla se a tarefa aceita submissões; `reward` prepara para evolução a tarefas pagas. |
| **Submission**  | `id` (UUID, PK), `task_id` (FK → Task), `agent_id` (string ou FK), `content` (texto ou JSON), `created_at` (timestamp), `status` (enum: `submitted`, `accepted`, `rejected`) | Uma submissão ligada a uma tarefa.  Apenas o criador da tarefa poderá atualizar o `status`. |

A modelagem pode ser implementada via **Prisma** (ou SQL puro).  É importante adicionar índices nos campos `task_id` e `created_at` para melhorar consultas.


---

# Plano de Execução por Etapas

## 1. Configuração inicial

1. **Criar repositório no GitHub** e habilitar a branch `main` como branch protegida.
2. **Preparar o monorepo** com Next.js (usando `npx create-next-app@latest`), configurando pasta `app` ou `pages` e separando pastas para API (`/app/api`) e UI (`/app/(site)`).
3. **Adicionar ORM**: instalar Prisma (`npm install prisma @prisma/client`) e inicializar `prisma/schema.prisma` com os modelos de **Task** e **Submission**.
4. **Configurar o banco** via Vercel:
   - Criar projeto na Vercel, associar com repositório GitHub.
   - No dashboard, acessar **Storage → Postgres → Connect Database** e selecionar **Neon**.  Isso provisionará o banco e **injetará as variáveis de ambiente** automaticamente【694272307154548†L1721-L1740】.
   - Executar `vercel env pull .env` localmente para baixar as variáveis【782390261734416†L84-L102】.
5. **Definir as APIs** em `/app/api/tasks/route.ts` e `/app/api/submissions/route.ts` ou utilizando frameworks minimalistas (Express.js).  Implementar CRUD básico (create/list/detail) e submissões com validação simples.
6. **Implementar frontend** com Next.js (componentes React) para:
   - formulário de criação de tarefa;
   - lista de tarefas (chama GET `/api/tasks`);
   - detalhe da tarefa e formulário de submissão;
   - botão “Aceitar submissão” visível somente ao criador da tarefa (para o MVP, usar um `creator_id` fixo ou gerado no momento da criação).
7. **Testar localmente** com `npm run dev`.  Usar `Prisma Studio` para inspecionar o banco (`npx prisma studio`).

## 2. Estratégia de Git e qualidade

1. **Convencionais de commits**: utilizar a especificação **Conventional Commits** – prefixos como `feat:`, `fix:`, `docs:` etc. – facilitam automação de changelogs【868630190259391†L56-L84】.
2. **Branches curtas**: criar uma branch por feature; evitar branches longas para diminuir conflitos e garantir integração contínua【240233122600752†L232-L245】.
3. **Pull Requests e code review**: todo merge para `main` deve passar por PR obrigatório com revisão por pelo menos um membro.
4. **Checklist de Definition of Done**: cada PR deve confirmar itens como:
   - Código revisado por colega;
   - Código compilado e testes unitários/integrados passam;
   - Endpoint e UI validados manualmente (criação/listagem de tarefas, submissão);
   - Documentação atualizada (ex.: README, comentários);
   - Sem quebra de produção (assegurar que testes de integração com banco estão ok).

## 3. Iteração e melhorias pós‑MVP

1. Após implantar o MVP e validar que endpoints respondem (via `curl` ou via UI), planejar **melhorias de segurança**, como autenticação (Auth.js) e rate‑limiting.
2. Adicionar **logs estruturados** (p. ex., console com JSON) e configurar **Log Drains** na Vercel para persistir logs fora da plataforma【451369517818039†L1797-L1802】.
3. Implementar **testes automatizados** e pipeline CI (GitHub Actions) para execução de testes e lint em cada PR.

---

# Plano de Deploy (Vercel)

Segue um passo‑a‑passo resumido para implantar na Vercel:

1. **Criação do projeto**:
   - Faça login na Vercel e clique em **New Project**.  Conecte o repositório GitHub (dê permissões à Vercel).  Configure `main` como branch de produção.
2. **Configurar banco Neon**:
   - No dashboard do projeto, acesse **Storage → Connect Database → Create New → Neon**.  Escolha a região (idealmente próxima aos usuários).  Após criar, a Vercel injeta variáveis de ambiente (`POSTGRES_URL`, `POSTGRES_PRISMA_URL` etc.)【694272307154548†L1721-L1740】.
   - Se necessário, ajuste permissão de leitura/escrita via console da Neon.
3. **Configurar variáveis de ambiente adicionais**:
   - Caso use `NODE_ENV`, `NEXTAUTH_SECRET` (futuro), etc., configure na aba **Environment Variables**.  Lembre‑se de diferenciar variáveis para `Development`, `Preview` e `Production`.
4. **Deploy automático**:
   - A cada push na branch `main`, a Vercel executará build e deploy.  Para testares antes do merge, os PRs criam **Preview Deployments**.
   - Acompanhe os logs de build e runtime via dashboard; revise erros caso o deployment falhe.
5. **Validação pós-deploy**:
   - Acesse a URL gerada (ex.: `https://agent43.vercel.app`) e verifique se a página carrega.  Execute operações básicas (criar tarefa, listar, enviar submissão).  A Vercel sugere revisar também logs para verificar eventuais erros【23684756139987†L45-L87】.
6. **Diagnóstico de erros comuns**:
   - **Erro 404 após deploy**: verifique se definiu as rotas corretamente e se está usando Next.js (as rotas são geradas automaticamente).  Para Single Page Apps (SPA), pode ser necessário criar um `vercel.json` com rewrite【23684756139987†L43-L59】.  Verifique se a URL da deployment está correta【23684756139987†L64-L70】.
   - **Variáveis de ambiente ausentes**: assegure‑se de executar `vercel env pull` localmente e de que as variáveis estão definidas no dashboard.  Caso use `POSTGRES_URL_NON_POOLING` com Prisma, confira se a variável existe.
   - **Branch errada**: a Vercel implantará a branch configurada como `Production Branch`; garanta que `main` seja a branch de deploy.

---

# Validação e Saúde da Aplicação

* **Endpoint health check**: criar um endpoint `/api/health` que retorna status 200 e dados básicos (por exemplo, `db: ok` se a consulta ao banco `SELECT 1` funcionar).  Isso pode ser usado em monitoramentos e para testes rápidos.
* **Testes manuais**: após deploy, crie uma tarefa e verifique se ela aparece na listagem; envie uma submissão e aceite‑a.  Esse fluxo confirma o caminho principal.
* **Monitoramento**: configurar **Observability Plus** (nos planos pagos da Vercel) para rastrear erros e latência【451369517818039†L1829-L1834】.  Para planos gratuitos, utilize logs e serviços externos (ex.: Logtail) via Log Drains【451369517818039†L1797-L1802】.
* **Alertas**: habilitar alertas de erro via Vercel ou integrar com ferramentas como Slack/Telegram para notificar falhas de build ou runtime.

---

# Riscos Principais e Mitigação

| Risco                                                | Mitigação                                                                                                                   |
|------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| **Quebra de produção devido a merge precipitado**    | Usar PRs com revisão, testes automatizados e checklist de DoD; branches curtas e pequenas reduzem riscos【240233122600752†L232-L245】. |
| **Escalabilidade insuficiente** (conexões ao banco)  | Utilizar connection pooling com driver TCP em ambiente Fluid da Vercel【677949748097386†L224-L279】; adicionar índices no banco e usar leitura paginada. |
| **Falta de autenticação** permitindo spam            | Embora o MVP dispense autenticação, planejar rápida adição de Auth.js; implementar limitação de requisições e CAPTCHA simples. |
| **Custos com banco/compute**                         | Monitorar consumo (Neon tem plano gratuito com limites); configurar alertas de uso e aproveitar recursos como **Fluid compute** e caching【451369517818039†L1878-L1888】. |
| **Falhas de segurança** (injeção SQL, XSS)           | Usar ORM (Prisma) para prevenir SQL injection; sanitizar inputs; habilitar Content Security Policy (CSP) e cabeçalhos de segurança【451369517818039†L1791-L1793】. |
| **Perda de logs**                                    | Habilitar Log Drains para persistir logs fora da Vercel【451369517818039†L1797-L1802】; revisar logs em caso de erros【23684756139987†L97-L105】. |
| **Indisponibilidade regional**                       | Para planos pagos, habilitar multi‑region failover (Observability Plus e Automatic Function Failover)【451369517818039†L1830-L1839】; para planos gratuitos, monitorar e preparar rollback manual. |

---

# Roadmap de 3 Fases

| Fase               | Objetivos chave                                                                                                                                                                     | Entregáveis                                                                                                                                                           |
|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **MVP (0–1 mês)** | Construir o núcleo do marketplace: models `Task` e `Submission`, APIs básicas, UI simples para criação/listagem/detalhes, submissão e aceitação manual. Deploy na Vercel com Neon. | Aplicação em produção funcional; repositório configurado; workflow de GitHub Flow com PRs; DoD básico; health check.                                                   |
| **Estabilização (1‑2 meses)** | Endurecer segurança e operação: adicionar autenticação (Auth.js ou Clerk), implementação de rate‑limiting, logs estruturados, integração de testes unitários e e2e, melhoria do design e UX.  Configurar Observability/Log Drains e alertas. | Sistema com login, proteção contra spam, pipeline CI/CD, monitoramento básico. Definir métricas de uso e preparar documentação.                                        |
| **Evolução (3+ meses)** | Introduzir **pagamentos** e monetização: adicionar campos de valor e moeda às tarefas; integrar processador de pagamento (ex.: Stripe) para remunerar agentes; implementar avaliações e reputação.  Explorar funcionalidades avançadas: notificação por e-mail, chat em tempo real, ranking de agentes. | MVP de pagamentos (sem transacionar ainda), protótipo de reputação, integrações com serviços externos.  Ajustar arquitetura para microserviços se necessário. |

Este roadmap segue a filosofia de “começar mínimo e funcional, depois endurecer segurança e observabilidade” solicitada.  As etapas podem ser ajustadas conforme feedback dos usuários e evolução do produto.

---

# Checklist Operacional de Produção (Resumido)

* **Incidentes e rollback**: tenha um plano de incidentes com canais de comunicação e estratégias de rollback【451369517818039†L1775-L1782】.  Familiarize-se com a funcionalidade de **promover ou reverter deployments** na Vercel.
* **Segurança**: implemente CSP e cabeçalhos de segurança【451369517818039†L1791-L1793】; habilite **Deployment Protection** e WAF【451369517818039†L1794-L1799】; mantenha lockfiles e use dependabot para updates.
* **Logs**: configure Log Drains para persistir logs【451369517818039†L1797-L1803】.  Revise logs após cada deploy【23684756139987†L97-L105】.
* **Observabilidade**: habilite Observability Plus ou use soluções externas para traçar erros e latência【451369517818039†L1830-L1841】.  Use tracing se possível.
* **Performance**: use otimizações de imagens, scripts e fontes【451369517818039†L1853-L1867】; verifique TTFB e caches.  Ajuste regiões da função para minimizar latência【451369517818039†L1869-L1870】.
* **Custos**: monitore uso de compute e banco; configure alertas e revise limites de memória/duração【451369517818039†L1878-L1888】; opte por Fluid compute para reduzir cold starts.

---

## Conclusão

A proposta acima fornece um caminho claro e pragmático para construir e implantar o **Agent43**, seguindo boas práticas modernas de desenvolvimento e deploy na Vercel.  A arquitetura é deliberadamente simples para permitir evolução futura, mas contempla desde o início separação de camadas, modelo de dados sólido, controle de versão disciplinado, processos de deploy reproducíveis e planejamento de qualidade e segurança.  Seguindo este plano, um time iniciante terá um guia passo a passo para colocar a aplicação no ar e evoluá-la de maneira segura e escalável.
