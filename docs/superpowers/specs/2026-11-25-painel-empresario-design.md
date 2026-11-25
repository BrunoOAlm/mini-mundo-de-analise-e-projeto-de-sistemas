# Painel do empresário e login da área da empresa — design

Data: 2026-11-25 · Projeto: Falls Car (protótipo acadêmico, Análise e Projeto de Sistemas)
Equipe: Bruno Oliveira de Almeida, Vladmir dos Santos Oliveira, Carlos Eduardo de Moura Pinto (Cadu)

## Intenção

Dar ao dono da locadora, logo cedo, a sensação de controle do negócio: o que exige ação agora, o que vence hoje e
quanto o mês está rendendo. Hoje a área da empresa (`claude/index.html#/admin`) abre num "Painel operacional" com
contagens simples e uma lista de pendências, e o login é só clicar num usuário de demonstração.

Este trabalho vem **antes do backend** e usa os dados de demonstração que já existem no navegador (`FC.db`,
`localStorage`). Quando o backend existir, os mesmos números passam a vir do banco; o painel não deve depender de
detalhes do armazenamento além das funções de leitura que já existem (`FC.db`, `FC.situacaoAtual`, `FC.noEscopo`,
`FC.reservasAfetadas` etc.).

## Objetivos

1. **Painel do empresário** no lugar do painel atual (`FC.adminPages.painel`), dividido em seções numa página só,
   com menu fixo para pular entre elas (modelo "A em seções", escolhido nos esboços):
   - **Visão geral** — os 5 segundos da manhã: ocupação (anel com % e "X de Y alugados"), indisponíveis
     (oficina + vistoria), pendências de hoje (atrasos, devoluções, retiradas) e lucro líquido do mês com margem e
     variação contra o mês anterior.
   - **Frota** — totais por situação (alugado, pátio, oficina, vistoria, transferência); tabela de veículos com
     situação, onde está/quem está com ele e "desde/até" (destaque amarelo para veículo parado no pátio há mais de
     48 h); ocupação por categoria em barras horizontais.
   - **Hoje** — recebimentos do dia (com total), atrasados/inadimplência (com total e dias de atraso) e movimento
     do pátio (retiradas e devoluções em ordem de horário, devoluções marcadas "preparar vistoria").
   - **Financeiro** — faturamento, despesas, lucro líquido e ticket médio do mês; gráfico de colunas de 6 meses
     (faturamento × despesas × lucro); "para onde foi a despesa" por categoria (parcelas da frota, manutenção,
     seguro, equipe, outros).
2. **Login da área da empresa** por e-mail e senha, no mesmo visual, com a logo e "FallsCar · Área da empresa".
3. **Três administradores** com perfil gestor e acesso a todas as lojas:
   Bruno Oliveira de Almeida, Vladmir dos Santos Oliveira e Carlos Eduardo de Moura Pinto (Cadu).

## Visual (decidido com a equipe)

- Fundo escuro de **fibra de carbono**: trama em xadrez fino (gradientes repetidos de 20 px), degradê que escurece
  para baixo e nas bordas, brilho amarelo discreto no canto superior direito.
- Cartões de **vidro escuro** sobre o carbono (gradiente translúcido, borda branca a 8%, desfoque, reflexo na borda
  de cima). Amarelo `#FFC21A` só em destaques; vermelho para indisponível/atraso; verde para lucro/recebido.
- Menu de seções fixo no topo, de vidro, com a **logo + "FallsCar"** à esquerda, antes de "Visão geral"; seção
  ativa em pílula amarela.
- Login: mesmo fundo de carbono, cartão de vidro centralizado com a **logo** em cima, "FallsCar" (Car em amarelo),
  "Área da empresa", campos de e-mail e senha, botão amarelo "Entrar" e "Esqueci minha senha".
- Referência: esboços `painel-carbono-v3.html` da sessão de brainstorming (`.superpowers/brainstorm/`, fora do git).

## Não objetivos

- Backend, banco, API e autenticação de verdade (próximo projeto).
- Redesenhar os outros ~15 módulos da área da empresa (reservas, frota, agenda, clientes, tarifas…): eles continuam
  funcionando como hoje, acessíveis pelo menu lateral.
- Contabilidade real: despesas são de demonstração e o lucro é "faturamento − despesas" do mês, sem impostos,
  depreciação ou regime contábil.

## Anti-objetivos

- Números que contradizem os dados da própria base (ex.: "18 alugados" quando a frota mostra 12). Todo número do
  painel sai de `FC.db`; o que não existe na base é semeado em `dados.js`, nunca escrito direto no HTML.
- Apresentar a senha do protótipo como segurança real. Enquanto tudo roda no navegador, a verificação fica no
  código do site e qualquer um pode lê-la; o texto da tela e a documentação dizem isso.
- Esconder do gestor as pendências que o painel atual já mostra (pagamento pendente, exceção, transferência
  atrasada, reserva afetada, CNH pendente, chamado aberto, despesa contestada) — elas entram na seção Hoje.

## Restrições

- JavaScript puro, sem framework nem build, como o resto do site (`claude/js/*.js`, carregados por `<script>`).
- Permissões existentes: o painel respeita `FC.noEscopo` (perfis com lojas limitadas veem só suas lojas). A seção
  Financeiro é só para o perfil gestor (atendente e frota não veem lucro).
- Requisitos atendidos/tocados: RF11 (relatórios com filtros — o painel é visão resumida), RF70 (usuários e
  perfis), RF87 (gestor acompanha disponibilidade e pendências por loja), RNF32 (autorização por perfil e loja),
  RNF36 (dados fictícios, não expor credenciais).
- Telas em celular e desktop sem rolagem horizontal (RNF11); navegação por teclado no menu de seções e no login
  (RNF12).

## Abordagens consideradas

**Layout do topo** (esboços mostrados lado a lado):
- A · Blocos em faixas (pulso da frota → alertas do dia → resultado do mês). **Escolhida**, depois expandida em
  seções a pedido da equipe porque a versão de uma tela só ficava espremida.
- B · Mapa da frota (um quadrado por veículo colorido pelo estado). Bom para ver a frota inteira, mas esconde os
  números de ação e de dinheiro.
- C · Linha do dia ao lado (coluna com o dia em ordem de horário). Boa para operação, fraca para a visão de dono.

**Tema**: claro (igual às páginas do site) foi esboçado e descartado; a equipe preferiu o escuro, em fibra de
carbono.

**Fonte dos dados**: dados de demonstração agora (escolhido; é protótipo) × esperar o backend.

## Decisões do builder (registradas como escolha nossa, revisáveis)

- **Despesas**: a base não tem despesas. Criar em `dados.js` uma coleção `despesas` de demonstração por mês e loja,
  nas categorias parcelas da frota, manutenção, seguro, equipe e outros, cobrindo os últimos 6 meses, coerente com o
  tamanho da frota. Manutenção do mês atual deve bater com as manutenções registradas.
- **Faturamento do mês** = soma de `preco.total` das reservas com pagamento aprovado cujo início cai no mês
  (encerradas, em andamento e confirmadas), mais cobranças semanais aprovadas dos planos de motorista de aplicativo.
  Ticket médio = faturamento ÷ número dessas reservas.
- **Recebimentos de hoje / atrasados**: vêm de pagamentos aprovados hoje e de cobranças vencidas e não pagas
  (planos semanais e despesas pendentes). Se a base de demonstração não tiver casos, semear alguns em `dados.js`.
- **"Parado há mais de 48 h"**: veículo disponível sem locação terminada nas últimas 48 h.
- **E-mails dos administradores**: `bruno@fallscar.com.br`, `vladmir@fallscar.com.br`, `cadu@fallscar.com.br`
  (fictícios). Substituem o usuário "Gestor (demo)". O atendente e o operador de frota de demonstração continuam,
  também com e-mail e senha, para demonstrar as permissões de cada perfil (RNF32).
- **Senhas**: senha inicial de demonstração, igual para os cinco usuários, guardada em `dados.js` com o mesmo `hash`
  usado para clientes; informada à equipe fora do código e trocável pela tela de usuários internos. Limite de
  tentativas e bloqueio reaproveitam `loginMaxTentativas` e `loginBloqueioMin` da configuração.
- **Gráficos** feitos com HTML/CSS (colunas e barras), sem biblioteca, seguindo o esboço.
- **Base salva antiga**: sobe `FC.SEED_VERSION` para 5; o `loadDB` existente recria a base de demonstração quando a
  versão muda (padrão do projeto). Quem tinha dados de teste no navegador volta à base inicial.
- **Aguardando vistoria**: campo novo `aguardandoVistoria` no veículo, semeado em 1 veículo disponível.
  (mesmo padrão de `clubMigrado` em `FC.render`), sem apagar o que existe.

## Para o builder decidir

- Estrutura do código do painel (funções de cálculo separadas da montagem do HTML, para o backend reaproveitar).
- Pontos de quebra responsiva e o comportamento do menu fixo em telas estreitas (rolagem horizontal das pílulas é
  aceitável).

## Decidido depois da revisão

- O fundo de carbono e os cartões de vidro valem **só para o painel e o login**. O menu lateral e os outros módulos
  da área da empresa ficam com o visual atual.
