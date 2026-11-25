import test from "node:test";
import assert from "node:assert/strict";
import { abrirBanco } from "./db-sqlite.mjs";
import { carregarFC, contexto } from "./fc-servidor.mjs";
import { entrar } from "../server/contas.mjs";
import { listarReservas, prepararFC, criarReserva } from "../server/reservas.mjs";
import { gerarSQL, SENHA_DEMO } from "../scripts/preparar-base.mjs";

const FC = carregarFC();
prepararFC(FC);

test("base de exemplo: Ana entra e tem 1 em andamento, 1 próxima e 2 no histórico", async () => {
  const db = abrirBanco();
  db.exec(await gerarSQL(FC, new Date()));
  const ctx = contexto(db, FC);
  const r = await entrar(ctx, "ana@exemplo.com", SENHA_DEMO);
  assert.equal(r.cliente.id, "C1");
  const rs = await listarReservas(ctx, "C1");
  const por = (e) => rs.filter((x) => x.estado === e).length;
  assert.equal(por("em_andamento"), 1);
  assert.equal(por("confirmada"), 1);
  assert.equal(por("encerrada"), 2);
  assert.ok(rs.find((x) => x.estado === "confirmada").inicio > new Date().toISOString());
  for (const id of ["C2", "C3", "C4"]) assert.equal((await listarReservas(ctx, id)).length, 1);
});

test("rodar de novo restaura a base (sem duplicar) e as reservas de exemplo ocupam os carros", async () => {
  const db = abrirBanco();
  db.exec(await gerarSQL(FC, new Date()));
  db.exec(await gerarSQL(FC, new Date()));
  const n = await db.prepare("SELECT COUNT(*) AS n FROM clientes").first();
  assert.equal(n.n, 4);
  const ctx = contexto(db, FC);
  const ana = (await entrar(ctx, "ana@exemplo.com", SENHA_DEMO)).cliente;
  const prox = (await listarReservas(ctx, "C1")).find((x) => x.estado === "confirmada");
  const r = await criarReserva(ctx, ana, { veiculoId: prox.veiculoId, lojaRetirada: prox.lojaRetirada, lojaDevolucao: prox.lojaDevolucao, inicio: prox.inicio, fim: prox.fim,
    condutorPrincipal: { proprio: true }, aceite: { versao: "termos-demo-v1" } });
  assert.equal(r.status, 409);
});
