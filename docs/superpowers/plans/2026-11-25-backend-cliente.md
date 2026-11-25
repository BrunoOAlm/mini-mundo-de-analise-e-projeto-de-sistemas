# Backend do site do cliente — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conta do cliente, reserva com pagamento simulado e painel "Meus veículos" gravados num banco D1, servidos por uma API no mesmo worker do Cloudflare Pages.

**Architecture:** Núcleo do servidor injetável `criarServidor({ db, FC, agora, aleatorio })` em `server/` (ESM `.mjs`), com uma interface de banco igual à do D1 (`prepare().bind().first()/all()/run()`, `batch()`); nos testes, um adaptador sobre `node:sqlite`. O worker (`server/worker.mjs`) carrega `claude/js/dados.js` + `nucleo.js` para ter catálogo, `calcularPreco` e `avaliaCondutor`, atende `/api/*` e repassa o resto para `env.ASSETS` (com o tratamento de `Range` atual). Empacotado com esbuild num `_worker.js` só. O front ganha `FC.api` e passa a usar a API no login, busca, reserva, confirmação e na tela nova.

**Tech Stack:** Cloudflare Pages (modo avançado `_worker.js`) + D1; WebCrypto (PBKDF2-SHA256, SHA-256); `node:test` + `node:sqlite` (Node 24); esbuild e wrangler via `npx`; front em JS puro.

**Spec:** `docs/superpowers/specs/2026-11-25-backend-cliente-design.md`

## Global Constraints

- Hospedagem Cloudflare Pages, projeto `faeterj`, alias `fallscar`; banco D1 com binding `DB`; API em `/api/*` no mesmo `_worker.js`; `_routes.json` inclui `/api/*` e `/figma/media/*`.
- Senha: PBKDF2-SHA256, sal de 16 bytes por cliente, 100 000 iterações, formato `pbkdf2$100000$<sal-b64>$<hash-b64>`; mínimo `config.senhaMin` (8).
- Sessão: cookie `fc_sessao`, token aleatório de 32 bytes (base64url), `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`; no banco só `sha256(token)` em hex.
- Login: no máximo `config.loginMaxTentativas` (5) erros, bloqueio de `config.loginBloqueioMin` (10) minutos por identificador; mensagem única `"E-mail/CPF ou senha incorretos."`.
- Bloqueio de pagamento: `config.holdMin` (15) minutos.
- Escritas (`POST`) exigem `Content-Type: application/json` e `Origin` igual à origem da requisição; senão 403.
- Preço e conflito sempre recalculados no servidor; o preço enviado pelo navegador é ignorado.
- Nunca gravar dados de cartão; pagamento é simulado (`resultado ∈ aprovado | recusado | pendente | aprovado_tardio`).
- Resposta de erro: `{ "erro": string, "campos"?: { [campo]: string } }`.
- Textos para o usuário em português do Brasil.

## Review Focus

- Dois `POST /api/reservas` simultâneos para o mesmo veículo e período: só um cria a reserva; o outro recebe 409 — teste na Task 3.
- Cliente A pedindo `GET /api/reservas/<código de B>`: 404, sem vazar nada — teste na Task 3.
- Mesmo `idEvento` de pagamento enviado duas vezes: uma confirmação, um registro de pagamento — teste na Task 4.
- Bloqueio vencido não impede outra pessoa de reservar o carro — teste na Task 3.
- Refresh da página com sessão válida mantém o cliente logado (`GET /api/eu` 200) e sessão expirada desloga (401) — teste na Task 2.

---

### Task 1: Banco — esquema e adaptador de testes

**Files:**
- Create: `server/migracoes/0001_inicial.sql`, `tests/db-sqlite.mjs`, `tests/esquema.test.mjs`

**Interfaces:**
- Produces: `abrirBanco(): DbLikeD1` em `tests/db-sqlite.mjs` — banco em memória com o esquema aplicado; `prepare(sql).bind(...args)` com `.first()`, `.all() -> { results }`, `.run() -> { meta: { changes } }`, e `batch(stmts) -> Promise<results[]>` atômico (transação).
- Produces (esquema): `clientes(id TEXT PK, nome, email UNIQUE, doc_tipo, doc UNIQUE, telefone, nascimento, cnh_json, senha_hash, criado_em)`; `sessoes(token_hash PK, cliente_id, expira_em)`; `tentativas(ident PK, n, ate)`; `reservas(codigo PK, cliente_id, veiculo_id, motorista_id, loja_retirada, loja_devolucao, inicio, fim, estado, pagamento, metodo, parcelas, preco_json, sel_json, tarifa_versao, bloqueio_expira, criado_em)`; `pagamentos(id_evento PK, reserva_codigo, metodo, parcelas, valor, resultado, criado_em)`; `eventos(id INTEGER PK, reserva_codigo, data, autor, texto)`; `ocupacao(id INTEGER PK, recurso, inicio, fim, tipo, ref, expira_em)` com índice em `(recurso, inicio, fim)`; `cupons_uso(codigo, reserva_codigo, cliente_id)`. Datas em ISO 8601 UTC.

- [ ] **Step 1:** Teste `tests/esquema.test.mjs`: `abrirBanco()` cria as 8 tabelas (`sqlite_master`); inserir dois clientes com o mesmo e-mail falha; `batch` com uma instrução inválida não grava nenhuma das outras.
- [ ] **Step 2:** `node --test "tests/*.test.*js"` → FAIL (módulo inexistente).
- [ ] **Step 3:** Escrever o SQL e o adaptador (`DatabaseSync(":memory:")`, `exec` do arquivo, `batch` com `BEGIN`/`COMMIT`/`ROLLBACK`).
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit `Banco do backend: esquema e adaptador de testes`.

### Task 2: Contas e sessão

**Files:**
- Create: `server/cripto.mjs`, `server/contas.mjs`, `tests/contas.test.mjs`

**Interfaces:**
- Consumes: `abrirBanco` (Task 1).
- Produces: `hashSenha(senha) -> Promise<string>`, `confereSenha(senha, hash) -> Promise<bool>`, `novoToken() -> string`, `sha256hex(s) -> Promise<string>` em `cripto.mjs`; em `contas.mjs`: `cadastrar(ctx, dados) -> { cliente, token } | { erro, campos }`, `entrar(ctx, ident, senha) -> { cliente, token } | { erro, status }`, `sair(ctx, token)`, `clienteDaSessao(ctx, token) -> cliente | null`, `perfilPublico(cliente)` (sem `senha_hash`). `ctx = { db, FC, agora: () => Date }`.

- [ ] **Step 1:** Testes: cadastro válido devolve cliente + token e `clienteDaSessao(token)` acha o cliente; e-mail ou CPF repetido → `erro` com `campos.email`/`campos.doc`; CPF inválido (`FC.cpfValido`) e senha < 8 → `campos`; `entrar` por e-mail (maiúsculas) e por CPF com pontuação funciona; senha errada → `"E-mail/CPF ou senha incorretos."`; 5 erros → 6ª tentativa com senha certa recusada (`status 429`); bloqueio vencido libera; sessão com `expira_em` no passado → `null`; `sair` invalida o token; `perfilPublico` não tem `senha_hash`; banco guarda `sha256(token)`, nunca o token.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar com WebCrypto (`crypto.subtle`, `crypto.getRandomValues`).
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit `Contas de cliente e sessão no servidor`.

### Task 3: Reservas e ocupação

**Files:**
- Create: `server/reservas.mjs`, `tests/reservas.test.mjs`, `tests/fc-servidor.mjs`

**Interfaces:**
- Consumes: Task 1, Task 2; `FC.calcularPreco(sel, { clienteId })`, `FC.avaliaCondutor(cnh, veiculo, fim, rotulo)`, `FC.veiculoById`, `FC.cfg()`, `FC.novoCodigo()`.
- Produces: `carregarFC() -> FC` em `tests/fc-servidor.mjs` (via `tests/carregar.js`, sem `localStorage` real); em `reservas.mjs`: `ocupados(ctx, inicio, fim) -> [{ recurso, inicio, fim }]`, `criarReserva(ctx, cliente, sel) -> { reserva } | { erro, status, campos? }`, `listarReservas(ctx, clienteId) -> reserva[]`, `obterReserva(ctx, clienteId, codigo) -> reserva | null`. `sel` = `{ veiculoId, lojaRetirada, lojaDevolucao, inicio, fim, motorista?, protecoes?, acessorios?, km?, cupom?, plano?, condutorPrincipal: { proprio: bool, cnh }, condutores?: [{ nome, cnh }], aceite: { versao } }`. `reserva` devolvida ao front: `{ codigo, veiculoId, lojaRetirada, lojaDevolucao, inicio, fim, estado, pagamento, metodo, preco, bloqueioExpira, eventos, criadoEm }`.

- [ ] **Step 1:** Testes:
  - cria reserva `aguardando_pagamento` com `preco.total` igual a `FC.calcularPreco` do mesmo `sel` (ignora `sel.preco` mandado);
  - grava ocupação `bloqueio` do veículo com `expira_em = agora + holdMin`;
  - segundo cliente, mesmo veículo e período sobreposto → `status 409`;
  - os dois pedidos disparados com `Promise.all` → exatamente um sucesso;
  - bloqueio vencido não conta (avançar o relógio 16 min e reservar de novo dá certo);
  - motorista ocupado no período → 409; CNH incompatível (categoria B numa moto) → `status 400` com `campos.cnh`;
  - sem `aceite` → 400; `inicio` no passado ou `fim <= inicio` → 400;
  - cliente sem CNH no perfil e `condutorPrincipal.proprio` → CNH gravada no perfil;
  - `obterReserva` de outro cliente → `null`; `listarReservas` só do dono, mais recentes primeiro;
  - `ocupados` não traz dados de cliente.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar. A ocupação usa uma instrução condicional:

```sql
INSERT INTO ocupacao (recurso, inicio, fim, tipo, ref, expira_em)
SELECT ?1, ?2, ?3, ?4, ?5, ?6
WHERE NOT EXISTS (SELECT 1 FROM ocupacao WHERE recurso = ?1 AND inicio < ?3 AND fim > ?2
                  AND (expira_em IS NULL OR expira_em > ?7))
```

  `recurso` = `"V:" + veiculoId` ou `"M:" + motoristaId`. Veículo primeiro; se `changes = 0` → 409. Motorista em seguida; se falhar, apagar a ocupação do veículo criada e devolver 409. Depois `batch` com reserva + eventos + uso de cupom.
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit `Reservas com bloqueio e sem sobreposição no servidor`.

### Task 4: Pagamento simulado e confirmação

**Files:**
- Modify: `server/reservas.mjs`; Create: `tests/pagamento.test.mjs`

**Interfaces:**
- Produces: `pagar(ctx, cliente, codigo, { metodo, parcelas, resultado, idEvento }) -> { reserva, msg } | { erro, status }`.

- [ ] **Step 1:** Testes: `aprovado` com bloqueio ativo → `estado confirmada`, `pagamento aprovado`, ocupação vira `tipo reserva` sem `expira_em`; `recusado` → continua `aguardando_pagamento`; `pendente` → `pagamento pendente`; mesmo `idEvento` duas vezes → um registro em `pagamentos`, mesma resposta; segunda aprovação com outro `idEvento` numa reserva já aprovada → `duplicado`, sem novo pagamento; `aprovado_tardio` com o carro ainda livre → confirma; `aprovado_tardio` com o carro reservado por outro → `estado excecao` e evento de reembolso; reserva de outro cliente → 404; `metodo` fora de `pix|credito|debito` → 400.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar (mesma semântica de `FC.processarPagamento`, agora no banco).
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit `Pagamento simulado e confirmação no servidor`.

### Task 5: API HTTP e worker

**Files:**
- Create: `server/api.mjs`, `server/worker.mjs`, `server/assets.mjs`, `tests/api.test.mjs`

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces: `tratarApi(request, ctx) -> Promise<Response>` em `api.mjs` com as rotas da spec (`POST /api/cadastro|login|sair`, `GET /api/eu`, `GET /api/ocupacao`, `POST /api/reservas`, `POST /api/reservas/:codigo/pagamento`, `GET /api/reservas`, `GET /api/reservas/:codigo`); `server/assets.mjs` exporta `servirAsset(request, env)` (o `Range` → 206 do `_worker.js` atual); `server/worker.mjs` exporta `default { fetch(request, env) }` que monta `ctx` com `env.DB`, carrega `FC` uma vez (`globalThis.window = globalThis` + imports de `claude/js/dados.js` e `nucleo.js`) e despacha `/api/*` para `tratarApi`, o resto para `servirAsset`.

- [ ] **Step 1:** Testes com `Request` do Node: cadastro devolve `Set-Cookie fc_sessao=...; HttpOnly; Secure; SameSite=Lax`; `GET /api/eu` com o cookie → 200 e sem cookie → 401; `POST` sem `Content-Type: application/json` → 403; `Origin` diferente → 403; rota desconhecida → 404 JSON; erro interno vira 500 JSON sem stack; `GET /api/reservas` sem sessão → 401; cabeçalho `Cache-Control: no-store` em toda resposta da API.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar → PASS; `npx --yes esbuild server/worker.mjs --bundle --format=esm --outfile=<tmp>/_worker.js` compila sem erro.
- [ ] **Step 5:** Commit `API HTTP e worker do site`.

### Task 6: Rodar localmente e preparar a base

**Files:**
- Create: `wrangler.toml`, `scripts/preparar-base.mjs`, `scripts/pacote.mjs`, `package.json` (só scripts, sem dependências)

**Interfaces:**
- Produces: `node scripts/pacote.mjs <dir>` monta o pacote de deploy (arquivos do git sem `tests/ docs/ server/ scripts/`, `404.html`, `_routes.json` com `/api/*` e `/figma/media/*`, `_worker.js` do esbuild); `node scripts/preparar-base.mjs > <arquivo.sql>` gera o SQL das contas de exemplo (Ana, Bruno Carvalho, Carla, John, senha de demonstração de `dados.js`) e das reservas de exemplo (Ana: 1 em andamento, 1 próxima, 2 no histórico; demais: 1 no histórico), datas relativas a hoje; `npm run dev` = pacote + migrações locais + `wrangler pages dev`.

- [ ] **Step 1:** Teste `tests/preparar-base.test.mjs`: o SQL gerado, aplicado no `abrirBanco()`, deixa `entrar("ana@exemplo.com", senha de demonstração)` funcionando e `listarReservas` da Ana com 1 `em_andamento`, 1 `confirmada` futura e 2 `encerrada`.
- [ ] **Step 2:** Rodar → FAIL. **Step 3:** Implementar. **Step 4:** Rodar → PASS.
- [ ] **Step 5:** `npm run dev` sobe em `http://localhost:8788`; `curl -s localhost:8788/api/eu` → `{"erro":...}` 401; `curl -s -o /dev/null -w "%{http_code}" localhost:8788/figma/` → 200.
- [ ] **Step 6:** Commit `Rodar o backend localmente e base de exemplo`.

### Task 7: Front — login, busca, reserva e confirmação pela API

**Files:**
- Modify: `claude/js/nucleo.js` (`FC.api`), `claude/js/paginas.js` (`FC.authWidget`), `claude/js/cliente.js` (busca, etapas de revisão/pagamento, confirmação), `claude/js/layout.js` (restaurar sessão antes do primeiro render)

**Interfaces:**
- Consumes: rotas da Task 5.
- Produces: `FC.api(metodo, caminho, corpo) -> Promise<{ ok, status, dados }>`; `FC.sessaoCliente() -> Promise<cliente|null>` (chama `GET /api/eu`, grava a cópia em `FC.db.clientes` e `FC.db.sessao.clienteId`, ou apaga a cópia se 401); `FC.sairCliente()`.

- [ ] **Step 1:** No navegador (Playwright, `npm run dev`), roteiro que falha hoje: cadastrar cliente novo → recarregar a página → continua logado; reservar um carro até "Pix aprovado" → confirmação mostra o código; abrir outro contexto anônimo, logar com outra conta e buscar o mesmo período e loja → o carro não aparece.
- [ ] **Step 2:** Implementar: login/cadastro via API; `FC.sessaoCliente()` antes do primeiro `FC.render`; busca chama `GET /api/ocupacao` e soma as ocupações à agenda antes de listar; revisão chama `POST /api/reservas` e usa o preço devolvido; pagamento chama a rota de pagamento com `idEvento` gerado uma vez por clique; confirmação/comprovante leem `GET /api/reservas/:codigo`; erros da API aparecem no campo ou em `.note--bad`.
- [ ] **Step 3:** Rodar o roteiro do Step 1 → passa; sem erros no console; `node --test` continua verde.
- [ ] **Step 4:** Commit `Site usa a API: login, busca, reserva e confirmação`.

### Task 8: Painel "Meus veículos"

**Files:**
- Create: `claude/js/meus-veiculos.js`, `claude/css/meus-veiculos.css`; Modify: `claude/index.html` (script e css), `claude/js/interface.js` (link na barra e no menu)

**Interfaces:**
- Consumes: `GET /api/reservas`, `FC.vehImg`, `FC.lojaById`, `FC.veiculoById`, `FC.brl`, `FC.dtBR`.
- Produces: rota `FC.route("meus-veiculos", ...)`; link "Meus veículos" para cliente logado no lugar de "Minhas reservas".

- [ ] **Step 1:** Roteiro no navegador que falha hoje: entrar como Ana → "Meus veículos" na barra → tela mostra 1 locação em andamento em destaque, 1 próxima e 2 no histórico, cada uma com foto, lojas, datas, valor e link "Ver comprovante"; sem login, `#/meus-veiculos` pede login.
- [ ] **Step 2:** Implementar no visual branco do site (cartões como `.group-card`, títulos como `.page > h1`).
- [ ] **Step 3:** Roteiro passa; celular (390 px) sem rolagem horizontal.
- [ ] **Step 4:** Commit `Painel Meus veículos do cliente`.

### Task 9: Publicar

- [ ] **Step 1 (pedir aval antes):** `npx wrangler d1 create fallscar` (conta Cloudflare da equipe); gravar o `database_id` no `wrangler.toml`; ligar o binding `DB` ao projeto `faeterj` (preview e produção); aplicar `server/migracoes` e a base de exemplo no banco remoto.
- [ ] **Step 2:** `git push origin main`; `node scripts/pacote.mjs <dir>`; `npx wrangler pages deploy <dir> --project-name faeterj --branch fallscar --commit-dirty=true`.
- [ ] **Step 3:** No ar: `curl https://fallscar.faeterj.pages.dev/api/eu` → 401 JSON; login da Ana pelo site → "Meus veículos" com 4 reservas; vídeo do hero responde 206 a `Range`.
