const test = require("node:test");
const assert = require("node:assert/strict");
const { carregar } = require("./carregar");

const AGORA = new Date(2026, 10, 25, 12, 0, 0); // 25/11/2026 12h (local)
function novo() { return carregar(["dados.js", "nucleo.js", "painel-dados.js"], AGORA); }
function calc(FC, extra) {
  return FC.painelDados(FC.db, new Date(AGORA), Object.assign({ noEscopo: () => true, situacaoDe: FC.situacaoAtual, verFinanceiro: true }, extra || {}));
}
const ymd = (d) => { const x = new Date(d); return x.getFullYear() * 10000 + (x.getMonth() + 1) * 100 + x.getDate(); };

test("totais da frota somam o total e ignoram inativos", () => {
  const FC = novo();
  const f = calc(FC).frota;
  assert.equal(f.alugados + f.patio + f.oficina + f.vistoria + f.transferencia, f.total);
  FC.db.veiculos.find((v) => v.ativo).ativo = false;
  assert.equal(calc(FC).frota.total, f.total - 1);
});

test("ocupação = alugados / total; frota vazia dá 0", () => {
  const FC = novo();
  const f = calc(FC).frota;
  assert.equal(f.ocupacao, f.alugados / f.total);
  FC.db.veiculos = [];
  assert.equal(calc(FC).frota.ocupacao, 0);
});

test("veículo vistoria pendente conta em vistoria, não em pátio", () => {
  const FC = novo();
  const v = FC.db.veiculos.find((x) => x.aguardandoVistoria);
  const item = calc(FC).frota.lista.find((i) => i.veiculo.id === v.id);
  assert.equal(item.situacao, "vistoria");
});

test("parado há mais de 48 h: disponível sem locação encerrada nas últimas 48 h", () => {
  const FC = novo();
  const sit = (v) => (v.id === "PARADO" || v.id === "RECENTE" ? "disponível" : "locado");
  FC.db.veiculos = [
    { id: "PARADO", ativo: true, grupo: "ECO", lojaResponsavel: "SPPAU", localAtual: "SPPAU", modelo: "A" },
    { id: "RECENTE", ativo: true, grupo: "ECO", lojaResponsavel: "SPPAU", localAtual: "SPPAU", modelo: "B" }
  ];
  FC.db.reservas = [{ codigo: "R1", veiculoId: "RECENTE", estado: "encerrada", pagamento: "aprovado", inicio: new Date(AGORA - 86400000 * 3).toISOString(), fim: new Date(AGORA - 36e6).toISOString(), lojaRetirada: "SPPAU", preco: { total: 100 } }];
  const ids = calc(FC, { situacaoDe: sit }).frota.parados48h.map((v) => v.id);
  assert.deepEqual(Array.from(ids), ["PARADO"]);
});

test("escopo de loja limita a lista da frota", () => {
  const FC = novo();
  const lista = calc(FC, { noEscopo: (l) => l === "SPPAU" }).frota.lista;
  assert.ok(lista.length > 0);
  assert.ok(lista.every((i) => i.veiculo.localAtual === "SPPAU"));
});

test("sem permissão de financeiro, financeiro é null", () => {
  assert.equal(calc(novo(), { verFinanceiro: false }).financeiro, null);
});

test("lucro = faturamento - despesas; 6 meses; despesa por categoria decrescente e somando o total", () => {
  const fin = calc(novo()).financeiro;
  assert.equal(fin.mes.lucro, fin.mes.faturamento - fin.mes.despesas);
  assert.equal(fin.serie.length, 6);
  assert.equal(fin.serie[5].mes, "2026-11");
  const vs = Array.from(fin.despesasPorCategoria, (c) => c.valor);
  assert.deepEqual(vs, [...vs].sort((a, b) => b - a));
  assert.equal(vs.reduce((a, b) => a + b, 0), fin.mes.despesas);
});

test("reserva que atravessa a virada do mês entra só no mês de início", () => {
  const FC = novo();
  FC.db.reservas = [{ codigo: "RX", veiculoId: "V001", estado: "encerrada", pagamento: "aprovado", inicio: new Date(2026, 9, 31, 10).toISOString(), fim: new Date(2026, 10, 3, 10).toISOString(), lojaRetirada: "SPPAU", preco: { total: 1000 } }];
  FC.db.cobrancas = [];
  const serie = calc(FC).financeiro.serie;
  assert.equal(serie.find((m) => m.mes === "2026-10").faturamento, 1000);
  assert.equal(serie.find((m) => m.mes === "2026-11").faturamento, 0);
});

test("base sem reservas nem despesas não gera NaN", () => {
  const FC = novo();
  FC.db.reservas = []; FC.db.despesas = []; FC.db.cobrancas = [];
  const m = calc(FC).financeiro.mes;
  assert.equal(m.margem, 0);
  assert.equal(m.ticket, 0);
  assert.equal(m.variacaoLucro, 0);
});

test("hoje: atrasados com dias e recebimentos somando as cobranças de hoje", () => {
  const FC = novo();
  const h = calc(FC).hoje;
  assert.ok(h.atrasados.itens.length >= 2);
  assert.ok(h.atrasados.itens.every((a) => a.dias >= 1 && !a.cobranca.pagoEm));
  const deHoje = FC.db.cobrancas.filter((c) => ymd(c.vencimento) === ymd(AGORA));
  assert.equal(h.recebimentos.total, deHoje.reduce((s, c) => s + c.valor, 0));
});

test("hoje: pendências incluem pagamento pendente e chamado aberto quando existem", () => {
  const FC = novo();
  FC.db.reservas.push({ codigo: "PEND1", veiculoId: "V001", estado: "aguardando_pagamento", pagamento: "pendente", inicio: AGORA.toISOString(), fim: AGORA.toISOString(), lojaRetirada: "SPPAU", preco: { total: 1 } });
  FC.db.chamados.push({ protocolo: "SUP-9", status: "aberto", loja: "SPPAU" });
  const rot = calc(FC).hoje.pendencias.map((p) => p.rotulo);
  assert.ok(rot.includes("Pagamento pendente"));
  assert.ok(rot.includes("Chamado aberto"));
});

test("mês corrente: despesas proporcionais aos dias corridos (25 de 30 em novembro)", () => {
  const FC = novo();
  FC.db.reservas = []; FC.db.cobrancas = [];
  FC.db.despesas = [{ id: "X", mes: "2026-11", loja: "SPPAU", categoria: "seguro", valor: 3000 }];
  const fin = calc(FC).financeiro;
  assert.equal(fin.mes.despesas, 2500);
  assert.equal(fin.despesasPorCategoria[0].valor, 2500);
  assert.equal(fin.serie[5].despesas, 2500);
});

test("variação do lucro compara com o mesmo período do mês anterior", () => {
  const FC = novo();
  FC.db.despesas = []; FC.db.cobrancas = [];
  const r = (ini, total) => ({ codigo: "R" + ini.getTime(), veiculoId: "V001", estado: "encerrada", pagamento: "aprovado", inicio: ini.toISOString(), fim: ini.toISOString(), lojaRetirada: "SPPAU", preco: { total } });
  FC.db.reservas = [r(new Date(2026, 9, 10), 1000), r(new Date(2026, 9, 28), 5000), r(new Date(2026, 10, 10), 1000)];
  assert.equal(calc(FC).financeiro.mes.variacaoLucro, 0); // outubro até o dia 25 = 1000, igual a novembro
});

test("revisão: recebimentos e atrasados respeitam o escopo de loja", () => {
  const FC = novo();
  FC.db.cobrancas = [
    { id: "A", clienteId: "C1", loja: "SPPAU", descricao: "x", valor: 100, vencimento: new Date(AGORA).toISOString(), pagoEm: null },
    { id: "B", clienteId: "C2", loja: "POA", descricao: "y", valor: 200, vencimento: new Date(AGORA).toISOString(), pagoEm: null },
    { id: "C", clienteId: "C2", loja: "POA", descricao: "z", valor: 300, vencimento: new Date(AGORA - 2 * 86400000).toISOString(), pagoEm: null }
  ];
  const h = calc(FC, { noEscopo: (l) => l === "SPPAU" }).hoje;
  assert.equal(h.recebimentos.total, 100);
  assert.equal(h.atrasados.itens.length, 0);
});
