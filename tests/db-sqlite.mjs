// Banco em memória com a mesma interface que o servidor usa do Cloudflare D1:
// prepare(sql).bind(...).first()/all()/run() e batch([...]) atômico.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

function stmt(conn, sql, args) {
  return {
    bind: (...a) => stmt(conn, sql, a),
    _exec() { return conn.prepare(sql); },
    async first() { const r = conn.prepare(sql).get(...(args || [])); return r === undefined ? null : { ...r }; },
    async all() { return { results: conn.prepare(sql).all(...(args || [])).map((r) => ({ ...r })) }; },
    async run() { const r = conn.prepare(sql).run(...(args || [])); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    _runSync() { const r = conn.prepare(sql).run(...(args || [])); return { meta: { changes: Number(r.changes) } }; }
  };
}

export function abrirBanco() {
  const conn = new DatabaseSync(":memory:");
  const dir = join(RAIZ, "server", "migracoes");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) conn.exec(readFileSync(join(dir, f), "utf8"));
  return {
    prepare: (sql) => stmt(conn, sql, []),
    async batch(stmts) {
      conn.exec("BEGIN");
      try { const out = stmts.map((s) => s._runSync()); conn.exec("COMMIT"); return out; }
      catch (e) { conn.exec("ROLLBACK"); throw e; }
    },
    exec: (sql) => conn.exec(sql),
    _conn: conn
  };
}
