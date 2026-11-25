// Contas de cliente e sessão (RF20, RF22, RNF06, RNF09, RNF32). ctx = { db, FC, agora: () => Date }
import { hashSenha, confereSenha, novoToken, sha256hex } from "./cripto.mjs";

const ERRO_LOGIN = "E-mail/CPF ou senha incorretos.";
const SESSAO_DIAS = 30;

function soDigitos(s) { return String(s || "").replace(/\D/g, ""); }
function iso(d) { return new Date(d).toISOString(); }

export function linhaParaCliente(l) {
  if (!l) return null;
  return { id: l.id, nome: l.nome, email: l.email, docTipo: l.doc_tipo, doc: l.doc, telefone: l.telefone, nascimento: l.nascimento,
    cnh: l.cnh_json ? JSON.parse(l.cnh_json) : null, criadoEm: l.criado_em, senha_hash: l.senha_hash };
}

export function perfilPublico(c) {
  if (!c) return null;
  const { senha_hash, ...resto } = c;
  return resto;
}

async function abrirSessao(ctx, clienteId) {
  const token = novoToken();
  const expira = iso(ctx.agora().getTime() + SESSAO_DIAS * 86400000);
  await ctx.db.prepare("INSERT INTO sessoes (token_hash, cliente_id, expira_em) VALUES (?, ?, ?)").bind(await sha256hex(token), clienteId, expira).run();
  return token;
}

export async function cadastrar(ctx, d) {
  const FC = ctx.FC, cfg = FC.cfg(), campos = {};
  const nome = String(d.nome || "").trim(), email = String(d.email || "").trim().toLowerCase();
  const docTipo = d.docTipo === "Passaporte" ? "Passaporte" : "CPF";
  let doc = String(d.doc || "").trim();
  if (nome.length < 3) campos.nome = "Informe o nome completo.";
  if (!FC.emailValido(email)) campos.email = "E-mail inválido.";
  if (docTipo === "CPF") { if (!FC.cpfValido(doc)) campos.doc = "CPF inválido."; else doc = FC.mascaraCPF(soDigitos(doc)); }
  else if (doc.length < 5) campos.doc = "Número de passaporte inválido.";
  if (String(d.senha || "").length < (cfg.senhaMin || 8)) campos.senha = "A senha precisa ter no mínimo " + (cfg.senhaMin || 8) + " caracteres.";
  if (soDigitos(d.telefone).length < 10) campos.telefone = "Celular inválido.";
  if (Object.keys(campos).length) return { erro: "Corrija os campos destacados.", campos, status: 400 };

  const ja = await ctx.db.prepare("SELECT email, doc FROM clientes WHERE email = ? OR doc = ?").bind(email, doc).all();
  for (const l of ja.results) {
    if (l.email === email) campos.email = "Já existe uma conta com este e-mail.";
    if (l.doc === doc) campos.doc = "Já existe uma conta com este documento.";
  }
  if (Object.keys(campos).length) return { erro: "Já existe uma conta com estes dados.", campos, status: 409 };

  const id = "CL" + novoToken().slice(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  const linha = { id, nome, email, doc_tipo: docTipo, doc, telefone: String(d.telefone || "").trim(), nascimento: d.nascimento || null,
    cnh_json: d.cnh ? JSON.stringify(d.cnh) : null, senha_hash: await hashSenha(d.senha), criado_em: iso(ctx.agora()) };
  await ctx.db.prepare("INSERT INTO clientes (id, nome, email, doc_tipo, doc, telefone, nascimento, cnh_json, senha_hash, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(linha.id, linha.nome, linha.email, linha.doc_tipo, linha.doc, linha.telefone, linha.nascimento, linha.cnh_json, linha.senha_hash, linha.criado_em).run();
  return { cliente: linhaParaCliente(linha), token: await abrirSessao(ctx, id) };
}

export async function entrar(ctx, ident, senha) {
  const cfg = ctx.FC.cfg(), agoraMs = ctx.agora().getTime();
  const chave = String(ident || "").trim().toLowerCase();
  const t = (await ctx.db.prepare("SELECT n, ate FROM tentativas WHERE ident = ?").bind(chave).first()) || { n: 0, ate: 0 };
  if (t.ate > agoraMs) return { erro: "Muitas tentativas. Tente novamente em alguns minutos ou recupere sua senha.", status: 429 };
  const dig = soDigitos(chave);
  let l = await ctx.db.prepare("SELECT * FROM clientes WHERE email = ?").bind(chave).first();
  if (!l && dig.length === 11) l = await ctx.db.prepare("SELECT * FROM clientes WHERE doc = ?").bind(ctx.FC.mascaraCPF(dig)).first();
  if (!l || !(await confereSenha(String(senha || ""), l.senha_hash))) {
    let n = (t.ate && t.ate <= agoraMs ? 0 : t.n) + 1, ate = 0;
    if (n >= cfg.loginMaxTentativas) { ate = agoraMs + cfg.loginBloqueioMin * 60000; n = 0; }
    await ctx.db.prepare("INSERT INTO tentativas (ident, n, ate) VALUES (?, ?, ?) ON CONFLICT(ident) DO UPDATE SET n = excluded.n, ate = excluded.ate").bind(chave, n, ate).run();
    return { erro: ERRO_LOGIN, status: 401 };
  }
  await ctx.db.prepare("DELETE FROM tentativas WHERE ident = ?").bind(chave).run();
  return { cliente: linhaParaCliente(l), token: await abrirSessao(ctx, l.id) };
}

export async function sair(ctx, token) {
  if (!token) return;
  await ctx.db.prepare("DELETE FROM sessoes WHERE token_hash = ?").bind(await sha256hex(token)).run();
}

export async function clienteDaSessao(ctx, token) {
  if (!token) return null;
  const l = await ctx.db.prepare("SELECT c.* FROM sessoes s JOIN clientes c ON c.id = s.cliente_id WHERE s.token_hash = ? AND s.expira_em > ?")
    .bind(await sha256hex(token), iso(ctx.agora())).first();
  return linhaParaCliente(l);
}

export async function gravarCnh(ctx, clienteId, cnh) {
  await ctx.db.prepare("UPDATE clientes SET cnh_json = ? WHERE id = ? AND cnh_json IS NULL").bind(JSON.stringify(cnh), clienteId).run();
}
