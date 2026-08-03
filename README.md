# AutoFlux Atendimento

SaaS de automação de atendimento via WhatsApp para pequenos e médios negócios.

## Status do projeto

Este projeto está sendo construído **por etapas**, cada uma entregando código
real e funcional (nada fictício ou de exemplo, exceto onde explicitamente
marcado como placeholder no código).

| Etapa | Conteúdo | Status |
|---|---|---|
| 1 | Fundação: estrutura, Docker, banco de dados, autenticação, permissões | ✅ Concluída |
| 2 | Conexão WhatsApp (QR Code), atendimento automático, palavras-chave, fluxos, transferência para humano | ✅ Concluída |
| 3 | Catálogo de produtos, envio de mídia, listas de transmissão e agendamento de mensagens | ✅ Concluída |
| 4 | Integração com IA (OpenAI, Gemini, Claude) | ✅ Concluída |
| 5 | Relatórios, estatísticas, backup automático | ✅ **Concluída (este pacote)** |

## Stack

- **Backend:** Node.js + Express, PostgreSQL, Redis
- **Frontend:** React + Vite + Tailwind CSS + Framer Motion + Lucide + Recharts
- **Infra:** Docker + Docker Compose

## Estrutura de pastas

```
autoflux-atendimento/
├── docker-compose.yml       # orquestra postgres, redis, backend e frontend
├── .env.example              # variáveis de ambiente (copie para .env)
├── backend/
│   ├── Dockerfile
│   ├── migrations/
│   │   └── 001_init.sql      # schema: companies, users, tags
│   └── src/
│       ├── server.js         # ponto de entrada (sobe o servidor)
│       ├── app.js             # configuração do Express (middlewares, rotas)
│       ├── config/
│       │   ├── db.js          # pool de conexões PostgreSQL
│       │   ├── redis.js       # cliente Redis
│       │   └── migrate.js     # runner de migrations
│       ├── models/
│       │   ├── user.model.js
│       │   └── company.model.js
│       ├── controllers/
│       │   └── auth.controller.js
│       ├── middleware/
│       │   ├── auth.middleware.js   # JWT + verificação de papel (admin/employee)
│       │   ├── errorHandler.js      # tratamento central de erros
│       │   └── validate.js          # validação de entrada (express-validator)
│       ├── routes/
│       │   ├── index.js       # agrega todas as rotas sob /api
│       │   └── auth.routes.js
│       └── utils/
│           └── logger.js      # logs estruturados (Winston)
└── frontend/
    ├── Dockerfile
    ├── nginx.conf             # serve a SPA em produção
    └── src/
        ├── main.jsx
        ├── App.jsx             # rotas da aplicação
        ├── api/client.js       # instância Axios com JWT automático
        ├── context/
        │   ├── AuthContext.jsx   # sessão do usuário
        │   └── ThemeContext.jsx  # modo escuro
        ├── components/
        │   ├── Sidebar.jsx
        │   ├── StatCard.jsx
        │   ├── ThemeToggle.jsx
        │   └── ProtectedRoute.jsx
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            └── Dashboard.jsx
```

## O que já funciona nesta etapa

- Cadastro de empresa + usuário administrador (`POST /api/auth/register`)
- Login com e-mail/senha, retornando JWT (`POST /api/auth/login`)
- Restauração de sessão (`GET /api/auth/me`)
- Sistema de papéis: `admin` e `employee`, com middleware `requireRole`
  pronto para restringir rotas futuras (ex: só admin edita configurações)
- Banco de dados PostgreSQL com migrations versionadas
- Redis conectado e pronto para as filas da Etapa 2 (agendamento de
  mensagens, disparos em massa)
- Segurança: senhas com bcrypt, Helmet, rate limiting, CORS restrito,
  validação de entrada, tratamento central de erros, logs em arquivo
- Frontend: telas de login/cadastro funcionais, dashboard com layout
  completo (sidebar, cards, gráfico), modo escuro persistente,
  animações com Framer Motion

> **Nota sobre o Dashboard:** os números exibidos nos cards e no gráfico
> são dados de exemplo (`MOCK_STATS`, comentado no código-fonte em
> `Dashboard.jsx`) até o módulo de Relatórios (Etapa 5) implementar o
> endpoint real `GET /api/reports/overview`. Todo o resto da tela é
> funcional e já consome a API real.

## Como rodar

### Com Docker (recomendado para produção/VPS)

```bash
cp .env.example .env
# edite o .env com valores reais (senhas, JWT_SECRET, chaves de IA)

docker compose up -d --build
docker compose exec backend npm run migrate
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3333/api/health

### Sem Docker (desenvolvimento local)

Requer PostgreSQL e Redis rodando localmente (ou apontando `DATABASE_URL`
e `REDIS_URL` para instâncias remotas).

```bash
# Backend
cd backend
npm install
cp ../.env.example .env   # ajuste DB_HOST/REDIS_HOST para "localhost"
npm run migrate
npm run dev

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev
```

## Segurança implementada

- Senhas nunca armazenadas em texto puro (bcrypt, 10 salt rounds)
- JWT com expiração configurável
- Rate limiting global contra força bruta/DoS
- Helmet (headers de segurança HTTP)
- CORS restrito à origem do frontend
- Validação de entrada em todas as rotas (express-validator)
- Mensagens de erro de login genéricas (não revelam se o e-mail existe)
- Erros internos nunca expõem stack trace ao cliente

## Etapa 2 — Conexão WhatsApp e atendimento automático

### O que já funciona

- **Conexão via QR Code** (`POST /api/whatsapp/connect`, `GET /api/whatsapp/status`):
  usa Baileys (`@whiskeysockets/baileys`), a mesma lib usada em bots WhatsApp
  não-oficiais. A sessão é salva em disco (`backend/sessions/<companyId>`,
  persistida via volume Docker) e sobrevive a um restart do backend.
- **Recebimento e resposta automática de mensagens** — a cada mensagem
  recebida (`whatsapp.service.js`), o sistema:
  1. Identifica/cria o contato e a conversa
  2. Grava a mensagem recebida no histórico
  3. Chama o motor de automação (`automation.service.js`), que decide a resposta
  4. Envia a resposta de volta e grava no histórico
- **Palavras-chave** (`/api/keywords`): CRUD completo. Se o texto recebido
  *contém* o `trigger_text` cadastrado, responde com `reply_text`.
- **Fluxos de conversa / menus** (`/api/flows`): um fluxo é disparado por uma
  palavra-chave própria (`trigger_keyword`) e navega por `steps` em JSON
  (formato documentado no topo de `flow.model.js`), permitindo menus
  numerados ("1 - Ver horários", "2 - Falar com atendente" etc.).
- **Transferência para atendente humano**: automática quando nenhuma
  regra casa com a mensagem, quando o fluxo tem uma opção `__transfer__`,
  ou manual pelo atendente (`POST /api/conversations/:id/transfer`). Uma
  vez transferida, o bot para de responder automaticamente
  (`is_bot_active = false`) até o atendente devolver com `return-to-bot`.
- **Painel de contatos e histórico** (`/api/contacts`, `/api/conversations`):
  listagem, histórico de mensagens por conversa, resposta manual do
  atendente, e busca full-text em português (`GET /api/conversations/search?q=...`).
- **Frontend**: tela `/whatsapp` com exibição do QR Code (polling a cada 3s)
  e status de conexão em tempo quase real.

> **Fora do escopo desta etapa** (ficam para as próximas): envio de mídia
> (imagem/PDF/vídeo/áudio — Etapa 3), catálogo de produtos e listas de
> transmissão com agendamento (Etapa 3), sugestão de resposta via IA
> (Etapa 4). As tabelas e a arquitetura já preveem esses pontos de
> extensão sem precisar reestruturar o que existe.

### Como testar a conexão WhatsApp

```bash
docker compose up -d --build
docker compose exec backend npm run migrate   # aplica 001 e 002
```

1. Crie uma conta em `/register` e faça login
2. Acesse "Conexão WhatsApp" no menu lateral e clique em "Conectar WhatsApp"
3. Escaneie o QR Code pelo celular (WhatsApp → Aparelhos conectados)
4. Mande uma mensagem de outro número para o WhatsApp conectado — o bot
   responde automaticamente (ou transfere para humano, se nada casar)

### Próximos passos (Etapa 3)

- Catálogo de produtos e envio de imagens/PDFs/vídeos/áudios
- Listas de transmissão com agendamento (usando filas Redis/BullMQ)
- Etiquetas visíveis no painel de contatos (o backend já suporta desde a
  Etapa 1/2 via `contact_tags`; falta a interface)

## Etapa 3 — Catálogo, mídia, transmissões e agendamento

### O que já funciona

- **Upload de mídia** (`POST /api/media/upload`, multipart/form-data):
  valida tipo (imagem/PDF/vídeo/áudio) e tamanho (até 20MB), salva em
  `backend/uploads/` (persistido via volume Docker) e serve os arquivos
  publicamente em `/uploads/<arquivo>`.
- **Envio de mídia pelo WhatsApp** (`whatsapp.service.js` →
  `sendMediaMessage`): imagem, PDF (como documento), vídeo e áudio,
  reaproveitado tanto na resposta manual do atendente quanto nas
  mensagens agendadas/transmissões.
- **Catálogo de produtos** (`/api/products`): CRUD completo com nome,
  descrição, preço (guardado em centavos) e imagem.
- **Listas de transmissão** (`/api/broadcast-lists`): criar/excluir
  listas e adicionar/remover contatos delas.
- **Agendamento de mensagens** (`/api/scheduled-messages`): agenda uma
  mensagem (texto ou mídia) para uma data/hora futura, com destino a um
  único contato **ou** a uma lista de transmissão inteira. O envio de
  fato é feito por uma fila BullMQ/Redis (`queue.service.js`) — o job é
  enfileirado com o delay calculado até o horário agendado, e o Redis
  garante o disparo mesmo que o backend reinicie no meio do caminho. No
  caso de listas, o envio é sequencial com um intervalo de 1,5s entre
  contatos para reduzir o risco de bloqueio por comportamento de spam.
- **Frontend**: telas `/catalogo` (produtos com upload de imagem) e
  `/transmissoes` (gestão de listas + agendamento com anexo de mídia).

> **Nota de arquitetura:** a fila roda no mesmo processo do backend
> (`Worker` do BullMQ é instanciado ao carregar `queue.service.js`).
> Para um volume alto de mensagens agendadas, o ideal futuro é rodar o
> worker em um processo/container separado — a estrutura já permite
> essa separação sem reescrever a lógica de negócio.

## Etapa 4 — Integração com IA (OpenAI, Gemini, Claude)

### O que já funciona

- **Três provedores plugáveis** (`services/ai/providers/*.provider.js`):
  OpenAI, Google Gemini e Anthropic Claude, cada um com um adaptador fino
  que só sabe montar o payload HTTP daquele provedor (sem SDKs extras —
  usa o `fetch` nativo do Node 20). `services/ai/ai.service.js` é o único
  ponto de entrada usado pelo resto do sistema: ele escolhe o provedor
  configurado, monta o prompt e chama o adaptador certo.
- **Configuração por empresa** (`GET`/`PUT /api/ai/settings`, admin):
  liga/desliga a IA, escolhe provedor, modelo, temperatura, quantas
  mensagens de histórico enviar como contexto, e uma **persona** em texto
  livre (tom de voz, regras do negócio) que entra no prompt de sistema.
  A empresa pode opcionalmente usar sua própria chave de API; se não
  informar, o sistema cai para a chave global do `.env`. A chave nunca é
  devolvida ao frontend — só um `has_api_key: true/false`.
- **Contexto de conversa**: tanto a resposta automática quanto a
  sugestão de resposta enviam ao modelo o histórico recente da conversa
  (`max_history_messages`, configurável), não só a última mensagem.
- **Personalização por empresa no prompt**: o prompt de sistema é
  montado dinamicamente com o nome da empresa, a persona configurada, o
  horário de funcionamento e o catálogo de produtos ativos — a IA
  responde com informação real da empresa, sem inventar preços.
- **Resposta automática com IA** (`automation.service.js`, passo 6): se
  a empresa habilitou o modo `"auto"`, quando nada casa com fluxo ou
  palavra-chave e está dentro do horário de funcionamento, a IA responde
  diretamente ao cliente em vez de transferir para humano. Se a chamada
  à IA falhar (chave inválida, provedor fora do ar), cai automaticamente
  no fallback padrão — o cliente nunca fica sem resposta.
- **Resumo de conversa** (`POST /api/ai/conversations/:id/summary`):
  gera um resumo curto (até 4 frases) do que o cliente quer e o que já
  foi combinado, e guarda em cache (`conversations.ai_summary`) para não
  chamar a IA de novo toda vez que o atendente abrir o chat.
- **Sugestão de resposta ao atendente** (`POST
  /api/ai/conversations/:id/suggest-reply`, modo `"suggest"`): gera uma
  resposta pronta com base no histórico da conversa para o atendente
  revisar/editar antes de enviar — a IA nunca envia essa sugestão
  sozinha.
- **Rastreabilidade**: mensagens do bot geradas por IA são marcadas com
  `messages.generated_by_ai = true`, para diferenciar de respostas por
  palavra-chave/fluxo em relatórios futuros (Etapa 5).
- **Frontend**: tela `/configuracoes` (visível a administradores) para
  ligar a IA, escolher provedor/modelo, definir a persona e a chave de
  API.

> **Nota:** a tela de inbox de conversas (`/conversas`) que usa estes
> endpoints foi construída depois — ver "Etapa 5.1" abaixo.

### Próximos passos (Etapa 5)

- Relatórios e estatísticas reais (o dashboard hoje usa `MOCK_STATS`)
- Backup automático do banco de dados

## Etapa 5 — Relatórios, estatísticas e backup automático

### O que já funciona

- **Relatórios reais** (`GET /api/reports/overview`): substitui o
  `MOCK_STATS` do Dashboard por consultas de agregação de verdade
  (`report.model.js`) — mensagens enviadas, clientes atendidos e tempo
  médio de resposta (últimos 7 dias), conversas abertas/encerradas,
  funcionários online, série diária de mensagens para o gráfico, e o
  percentual de respostas do bot geradas por IA vs palavra-chave/fluxo
  (conecta com o `generated_by_ai` da Etapa 4).
- **Backup automático do banco** (`services/backup.service.js` +
  `backupQueue.service.js`): roda `pg_dump` (formato `-Fc`, comprimido)
  todo dia no horário definido em `BACKUP_CRON`, usando um repeatable
  job do BullMQ — a mesma infra de filas já usada para mensagens
  agendadas (Etapa 3), sem precisar de `node-cron` como dependência
  nova. Backups mais antigos que `BACKUP_RETENTION_DAYS` (padrão: 14
  dias) são apagados automaticamente. Os arquivos ficam em
  `backend/backups/` (persistido via volume Docker).
- **Painel de backups** (`GET`/`POST /api/backups`,
  `GET /api/backups/:filename/download`, tudo restrito a admin): lista
  os backups já gerados, permite disparar um backup avulso ("Fazer
  backup agora") e baixar qualquer arquivo — a tela fica em
  `/configuracoes`, junto da configuração de IA.
- **Índices de performance** (migration `005_reports.sql`): índices em
  `messages.created_at` e `conversations.created_at` para os filtros por
  período usados nas agregações dos relatórios.

> ⚠️ **Limitação conhecida:** como o banco é compartilhado entre todas
> as empresas do SaaS (multi-tenant em um único schema), o backup
> gerado por `pg_dump` contém os dados de **todas** as empresas, não só
> da empresa do admin que o disparou/baixou. A rota já fica restrita a
> `role: 'admin'`, mas antes de operar isso com clientes reais, o ideal
> é criar um papel de nível de plataforma (ex: "superadmin"), separado
> do admin de cada empresa cliente, para essa operação.

> ⚠️ **Atualização:** essa limitação foi resolvida na Etapa 5.2 — ver
> abaixo (`isPlatformAdmin`).

### Próximos passos

- Gestão de tags de contato no frontend (o backend já suporta
  associar/remover tags, falta a interface e o endpoint de listagem)

## Etapa 5.1 — Inbox de conversas (frontend)

Tela `/conversas`: lista de conversas à esquerda (nome/telefone do
contato, indicador bot/humano, busca local) e chat da conversa
selecionada à direita — histórico de mensagens (texto e mídia),
composer com envio de texto e anexos, "Assumir conversa" / "Devolver ao
bot", e os dois botões que fecham o ciclo da Etapa 4:

- **Resumir**: chama `POST /api/ai/conversations/:id/summary` e mostra
  o resumo em cache no topo do chat.
- **Sugerir resposta com IA**: chama `POST
  /api/ai/conversations/:id/suggest-reply` e preenche o campo de texto
  com a sugestão — o atendente sempre revisa/edita antes de enviar, a
  IA nunca envia sozinha por aqui.

A lista e o chat atualizam via polling simples (a cada 8s) — não há
WebSocket nesta etapa; se o volume de conversas crescer, vale trocar
por push em tempo real (Socket.IO ou similar) no lugar do polling.

## Etapa 5.2 — Admin de plataforma, exportação de relatórios, Contatos

### Administrador de plataforma (resolve a limitação de backup)

- Nova coluna `users.is_platform_admin` (migration `006`), **separada**
  do `role` ('admin'/'employee', que continua sendo por empresa).
- Concedida só via linha de comando —
  `npm run grant-platform-admin -- email@empresa.com` (ou `--revoke`
  para remover) — nunca por cadastro ou pelo painel, para que ninguém
  se autoconceda acesso a dados de outras empresas.
- `requirePlatformAdmin` (novo middleware) substitui `requireRole('admin')`
  nas rotas de backup. Um admin de empresa comum agora vê uma mensagem
  explicando por que o card de backup não aparece para ele em
  `/configuracoes`, em vez de simplesmente não ver a seção.
- **Atenção:** o JWT carrega `isPlatformAdmin` — quem já estava logado
  antes dessa mudança precisa fazer login de novo para o token refletir
  a permissão.

### Exportação de relatórios

- `GET /api/reports/export.csv` e `GET /api/reports/export.pdf`
  reaproveitam a mesma agregação de `GET /api/reports/overview`
  (refatorada para `buildOverview()`, usada pelos três). CSV é texto
  puro (com BOM UTF-8, para acentos abrirem certo no Excel); PDF usa
  `pdfkit`, gerado direto no stream da resposta, sem arquivo temporário.
- Botões "Exportar CSV" / "Exportar PDF" na nova tela `/relatorios`.

### Telas que faltavam

- `/relatorios`: mesma fonte de dados do Dashboard, em uma página
  dedicada, com os botões de exportação.
- `/contatos`: listagem e busca (nome/telefone) dos contatos da
  empresa. Gestão de tags fica para depois — o backend só tem
  associar/remover tag por contato, ainda falta um endpoint para listar
  as tags disponíveis da empresa.
