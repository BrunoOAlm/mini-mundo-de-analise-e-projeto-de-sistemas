# Painel do empresário e login da área da empresa — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o painel atual da área da empresa por um painel do empresário em seções (visão geral, frota, hoje, financeiro) em fibra de carbono, e o login por clique por um login de e-mail e senha com três administradores.

**Architecture:** Cálculos do painel numa função pura `FC.painelDados` (arquivo próprio, testável no Node), separada da montagem do HTML (`claude/js/painel.js`) e do estilo (`claude/css/painel.css`, escopo `.pnl`). Dados novos (usuários com senha, despesas, cobranças, vistoria pendente) entram na semente de `dados.js` com `SEED_VERSION` 5. Login novo `FC.loginAdmin` no `nucleo.js`, no molde de `FC.login`.

**Tech Stack:** JavaScript puro (ES5, sem build), testes com `node:test` (Node 24) carregando os scripts num contexto `vm`; verificação visual com o servidor local (`python -m http.server 8080`) e Playwright.

**Spec:** `docs/superpowers/specs/2026-11-25-painel-empresario-design.md`

## Global Constraints

- JavaScript puro, sem framework nem build; scripts carregados por `<script>` em `claude/index.html`, padrão IIFE com `var FC = window.FC`.
- Carbono e cartões de vidro **só no painel e no login**; menu lateral e os outros módulos ficam como estão.
- Amarelo `#FFC21A` só em destaques; vermelho para indisponível/atraso; verde para lucro/recebido.
- Administradores (perfil `gestor`, lojas `["*"]`): Bruno Oliveira de Almeida `bruno@fallscar.com.br`, Vladmir dos Santos Oliveira `vladmir@fallscar.com.br`, Carlos Eduardo de Moura Pinto (Cadu) `cadu@fallscar.com.br`.
- Senha de demonstração dos cinco usuários internos: combinada com a equipe fora do repositório; no código só o hash `h20gerb` (de `FC.hash`). O texto da senha nunca entra em código, testes, documentos ou commits.
- Financeiro só para perfil `gestor`; o resto do painel respeita `FC.noEscopo`.
- Todo número do painel sai de `FC.db`; nada escrito direto no HTML.
- Textos da interface em português do Brasil.

## Review Focus

- Usuário com escopo de lojas limitado (atendente/frota em SPPAU, SPPIN, CGH, GRU) deve ver só veículos e movimentos dessas lojas — teste na Task 3.
- Mês sem despesas ou sem receita (ex.: base vazia) não pode gerar `NaN`/`Infinity`; margem e ticket ficam 0 — teste na Task 3.
- Veículo inativo não entra em nenhum total nem na ocupação — teste na Task 3.
- Bloqueio de login vencido deve liberar nova tentativa — teste na Task 2.
- Reserva que começa num mês e termina no outro entra só no faturamento do mês de início — teste na Task 3.

---

### Task 1: Semente — usuários com senha, despesas, cobranças e vistoria pendente

**Files:**
- Create: `tests/carregar.js` (harness), `tests/semente.test.js`
- Modify: `claude/js/dados.js` (`FC.SEED_VERSION`, `usuarios`, retorno de `FC.buildSeed`)

**Interfaces:**
- Produces: `carregar(arquivos: string[], agora?: Date) -> FC` em `tests/carregar.js` — cria contexto `vm` com `window` (stub de `localStorage` em memória), executa os arquivos de `claude/js/` na ordem dada e devolve `window.FC`. Se `agora` vier, substitui `Date` no contexto para que `new Date()`/`Date.now()` sem argumento retornem `agora`.
- Produces (dados): `db.usuarios[i] = { id, nome, email, senhaHash, perfil, lojas, ativo }`; `db.despesas[] = { id, mes: "AAAA-MM", loja, categoria, valor }` com `categoria ∈ "parcelas" | "manutencao" | "seguro" | "equipe" | "outros"`; `db.cobrancas[] = { id, clienteId, reservaCodigo, descricao, valor, vencimento: ISO, pagoEm: ISO|null, metodo }`; `veiculo.aguardandoVistoria: boolean`.

- [ ] **Step 1: Escrever `tests/carregar.js` e o teste que falha**

`tests/semente.test.js` com `node:test` e `assert/strict`, carregando `["dados.js"]` e chamando `FC.buildSeed()`:
- `usuarios` tem os 3 e-mails de administrador, cada um com `perfil === "gestor"`, `lojas` igual a `["*"]`, `senhaHash === "h20gerb"`, `ativo === true`.
- existe usuário `perfil === "atendente"` e `perfil === "frota"`, ambos com `email` e `senhaHash === "h20gerb"`; nenhum usuário com nome `"Gestor (demo)"`.
- `despesas` cobre os 6 meses até o mês atual (`new Set(despesas.map(d => d.mes)).size === 6`) e as 5 categorias.
- `cobrancas` tem pelo menos 1 com vencimento hoje e pelo menos 1 vencida sem `pagoEm`.
- pelo menos 1 veículo com `aguardandoVistoria === true`.
- `FC.SEED_VERSION === 5`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/`
Expected: FAIL (usuários sem e-mail de administrador, `despesas` indefinido).

- [ ] **Step 3: Implementar na semente de `claude/js/dados.js`**

Subir `FC.SEED_VERSION` para 5 (o `loadDB` existente já recria a base quando a versão muda — este é o caminho de migração do projeto). Trocar o usuário `U1 "Gestor (demo)"` pelos três administradores (`U1`, `U4`, `U5`) e acrescentar `senhaHash: "h20gerb"` a todos os usuários. Gerar `despesas` dos 6 meses por loja ativa com o `rnd()` determinístico já existente, em valores coerentes com a frota (parcelas ≈ 40%, manutenção ≈ 22%, seguro ≈ 16%, equipe ≈ 13%, outros ≈ 9% das despesas). Gerar `cobrancas` a partir das reservas de planos semanais e de exemplos fixos: 2–3 vencendo hoje (uma já paga hoje), 2 vencidas há 1 e 2 dias sem pagamento. Marcar 1 veículo disponível com `aguardandoVistoria: true`. Incluir `despesas` e `cobrancas` no objeto devolvido.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test tests/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/carregar.js tests/semente.test.js claude/js/dados.js
git commit -m "Semente: administradores com senha, despesas, cobranças e vistoria"
```

### Task 2: Login da área da empresa por e-mail e senha

**Files:**
- Create: `tests/login-admin.test.js`
- Modify: `claude/js/nucleo.js` (junto de `FC.adminAtual`)

**Interfaces:**
- Consumes: `carregar` (Task 1); `db.usuarios[].email/senhaHash/ativo`.
- Produces: `FC.loginAdmin(email: string, senha: string) -> { usuario } | { erro: string }`. Sucesso grava `FC.db.sessao.adminId` e audita `"Login administrativo"`; falha audita `"Falha de login administrativo"`. Usa a mesma contagem `FC.db.sessao.tentativas` (chave `"admin:" + email`) e `cfg.loginMaxTentativas` / `cfg.loginBloqueioMin` de `FC.login`.

- [ ] **Step 1: Escrever o teste que falha** (`carregar(["dados.js", "nucleo.js"])`)

- no início do teste, trocar `senhaHash` dos usuários por `FC.hash("senha-de-teste-1")`; `loginAdmin("Bruno@FallsCar.com.br", "senha-de-teste-1")` devolve `usuario.nome === "Bruno Oliveira de Almeida"` e `FC.db.sessao.adminId === usuario.id`.
- senha errada devolve `{ erro: "E-mail ou senha incorretos." }` e não muda `adminId`.
- 5 erros seguidos bloqueiam: a 6ª tentativa, mesmo com a senha certa, devolve erro começando com `"Muitas tentativas"`.
- com o bloqueio vencido (`FC.db.sessao.tentativas["admin:bruno@fallscar.com.br"].ate = Date.now() - 1`), a senha certa volta a entrar.
- usuário com `ativo = false` recebe o mesmo erro de credenciais.

- [ ] **Step 2: Rodar e ver falhar** — `node --test tests/` → FAIL (`FC.loginAdmin is not a function`).

- [ ] **Step 3: Implementar `FC.loginAdmin` em `claude/js/nucleo.js`** no molde de `FC.login` (normaliza e-mail em minúsculas, compara `FC.hash(senha)`).

- [ ] **Step 4: Rodar e ver passar** — `node --test tests/` → PASS.

- [ ] **Step 5: Commit** — `git add tests/login-admin.test.js claude/js/nucleo.js && git commit -m "Login da área da empresa por e-mail e senha"`

### Task 3: Cálculos do painel (`FC.painelDados`)

**Files:**
- Create: `claude/js/painel-dados.js`, `tests/painel-dados.test.js`

**Interfaces:**
- Consumes: semente da Task 1.
- Produces: `FC.painelDados(db, agora: Date, opts: { noEscopo(lojaId) -> bool, situacaoDe(veiculo) -> string, verFinanceiro: bool })` devolvendo:
  - `frota: { total, alugados, patio, oficina, vistoria, transferencia, ocupacao /*0..1*/, parados48h: Veiculo[], lista: [{ veiculo, situacao: "alugado"|"patio"|"oficina"|"vistoria"|"transferencia", onde: string, quando: string }], porCategoria: [{ grupo, ocupacao }] }`
  - `hoje: { recebimentos: { total, itens: Cobranca[] }, atrasados: { total, itens: [{ cobranca, dias }] }, movimento: [{ hora: Date, tipo: "retirada"|"devolucao", reserva }], pendencias: [{ rotulo, ref, link }] }`
  - `financeiro: null | { mes: { faturamento, despesas, lucro, margem, ticket, variacaoLucro }, serie: [{ mes: "AAAA-MM", faturamento, despesas, lucro }] /*6, do mais antigo ao atual*/, despesasPorCategoria: [{ categoria, valor }] /*maior primeiro*/ }`
- Mapa de situação: `"locado"→alugado`, `"disponível"|"reservado"|"bloqueado (pagamento)"→patio` (ou `vistoria` se `aguardandoVistoria`), `"manutenção"→oficina`, `"em transferência"→transferencia`; `"inativo"` fica fora de tudo.

- [ ] **Step 1: Escrever o teste que falha** (`carregar(["dados.js","nucleo.js","painel-dados.js"], agoraFixo)`, `situacaoDe = FC.situacaoAtual`)

- soma `alugados + patio + oficina + vistoria + transferencia === total`, e `total` exclui inativos (inativar um veículo baixa `total` em 1).
- `ocupacao === alugados / total`; com `db.veiculos = []`, `ocupacao === 0` (sem `NaN`).
- veículo `disponível` sem locação encerrada nas últimas 48 h aparece em `parados48h`; um com locação encerrada há 10 h não aparece.
- `noEscopo` só de `"SPPAU"` → todo item de `frota.lista` tem `veiculo.localAtual === "SPPAU"`.
- `verFinanceiro: false` → `financeiro === null`.
- `financeiro.mes.lucro === faturamento - despesas`; `serie.length === 6`; `despesasPorCategoria` em ordem decrescente e somando `mes.despesas`.
- reserva aprovada que começa no último dia do mês anterior e termina neste mês entra só no faturamento do mês anterior.
- `db.reservas = []` e `db.despesas = []` → `margem === 0` e `ticket === 0`.
- `hoje.atrasados.itens` traz as cobranças vencidas sem `pagoEm`, com `dias` ≥ 1; `hoje.recebimentos.total` soma as cobranças com vencimento hoje.
- `hoje.pendencias` inclui as categorias do painel antigo (pagamento pendente, exceção, transferência atrasada, CNH pendente, chamado aberto, despesa contestada) quando existirem na base.

- [ ] **Step 2: Rodar e ver falhar** — `node --test tests/` → FAIL (`FC.painelDados is not a function`).

- [ ] **Step 3: Implementar `FC.painelDados` em `claude/js/painel-dados.js`**

Faturamento do mês = `preco.total` das reservas com `pagamento === "aprovado"` e início no mês + `valor` das cobranças com `pagoEm` no mês. Ticket = faturamento das reservas ÷ quantidade (0 se nenhuma). `variacaoLucro` = (lucro do mês − lucro do mês anterior) ÷ |lucro anterior| (0 se anterior for 0). Pendências reaproveitam as mesmas regras do `FC.adminPages.painel` atual (em `claude/js/admin.js`), sem chamar o DOM.

- [ ] **Step 4: Rodar e ver passar** — `node --test tests/` → PASS.

- [ ] **Step 5: Commit** — `git add claude/js/painel-dados.js tests/painel-dados.test.js && git commit -m "Cálculos do painel do empresário"`

### Task 4: Telas — painel em carbono e login

**Files:**
- Create: `claude/js/painel.js`, `claude/css/painel.css`
- Modify: `claude/js/admin.js` (remover `FC.adminPages.painel` e `loginAdmin`, chamar `FC.telaLoginAdmin(view)`), `claude/index.html` (link de `css/painel.css`; scripts `js/painel-dados.js` e `js/painel.js` depois de `js/admin.js`), símbolo `#i-logo` já existe em `claude/index.html`.

**Interfaces:**
- Consumes: `FC.painelDados` (Task 3), `FC.loginAdmin` (Task 2), `FC.situacaoAtual`, `FC.noEscopo`, `FC.adminAtual`, `FC.brl`, `FC.icon`.
- Produces: `FC.adminPages.painel(main)` e `FC.telaLoginAdmin(view)`.

- [ ] **Step 1: Implementar `claude/css/painel.css`** — tudo sob `.pnl` (painel) e `.pnl-login` (login): fundo de carbono e cartões de vidro exatamente como no esboço aprovado `painel-carbono-v3.html` (gradientes de 20 px, vinheta, brilho amarelo; cartão `linear-gradient(180deg, rgba(30,30,30,.78), rgba(14,14,14,.82))`, borda `rgba(255,255,255,.08)`, `backdrop-filter: blur(10px)`); menu de seções fixo (`position: sticky`) com logo + "FallsCar" antes de "Visão geral" e pílula amarela na seção ativa; grades que viram uma coluna abaixo de 900px; menu de seções com rolagem horizontal em tela estreita; foco visível amarelo.

- [ ] **Step 2: Implementar `FC.adminPages.painel(main)` em `claude/js/painel.js`** — chama `FC.painelDados(FC.db, new Date(), { noEscopo: FC.noEscopo, situacaoDe: FC.situacaoAtual, verFinanceiro: FC.adminAtual().perfil === "gestor" })` e monta as quatro seções na ordem e com os blocos da spec (Visão geral: anel de ocupação, indisponíveis, pendências de hoje, lucro com margem e variação; Frota: 5 totais, tabela, ocupação por categoria; Hoje: recebimentos, atrasados, movimento do pátio + pendências com link; Financeiro: 4 números, colunas de 6 meses, despesa por categoria). Sem a seção Financeiro (nem o item no menu, nem o cartão de lucro) para quem não é gestor. Menu de seções com âncoras e destaque da seção visível (`IntersectionObserver`).

- [ ] **Step 3: Implementar `FC.telaLoginAdmin(view)`** — cartão centralizado com logo (`<use href="#i-logo"/>`), "Falls**Car**", "Área da empresa", campos `E-mail` e `Senha` com `<label>`, botão "Entrar", "Esqueci minha senha" (mostra toast: senha redefinida pelo gestor em Usuários internos) e a nota: "Protótipo: a senha é verificada no navegador; a proteção real vem com o backend." Envio chama `FC.loginAdmin`; erro aparece no formulário com `role="alert"`; sucesso vai para `#/admin/painel`.

- [ ] **Step 4: Verificar no navegador**

Run: servidor local já em `http://localhost:8080`; com Playwright abrir `http://localhost:8080/claude/index.html#/admin`, entrar com `cadu@fallscar.com.br` e a senha de demonstração (fornecida pela equipe; não registrar em arquivo), capturar o painel inteiro; repetir com o operador de frota.
Expected: login com logo no carbono; painel com as quatro seções e números iguais aos de `FC.painelDados` no console; operador de frota sem Financeiro; sem erros no console além do `favicon.ico`; sem rolagem horizontal em 390px de largura.

- [ ] **Step 5: Rodar os testes** — `node --test tests/` → PASS.

- [ ] **Step 6: Commit** — `git add claude/js/painel.js claude/css/painel.css claude/js/admin.js claude/index.html && git commit -m "Painel do empresário em fibra de carbono e login por e-mail"`

### Task 5: Publicar

**Files:** nenhum no repositório (pacote de deploy fora dele, receita na memória `cloudflare-deploy`).

- [ ] **Step 1:** `git push origin main` → `main -> main`.
- [ ] **Step 2:** Montar o pacote (`git archive HEAD`, sem `README.md`, sem `tests/` e `docs/`, com `404.html`, `_worker.js`, `_routes.json`) e rodar `npx wrangler pages deploy <dir> --project-name faeterj --branch fallscar --commit-dirty=true`.
Expected: "Deployment complete" e `https://fallscar.faeterj.pages.dev/claude/js/painel.js` respondendo 200.
