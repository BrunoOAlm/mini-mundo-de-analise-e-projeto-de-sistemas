import test from "node:test";
import assert from "node:assert/strict";
import { abrirBanco } from "./db-sqlite.mjs";
import { carregarFC, contexto } from "./fc-servidor.mjs";
import { prepararFC } from "../server/reservas.mjs";
import { tratarApi } from "../server/api.mjs";

const FC = carregarFC();
prepararFC(FC);
const BASE = "https://fallscar.test";
const CAD = { nome: "Maria Teste", email: "maria@teste.com", docTipo: "CPF", doc: "529.982.247-25", telefone: "(11) 91234-5678", senha: "segredo-123" };
function novo() { return contexto(abrirBanco(), FC); }
function req(metodo, caminho, corpo, extra) {
  const h = Object.assign({ Origin: BASE }, corpo !== undefined ? { "Content-Type": "application/json" } : {}, (extra && extra.headers) || {});
  return new Request(BASE + caminho, { method: metodo, headers: h, body: corpo !== undefined ? JSON.stringify(corpo) : undefined });
}
const cookieDe = (res) => (res.headers.get("set-cookie") || "").split(";")[0];

test("cadastro devolve cookie de sessão seguro e o perfil sem senha", async () => {
  const ctx = novo();
  const res = await tratarApi(req("POST", "/api/cadastro", CAD), ctx);
  assert.equal(res.status, 201);
  const sc = res.headers.get("set-cookie");
  assert.match(sc, /^fc_sessao=[^;]+;/);
  for (const a of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"]) assert.ok(sc.includes(a), a);
  const j = await res.json();
  assert.equal(j.cliente.nome, "Maria Teste");
  assert.equal(j.cliente.senha_hash, undefined);
});

test("GET /api/eu: 200 com o cookie (refresh mantém login), 401 sem", async () => {
  const ctx = novo();
  const c = cookieDe(await tratarApi(req("POST", "/api/cadastro", CAD), ctx));
  const ok = await tratarApi(req("GET", "/api/eu", undefined, { headers: { Cookie: c } }), ctx);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).cliente.email, "maria@teste.com");
  assert.equal((await tratarApi(req("GET", "/api/eu"), ctx)).status, 401);
});

test("sair apaga o cookie e a sessão", async () => {
  const ctx = novo();
  const c = cookieDe(await tratarApi(req("POST", "/api/cadastro", CAD), ctx));
  const s = await tratarApi(req("POST", "/api/sair", {}, { headers: { Cookie: c } }), ctx);
  assert.match(s.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await tratarApi(req("GET", "/api/eu", undefined, { headers: { Cookie: c } }), ctx)).status, 401);
});

test("POST sem JSON ou de outra origem é recusado (403)", async () => {
  const ctx = novo();
  const semJson = new Request(BASE + "/api/login", { method: "POST", headers: { Origin: BASE, "Content-Type": "text/plain" }, body: "x" });
  assert.equal((await tratarApi(semJson, ctx)).status, 403);
  assert.equal((await tratarApi(req("POST", "/api/login", { ident: "a", senha: "b" }, { headers: { Origin: "https://malicioso.test" } }), ctx)).status, 403);
});

test("rota desconhecida dá 404 JSON e toda resposta tem no-store", async () => {
  const ctx = novo();
  const r = await tratarApi(req("GET", "/api/nada"), ctx);
  assert.equal(r.status, 404);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.ok((await r.json()).erro);
});

test("reservas exigem sessão", async () => {
  const ctx = novo();
  assert.equal((await tratarApi(req("GET", "/api/reservas"), ctx)).status, 401);
  assert.equal((await tratarApi(req("POST", "/api/reservas", {}), ctx)).status, 401);
});

test("erro interno vira 500 JSON sem detalhes", async () => {
  const ctx = novo();
  ctx.db = { prepare() { throw new Error("segredo interno"); } };
  const r = await tratarApi(req("POST", "/api/login", { ident: "a@b.com", senha: "x" }), ctx);
  assert.equal(r.status, 500);
  const t = await r.text();
  assert.ok(!t.includes("segredo interno"));
});

test("fluxo completo: login, reserva, pagamento e consulta", async () => {
  const ctx = novo();
  const c = cookieDe(await tratarApi(req("POST", "/api/cadastro", CAD), ctx));
  const H = { headers: { Cookie: c } };
  const carro = FC.db.veiculos.find((v) => v.ativo && v.tipo === "carro" && v.lojaResponsavel === "SPPAU" && !v.cnh);
  const d = (n, h) => { const x = new Date(); x.setDate(x.getDate() + n); if (x.getDay() === 0) x.setDate(x.getDate() + 1); x.setHours(h, 0, 0, 0); return x.toISOString(); };
  const sel = { veiculoId: carro.id, lojaRetirada: "SPPAU", lojaDevolucao: "SPPAU", inicio: d(5, 10), fim: d(8, 10), condutorPrincipal: { proprio: true, cnh: { numero: "1", categoria: "B", validade: "2030-01-01", restricoes: [] } }, aceite: { versao: "termos-demo-v1" } };
  const cr = await tratarApi(req("POST", "/api/reservas", sel, H), ctx);
  assert.equal(cr.status, 201);
  const { reserva } = await cr.json();
  const pg = await tratarApi(req("POST", "/api/reservas/" + reserva.codigo + "/pagamento", { metodo: "pix", resultado: "aprovado", idEvento: "e1" }, H), ctx);
  assert.equal((await pg.json()).reserva.estado, "confirmada");
  assert.equal((await (await tratarApi(req("GET", "/api/reservas/" + reserva.codigo, undefined, H), ctx)).json()).reserva.estado, "confirmada");
  const lista = await (await tratarApi(req("GET", "/api/reservas", undefined, H), ctx)).json();
  assert.equal(lista.reservas.length, 1);
  const oc = await (await tratarApi(req("GET", "/api/ocupacao?inicio=" + d(4, 0) + "&fim=" + d(10, 0)), ctx)).json();
  assert.equal(oc.ocupados[0].veiculoId, carro.id);
});
