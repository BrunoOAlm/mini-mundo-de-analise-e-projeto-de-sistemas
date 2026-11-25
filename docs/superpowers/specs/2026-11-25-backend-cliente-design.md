# Backend do site do cliente — design

Data: 2026-11-25 · Projeto: Falls Car (protótipo acadêmico, Análise e Projeto de Sistemas)
Equipe: Bruno Oliveira de Almeida, Vladmir dos Santos Oliveira, Carlos Eduardo de Moura Pinto (Cadu)

## Intenção

Hoje tudo do site vive no `localStorage` de cada navegador: a conta do cliente, as reservas e os pagamentos somem
ao limpar o navegador, outra pessoa nunca vê o que você reservou e nada impede duas pessoas de fecharem o mesmo carro.
A equipe quer "um backend decente": o cliente **clica num carro e aluga** de verdade, **tem o próprio login** e um
**painel com os veículos que alugou**, e **dar refresh na página não apaga nada**. Atende os requisitos de servidor do
trabalho: RF05, RF22, RF45, RF50, RF53, RF78–RF80, RN02, RN03, RNF06, RNF07, RNF32, RNF34, RNF38.

## Objetivos

1. **Conta do cliente no servidor** — cadastro (nome, e-mail, CPF ou passaporte, telefone, nascimento, CNH,
   senha), login por e-mail ou CPF + senha, sair. Sessão sobrevive ao refresh e ao fechar a aba. Cada cliente só
   lê e altera o que é dele.
2. **Clicar e alugar** — o fluxo de reserva atual (busca → veículo → etapas → revisão → pagamento) passa a criar a
   reserva no servidor, com bloqueio temporário do veículo durante o pagamento (RF78) e **confirmação no servidor**
   só com pagamento aprovado e o veículo livre no período inteiro (RN02, RN03, RF80). Pagamento continua simulado
   (Pix, crédito, débito; aprovado, recusado, pendente) e nunca guarda dados de cartão (RNF07).
3. **Painel do cliente ("Meus veículos")** — tela nova, no visual branco do site, só de consulta: locação em
   andamento em destaque, próximas reservas, histórico, e cada reserva com veículo (foto), lojas, datas, valor pago e
   comprovante. Dados vindos do servidor.
4. **Disponibilidade compartilhada** — a busca do site considera também as reservas gravadas no servidor, de modo que
   um carro alugado por uma pessoa some da busca de outra.

## Não objetivos

- Área da empresa (painel do empresário, reservas, frota, clientes) continua com os dados de demonstração do
  navegador. Reservas feitas pelo site **não** aparecem lá neste projeto (será o projeto seguinte).
- A tela "Minha conta" existente fica como está; não migra cancelar/alterar/check-in para o servidor.
- Pagamento real, e-mail/SMS reais, upload de documento, login Google.
- Cadastro de frota, lojas e tarifas no servidor: o catálogo continua definido em `claude/js/dados.js`.

## Anti-objetivos

- Confiar no navegador para preço ou disponibilidade: o total e a checagem de conflito são refeitos no servidor; o
  valor enviado pelo navegador é ignorado.
- Duas reservas confirmadas para o mesmo veículo em períodos que se sobrepõem, mesmo com cliques simultâneos ou
  repetição do mesmo pagamento.
- Senha em texto ou hash fraco no servidor; sessão legível por JavaScript (token fica em cookie `HttpOnly`).
- Um cliente vendo reserva de outro (inclusive trocando o código na URL).
- Quebrar o que já funciona: página inicial, busca, vídeo do hero, área da empresa e o deploy atual.

## Restrições

- Hospedagem continua no **Cloudflare Pages** (projeto `faeterj`, alias `fallscar`), deploy manual por
  `wrangler pages deploy`. Banco **Cloudflare D1** (SQLite). Servidor não dorme (cada requisição sobe na hora).
- O site já publica um `_worker.js` próprio (responde `Range` com 206 para vídeo no Safari). Nesse modo o Pages
  ignora a pasta `functions/`; **a API mora no mesmo worker**, em `/api/*`, e o resto continua servido por
  `env.ASSETS` com o tratamento de `Range` atual.
- Front em JavaScript puro, sem build, como hoje. Workers não permitem `eval`/`new Function`.
- Dados de demonstração e ambiente identificados como tais (RNF36); a senha de demonstração dos clientes já é pública
  no repositório (`Senha@123`, em `dados.js`) e continua só para as contas de exemplo.

## Abordagens consideradas

1. **Híbrido — escolhida pela equipe.** D1 guarda o que precisa ser verdade para todos: clientes, sessões, reservas,
   pagamentos simulados, eventos e a ocupação dos veículos. O catálogo continua em `dados.js` e o servidor usa a mesma
   fonte para recalcular preço e conferir habilitação. A busca pergunta ao servidor o que está ocupado; a confirmação
   acontece no servidor numa gravação que recusa sobreposição.
2. Tudo no servidor (catálogo, busca, conta e telas atuais via API). Mais "correto", muito maior e mexe nas telas que
   a equipe quer manter. Descartada.
3. Só gravar a reserva paga, disponibilidade decidida no navegador. Menor, mas permite reserva dupla (quebra RN03 e o
   critério de concorrência). Descartada.

## O que fica decidido (escolhas nossas, revisáveis)

**API (JSON, mesma origem, `/api`)**
- `POST /api/cadastro`, `POST /api/login`, `POST /api/sair`, `GET /api/eu` (cliente da sessão ou 401).
- `GET /api/ocupacao?inicio=&fim=` — veículos ocupados no intervalo (só ids e intervalos; nada pessoal).
- `POST /api/reservas` — cria reserva `aguardando_pagamento` com bloqueio de `holdMin` minutos (valor de
  `config.holdMin` em `dados.js`); recalcula o preço no servidor; 409 se o veículo já estiver ocupado.
- `POST /api/reservas/:codigo/pagamento` — `{ metodo, parcelas, resultado, idEvento }`; idempotente por `idEvento`;
  confirma só se aprovado, bloqueio ativo e sem conflito; recusa não confirma; aprovação tardia sem capacidade vira
  `excecao` com reembolso registrado (RF81).
- `GET /api/reservas` (as do cliente da sessão) e `GET /api/reservas/:codigo` (404 se não for do cliente).
- Erros com `{ erro, campos? }` e status HTTP coerente (400/401/404/409/429).

**Dados (D1)** — tabelas `clientes`, `sessoes`, `reservas`, `pagamentos`, `eventos`, `ocupacao`
(veículo, início, fim, tipo `bloqueio|reserva`, ref, expira_em). Preço e itens gravados na reserva com a versão da
tarifa (RNF35). Migrações SQL versionadas no repositório.

**Concorrência (RN03/RNF34)** — a ocupação é gravada com uma única instrução condicional (inserir só se não existir
intervalo sobreposto ativo para o veículo) e a reserva só segue se a inserção afetou 1 linha; bloqueios vencidos não
contam. Pagamento repetido com o mesmo `idEvento` devolve o resultado anterior sem cobrar nem confirmar de novo.

**Segurança**
- Senha com PBKDF2-SHA256 (WebCrypto), sal por usuário, 100 000 iterações; mínimo `config.senhaMin`.
- Sessão: token aleatório de 32 bytes em cookie `HttpOnly; Secure; SameSite=Lax; Path=/`, validade 30 dias; no
  banco só o SHA-256 do token. Sair apaga a sessão.
- Login limitado por `config.loginMaxTentativas` / `config.loginBloqueioMin` por identificador (RNF09), com a mesma
  mensagem para usuário inexistente e senha errada.
- Toda rota de escrita exige `Content-Type: application/json` e `Origin` igual ao site (contra CSRF).
- Toda consulta de reserva filtra por `cliente_id` da sessão (RNF32).

**Front**
- `FC.api(metodo, caminho, corpo)` centraliza as chamadas (`fetch` com `credentials: "same-origin"`).
- Login/cadastro do site (`FC.authWidget`) passam a usar a API. Ao abrir o site, `GET /api/eu` restaura o cliente
  logado — por isso o refresh não desloga.
- Busca: antes de listar veículos, `GET /api/ocupacao` acrescenta as ocupações do servidor às do catálogo local.
- Reserva: a etapa de revisão chama `POST /api/reservas`; a etapa de pagamento chama a rota de pagamento; a
  confirmação e o comprovante leem `GET /api/reservas/:codigo`. O rascunho da reserva continua no navegador; o que
  foi pago fica no servidor.
- **Meus veículos**: rota nova `#/meus-veiculos`, link "Meus veículos" na barra do site para cliente logado (no
  lugar de "Minhas reservas" quando logado pela API). Visual branco do site.

**Contas de exemplo** — a migração inicial cria no D1 os clientes de exemplo de `dados.js` (Ana, Bruno Carvalho,
Carla, John) com a mesma senha de demonstração, para a apresentação.

**Desenvolvimento local** — `wrangler pages dev` com D1 local roda site + API + banco na máquina; um script de
"preparar base" aplica as migrações e as contas de exemplo (RNF38: preparar/restaurar base de apresentação).

**Testes** — a lógica do servidor (cadastro, login, criação de reserva, pagamento, concorrência, isolamento entre
clientes) é testada no Node com SQLite em memória (`node:sqlite`), atrás da mesma interface do D1.

**Respostas à revisão do builder (escolhas nossas, revisáveis)**
- **Cliente no navegador:** o login local de cliente sai; quem entra é sempre pela API. Ao entrar (e a cada
  `GET /api/eu`), o servidor devolve o perfil e o front grava uma **cópia** em `FC.db.clientes` e
  `FC.db.sessao.clienteId`, para que as ~18 telas que usam `FC.clienteAtual()` (etapas da reserva, "Minha conta")
  continuem funcionando. O servidor é a fonte da verdade; a cópia é só cache e é apagada ao sair. Senha nunca vai
  para a cópia.
- **O que conta como ocupado no servidor:** as linhas da tabela `ocupacao` — veículo (`bloqueio`/`reserva`) e
  **motorista contratado** (`motorista`), ambos com a mesma inserção condicional. A agenda de demonstração do
  navegador (locações de exemplo, manutenções, transferências) é diferente em cada navegador e **não** é conhecida
  pelo servidor; limite registrado. Acessórios continuam com estoque só no navegador (limite registrado).
- **Preço no servidor:** o servidor carrega o mesmo `dados.js`/`nucleo.js` e roda `FC.calcularPreco` com o catálogo
  fixo e **todas** as opções que o site oferece. O cupom tem uso controlado no servidor (tabela `cupons_uso`, limite
  e "primeira locação" pelas reservas do próprio servidor). O valor do servidor é o que vale: `POST /api/reservas`
  devolve o preço calculado e a revisão/pagamento mostram esse valor. Tarifas e cupons editados na área da empresa
  (no navegador) não afetam o servidor; limite registrado.
- **Contas de exemplo com reservas:** o script "preparar base" cria, para a Ana, 1 locação em andamento, 1 próxima e
  2 no histórico (e 1 histórico para os outros exemplos), com datas relativas ao dia em que o script roda, para o
  painel "Meus veículos" não aparecer vazio na apresentação.
- **CNH:** o corpo de `POST /api/reservas` traz o condutor principal (CNH: número, categoria, validade, restrições)
  e os condutores adicionais; o servidor valida cada um com `FC.avaliaCondutor`. Se o perfil do cliente ainda não
  tem CNH, a do condutor principal que for ele mesmo é gravada no perfil.
- **Deploy:** `_routes.json` passa a enviar `/api/*` (além de `/figma/media/*`) para o worker. O endereço
  `fallscar.faeterj.pages.dev` é um alias de branch (ambiente de pré-visualização do Pages), então o banco D1 é
  ligado ao ambiente **preview** do projeto (e também ao de produção, para não haver surpresa).
- Node 24 está instalado na máquina; `node:sqlite` está disponível para os testes.

## Para o builder decidir

- Organização dos arquivos do servidor e como empacotar no `_worker.js` (as regras de preço/habilitação de
  `nucleo.js` usam `window.FC`; reaproveitar exige carregá-las sem `eval`).
- Formato exato das tabelas e índices; expiração/limpeza de sessões e bloqueios.
- Layout do painel "Meus veículos" dentro do padrão visual das páginas do site.

## Riscos conhecidos

- A área da empresa não enxerga as reservas do servidor até o próximo projeto: o painel do empresário e a agenda
  podem mostrar um carro como livre enquanto o site o mostra ocupado.
- Criar o banco D1 e ligá-lo ao projeto Pages é uma ação na conta Cloudflare da equipe (feita uma vez, com aval).
