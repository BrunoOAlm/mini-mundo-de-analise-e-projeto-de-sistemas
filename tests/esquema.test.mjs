import test from "node:test";
import assert from "node:assert/strict";
import { abrirBanco } from "./db-sqlite.mjs";

test("esquema cria as 8 tabelas", async () => {
  const db = abrirBanco();
  const { results } = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
  const nomes = results.map((r) => r.name).filter((n) => !n.startsWith("sqlite_"));
  assert.deepEqual(nomes, ["clientes", "cupons_uso", "eventos", "ocupacao", "pagamentos", "reservas", "sessoes", "tentativas"]);
});

test("e-mail de cliente é único", async () => {
  const db = abrirBanco();
  const ins = (id, doc) => db.prepare("INSERT INTO clientes (id, nome, email, doc_tipo, doc, senha_hash, criado_em) VALUES (?, 'X', 'a@b.com', 'CPF', ?, 'h', '2026-01-01')").bind(id, doc).run();
  await ins("A", "1");
  await assert.rejects(ins("B", "2"));
});

test("run devolve meta.changes", async () => {
  const db = abrirBanco();
  const r = await db.prepare("INSERT INTO tentativas (ident, n, ate) VALUES (?, 0, 0)").bind("x").run();
  assert.equal(r.meta.changes, 1);
});

test("batch é atômico: uma instrução inválida não grava nada", async () => {
  const db = abrirBanco();
  await assert.rejects(db.batch([
    db.prepare("INSERT INTO tentativas (ident, n, ate) VALUES ('a', 0, 0)"),
    db.prepare("INSERT INTO tabela_que_nao_existe VALUES (1)")
  ]));
  const r = await db.prepare("SELECT COUNT(*) AS n FROM tentativas").first();
  assert.equal(r.n, 0);
});
