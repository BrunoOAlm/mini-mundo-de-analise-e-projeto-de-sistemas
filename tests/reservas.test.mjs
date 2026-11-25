import test from "node:test";
import assert from "node:assert/strict";
import { abrirBanco } from "./db-sqlite.mjs";
import { carregarFC, contexto } from "./fc-servidor.mjs";
import { cadastrar } from "../server/contas.mjs";
import { criarReserva, listarReservas, obterReserva, ocupados, prepararFC } from "../server/reservas.mjs";

const FC = carregarFC();
prepararFC(FC);
const CNH_B = { numero: "12345678901", categoria: "B", validade: "2030-01-01", restricoes: [] };
const CNH_AB = { ...CNH_B, categoria: "AB" };
const carro = FC.db.veiculos.find((v) => v.ativo && v.tipo === "carro" && v.lojaResponsavel === "SPPAU" && !v.cnh);
const moto = FC.db.veiculos.find((v) => v.ativo && v.tipo === "moto" && v.lojaResponsavel === "SPPAU");

// a loja SPPAU fecha aos domingos: as datas do teste nunca caem num domingo
function data(diasAFrente, hora) { const d = new Date(); d.setDate(d.getDate() + diasAFrente); if (d.getDay() === 0) d.setDate(d.getDate() + 1); d.setHours(hora, 0, 0, 0); return d.toISOString(); }
function sel(extra) {
  return Object.assign({ veiculoId: carro.id, lojaRetirada: "SPPAU", lojaDevolucao: "SPPAU", inicio: data(5, 10), fim: data(8, 10),
    condutorPrincipal: { proprio: true, cnh: CNH_B }, aceite: { versao: "termos-demo-v1" } }, extra || {});
}
let n = 0;
async function cliente(ctx) {
  n++;
  const cpfs = ["529.982.247-25", "111.444.777-35", "390.533.447-05", "935.411.347-80", "153.509.460-56"];
  const r = await cadastrar(ctx, { nome: "Cliente " + n, email: "c" + n + "@teste.com", docTipo: "CPF", doc: cpfs[n % cpfs.length], telefone: "(11) 91234-5678", senha: "segredo-123" });
  if (r.erro) throw new Error(JSON.stringify(r));
  return r.cliente;
}
function novo() { return contexto(abrirBanco(), FC); }

test("cria reserva aguardando pagamento com o preço calculado no servidor", async () => {
  const ctx = novo(); const c = await cliente(ctx);
  const r = await criarReserva(ctx, c, sel({ preco: { total: 1 } }));
  assert.equal(r.reserva.estado, "aguardando_pagamento");
  assert.equal(r.reserva.preco.total, FC.calcularPreco(sel(), { clienteId: c.id }).total);
  assert.ok(r.reserva.preco.total > 1);
});

test("grava bloqueio do veículo que expira em holdMin minutos", async () => {
  const ctx = novo(); const c = await cliente(ctx);
  const r = await criarReserva(ctx, c, sel());
  const o = await ctx.db.prepare("SELECT * FROM ocupacao WHERE ref = ?").bind(r.reserva.codigo).first();
  assert.equal(o.recurso, "V:" + carro.id);
  assert.equal(o.tipo, "bloqueio");
  assert.equal(new Date(o.expira_em).getTime(), ctx.agora().getTime() + FC.cfg().holdMin * 60000);
});

test("outro cliente no mesmo veículo e período sobreposto recebe 409", async () => {
  const ctx = novo(); const a = await cliente(ctx); const b = await cliente(ctx);
  await criarReserva(ctx, a, sel());
  const r = await criarReserva(ctx, b, sel({ inicio: data(6, 10), fim: data(9, 10) }));
  assert.equal(r.status, 409);
});

test("dois pedidos simultâneos: exatamente um sucesso", async () => {
  const ctx = novo(); const a = await cliente(ctx); const b = await cliente(ctx);
  const rs = await Promise.all([criarReserva(ctx, a, sel()), criarReserva(ctx, b, sel())]);
  assert.equal(rs.filter((r) => r.reserva).length, 1);
  assert.equal(rs.filter((r) => r.status === 409).length, 1);
});

test("bloqueio vencido não impede outra reserva", async () => {
  const ctx = novo(); const a = await cliente(ctx); const b = await cliente(ctx);
  await criarReserva(ctx, a, sel());
  ctx.avancar(16 * 60000);
  assert.ok((await criarReserva(ctx, b, sel())).reserva);
});

test("motorista ocupado no período dá 409 e libera o veículo", async () => {
  const ctx = novo(); const a = await cliente(ctx); const b = await cliente(ctx);
  const outro = FC.db.veiculos.find((v) => v.ativo && v.tipo === "carro" && v.lojaResponsavel === "SPPAU" && !v.cnh && v.id !== carro.id);
  assert.ok((await criarReserva(ctx, a, sel({ motorista: "D1" }))).reserva);
  const r = await criarReserva(ctx, b, sel({ veiculoId: outro.id, motorista: "D1" }));
  assert.equal(r.status, 409);
  const sobrou = await ctx.db.prepare("SELECT COUNT(*) AS n FROM ocupacao WHERE recurso = ?").bind("V:" + outro.id).first();
  assert.equal(sobrou.n, 0);
});

test("CNH B numa moto é recusada com campo cnh", async () => {
  const ctx = novo(); const c = await cliente(ctx);
  const r = await criarReserva(ctx, c, sel({ veiculoId: moto.id }));
  assert.equal(r.status, 400);
  assert.ok(r.campos.cnh);
  assert.ok((await criarReserva(ctx, c, sel({ veiculoId: moto.id, condutorPrincipal: { proprio: true, cnh: CNH_AB } }))).reserva);
});

test("sem aceite, data no passado ou devolução antes da retirada: 400", async () => {
  const ctx = novo(); const c = await cliente(ctx);
  assert.equal((await criarReserva(ctx, c, sel({ aceite: null }))).status, 400);
  assert.equal((await criarReserva(ctx, c, sel({ inicio: data(-1, 10) }))).status, 400);
  assert.equal((await criarReserva(ctx, c, sel({ fim: data(4, 10) }))).status, 400);
});

test("cliente sem CNH no perfil ganha a CNH do condutor principal", async () => {
  const ctx = novo(); const c = await cliente(ctx);
  await criarReserva(ctx, c, sel());
  const l = await ctx.db.prepare("SELECT cnh_json FROM clientes WHERE id = ?").bind(c.id).first();
  assert.equal(JSON.parse(l.cnh_json).categoria, "B");
});

test("cliente só vê as próprias reservas", async () => {
  const ctx = novo(); const a = await cliente(ctx); const b = await cliente(ctx);
  const ra = await criarReserva(ctx, a, sel());
  ctx.avancar(1000);
  const ra2 = await criarReserva(ctx, a, sel({ inicio: data(20, 10), fim: data(22, 10) }));
  assert.equal(await obterReserva(ctx, b.id, ra.reserva.codigo), null);
  assert.equal((await obterReserva(ctx, a.id, ra.reserva.codigo)).codigo, ra.reserva.codigo);
  const lista = await listarReservas(ctx, a.id);
  assert.deepEqual(lista.map((r) => r.codigo), [ra2.reserva.codigo, ra.reserva.codigo]);
  assert.equal((await listarReservas(ctx, b.id)).length, 0);
});

test("ocupados não leva dados do cliente", async () => {
  const ctx = novo(); const c = await cliente(ctx);
  await criarReserva(ctx, c, sel());
  const o = await ocupados(ctx, data(4, 0), data(10, 0));
  assert.equal(o.length, 1);
  assert.deepEqual(Object.keys(o[0]).sort(), ["fim", "inicio", "veiculoId"]);
});
