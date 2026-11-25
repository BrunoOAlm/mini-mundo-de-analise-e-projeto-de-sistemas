import test from "node:test";
import assert from "node:assert/strict";
import { abrirBanco } from "./db-sqlite.mjs";
import { carregarFC, contexto } from "./fc-servidor.mjs";
import { cadastrar, entrar, sair, clienteDaSessao, perfilPublico } from "../server/contas.mjs";
import { sha256hex } from "../server/cripto.mjs";

const FC = carregarFC();
const DADOS = { nome: "Maria Teste", email: "Maria@Teste.com", docTipo: "CPF", doc: "529.982.247-25", telefone: "(11) 91234-5678", nascimento: "1990-05-05", senha: "segredo-123" };
const ERRO = "E-mail/CPF ou senha incorretos.";
function novo() { return contexto(abrirBanco(), FC); }

test("cadastro devolve cliente e token, e a sessão encontra o cliente", async () => {
  const ctx = novo();
  const r = await cadastrar(ctx, DADOS);
  assert.equal(r.cliente.email, "maria@teste.com");
  assert.equal(typeof r.token, "string");
  const c = await clienteDaSessao(ctx, r.token);
  assert.equal(c.id, r.cliente.id);
});

test("banco guarda só o hash do token e da senha", async () => {
  const ctx = novo();
  const r = await cadastrar(ctx, DADOS);
  const s = await ctx.db.prepare("SELECT token_hash FROM sessoes").first();
  assert.equal(s.token_hash, await sha256hex(r.token));
  const c = await ctx.db.prepare("SELECT senha_hash FROM clientes").first();
  assert.match(c.senha_hash, /^pbkdf2\$100000\$/);
  assert.ok(!c.senha_hash.includes(DADOS.senha));
});

test("e-mail ou documento repetido é recusado com o campo", async () => {
  const ctx = novo();
  await cadastrar(ctx, DADOS);
  const a = await cadastrar(ctx, { ...DADOS, doc: "111.444.777-35" });
  assert.ok(a.campos.email);
  const b = await cadastrar(ctx, { ...DADOS, email: "outra@teste.com" });
  assert.ok(b.campos.doc);
});

test("CPF inválido e senha curta são recusados", async () => {
  const ctx = novo();
  assert.ok((await cadastrar(ctx, { ...DADOS, doc: "123.456.789-00" })).campos.doc);
  assert.ok((await cadastrar(ctx, { ...DADOS, senha: "curta" })).campos.senha);
  assert.ok((await cadastrar(ctx, { ...DADOS, email: "sem-arroba" })).campos.email);
});

test("entra por e-mail (sem diferenciar maiúsculas) e por CPF com pontuação", async () => {
  const ctx = novo();
  await cadastrar(ctx, DADOS);
  assert.ok((await entrar(ctx, "MARIA@teste.com", DADOS.senha)).token);
  assert.ok((await entrar(ctx, "52998224725", DADOS.senha)).token);
});

test("senha errada e usuário inexistente dão a mesma mensagem", async () => {
  const ctx = novo();
  await cadastrar(ctx, DADOS);
  assert.equal((await entrar(ctx, "maria@teste.com", "errada")).erro, ERRO);
  assert.equal((await entrar(ctx, "ninguem@teste.com", "errada")).erro, ERRO);
});

test("5 erros bloqueiam (429) e o bloqueio vencido libera", async () => {
  const ctx = novo();
  await cadastrar(ctx, DADOS);
  for (let i = 0; i < 5; i++) await entrar(ctx, "maria@teste.com", "errada");
  const r = await entrar(ctx, "maria@teste.com", DADOS.senha);
  assert.equal(r.status, 429);
  ctx.avancar(11 * 60000);
  assert.ok((await entrar(ctx, "maria@teste.com", DADOS.senha)).token);
});

test("sessão expirada não vale e sair invalida o token", async () => {
  const ctx = novo();
  const r = await cadastrar(ctx, DADOS);
  ctx.avancar(31 * 86400000);
  assert.equal(await clienteDaSessao(ctx, r.token), null);
  const r2 = await entrar(ctx, "maria@teste.com", DADOS.senha);
  await sair(ctx, r2.token);
  assert.equal(await clienteDaSessao(ctx, r2.token), null);
});

test("perfil público não leva o hash da senha", async () => {
  const ctx = novo();
  const r = await cadastrar(ctx, DADOS);
  const p = perfilPublico(r.cliente);
  assert.equal(p.senha_hash, undefined);
  assert.equal(p.senhaHash, undefined);
  assert.equal(p.nome, "Maria Teste");
});
