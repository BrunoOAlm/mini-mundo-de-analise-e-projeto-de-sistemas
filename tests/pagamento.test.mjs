import test from "node:test";
import assert from "node:assert/strict";
import { abrirBanco } from "./db-sqlite.mjs";
import { carregarFC, contexto } from "./fc-servidor.mjs";
import { cadastrar } from "../server/contas.mjs";
import { criarReserva, obterReserva, pagar, cancelar, prepararFC } from "../server/reservas.mjs";

const FC = carregarFC();
prepararFC(FC);
const carro = FC.db.veiculos.find((v) => v.ativo && v.tipo === "carro" && v.lojaResponsavel === "SPPAU" && !v.cnh);
function data(d, h) { const x = new Date(); x.setDate(x.getDate() + d); if (x.getDay() === 0) x.setDate(x.getDate() + 1); x.setHours(h, 0, 0, 0); return x.toISOString(); }
const SEL = { veiculoId: carro.id, lojaRetirada: "SPPAU", lojaDevolucao: "SPPAU", inicio: data(5, 10), fim: data(8, 10),
  condutorPrincipal: { proprio: true, cnh: { numero: "1", categoria: "B", validade: "2030-01-01", restricoes: [] } }, aceite: { versao: "termos-demo-v1" } };
const CPFS = ["529.982.247-25", "111.444.777-35", "390.533.447-05"];
let n = 0;
async function cliente(ctx) { n++; return (await cadastrar(ctx, { nome: "Cliente " + n, email: "p" + n + "@t.com", docTipo: "CPF", doc: CPFS[n % 3], telefone: "(11) 91234-5678", senha: "segredo-123" })).cliente; }
async function preparado() { const ctx = contexto(abrirBanco(), FC); const c = await cliente(ctx); const r = (await criarReserva(ctx, c, SEL)).reserva; return { ctx, c, r }; }
const PG = (resultado, idEvento) => ({ metodo: "pix", parcelas: 1, resultado, idEvento: idEvento || "ev-" + Math.random() });

test("aprovado confirma e a ocupação vira reserva sem expirar", async () => {
  const { ctx, c, r } = await preparado();
  const p = await pagar(ctx, c, r.codigo, PG("aprovado"));
  assert.equal(p.reserva.estado, "confirmada");
  assert.equal(p.reserva.pagamento, "aprovado");
  const o = await ctx.db.prepare("SELECT tipo, expira_em FROM ocupacao WHERE ref = ?").bind(r.codigo).first();
  assert.equal(o.tipo, "reserva");
  assert.equal(o.expira_em, null);
});

test("recusado não confirma; pendente fica pendente", async () => {
  const { ctx, c, r } = await preparado();
  assert.equal((await pagar(ctx, c, r.codigo, PG("recusado"))).reserva.estado, "aguardando_pagamento");
  const p = await pagar(ctx, c, r.codigo, PG("pendente"));
  assert.equal(p.reserva.pagamento, "pendente");
  assert.equal(p.reserva.estado, "aguardando_pagamento");
});

test("mesmo idEvento duas vezes: um registro só e mesma resposta", async () => {
  const { ctx, c, r } = await preparado();
  const a = await pagar(ctx, c, r.codigo, PG("aprovado", "ev-1"));
  const b = await pagar(ctx, c, r.codigo, PG("aprovado", "ev-1"));
  assert.equal(b.reserva.estado, "confirmada");
  assert.equal(a.reserva.codigo, b.reserva.codigo);
  const q = await ctx.db.prepare("SELECT COUNT(*) AS n FROM pagamentos").first();
  assert.equal(q.n, 1);
});

test("segunda aprovação com outro idEvento não cobra de novo", async () => {
  const { ctx, c, r } = await preparado();
  await pagar(ctx, c, r.codigo, PG("aprovado"));
  const b = await pagar(ctx, c, r.codigo, PG("aprovado"));
  assert.equal(b.duplicado, true);
  assert.equal((await ctx.db.prepare("SELECT COUNT(*) AS n FROM pagamentos").first()).n, 1);
});

test("aprovação tardia com o carro ainda livre confirma", async () => {
  const { ctx, c, r } = await preparado();
  ctx.avancar(20 * 60000);
  assert.equal((await pagar(ctx, c, r.codigo, PG("aprovado"))).reserva.estado, "confirmada");
});

test("aprovação tardia com o carro já reservado por outro vira exceção com reembolso", async () => {
  const { ctx, c, r } = await preparado();
  ctx.avancar(20 * 60000);
  const outro = await cliente(ctx);
  const r2 = (await criarReserva(ctx, outro, SEL)).reserva;
  await pagar(ctx, outro, r2.codigo, PG("aprovado"));
  const p = await pagar(ctx, c, r.codigo, PG("aprovado"));
  assert.equal(p.reserva.estado, "excecao");
  assert.ok(p.reserva.eventos.some((e) => /reembolso/i.test(e.evento)));
});

test("reserva de outro cliente dá 404 e método inválido dá 400", async () => {
  const { ctx, c, r } = await preparado();
  const outro = await cliente(ctx);
  assert.equal((await pagar(ctx, outro, r.codigo, PG("aprovado"))).status, 404);
  assert.equal((await pagar(ctx, c, r.codigo, { ...PG("aprovado"), metodo: "boleto" })).status, 400);
  assert.equal((await obterReserva(ctx, c.id, r.codigo)).estado, "aguardando_pagamento");
});

test("revisão: duas aprovações simultâneas com idEvento diferente cobram uma vez só", async () => {
  const { ctx, c, r } = await preparado();
  const rs = await Promise.all([pagar(ctx, c, r.codigo, PG("aprovado", "a1")), pagar(ctx, c, r.codigo, PG("aprovado", "a2"))]);
  assert.equal((await ctx.db.prepare("SELECT COUNT(*) AS n FROM pagamentos").first()).n, 1);
  assert.ok(rs.every((x) => !x.status || x.status === 409));
  assert.equal((await obterReserva(ctx, c.id, r.codigo)).estado, "confirmada");
});

test("revisão: mesmo idEvento simultâneo não dá erro interno", async () => {
  const { ctx, c, r } = await preparado();
  const rs = await Promise.all([pagar(ctx, c, r.codigo, PG("aprovado", "x1")), pagar(ctx, c, r.codigo, PG("aprovado", "x1"))]);
  assert.ok(rs.every((x) => x.reserva || x.status === 409));
  assert.equal((await ctx.db.prepare("SELECT COUNT(*) AS n FROM pagamentos").first()).n, 1);
});

test("revisão: reserva não paga aparece como expirada depois do bloqueio", async () => {
  const { ctx, c, r } = await preparado();
  ctx.avancar(16 * 60000);
  assert.equal((await obterReserva(ctx, c.id, r.codigo)).estado, "expirada");
});

test("revisão: cancelar antes de pagar libera o carro na hora", async () => {
  const { ctx, c, r } = await preparado();
  const x = await cancelar(ctx, c, r.codigo);
  assert.equal(x.reserva.estado, "cancelada");
  assert.equal((await ctx.db.prepare("SELECT COUNT(*) AS n FROM ocupacao WHERE ref = ?").bind(r.codigo).first()).n, 0);
  const outro = await cliente(ctx);
  assert.ok((await criarReserva(ctx, outro, SEL)).reserva);
  assert.equal((await cancelar(ctx, outro, r.codigo)).status, 404);
});
