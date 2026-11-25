// API JSON do site do cliente em /api/* (RNF05, RNF09, RNF17, RNF18, RNF32).
import { cadastrar, entrar, sair, clienteDaSessao, perfilPublico } from "./contas.mjs";
import { criarReserva, listarReservas, obterReserva, ocupados, pagar, cancelar } from "./reservas.mjs";

const COOKIE = "fc_sessao";
const MAX_AGE = 30 * 86400;

function json(status, corpo, extra) {
  const h = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  if (extra) for (const [k, v] of Object.entries(extra)) h.append(k, v);
  return new Response(JSON.stringify(corpo), { status, headers: h });
}
const erro = (status, msg, campos) => json(status, campos ? { erro: msg, campos } : { erro: msg });
const cookieSessao = (token) => COOKIE + "=" + token + "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=" + MAX_AGE;
const cookieApagar = COOKIE + "=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";

function lerCookie(req) {
  const m = /(?:^|;\s*)fc_sessao=([^;]+)/.exec(req.headers.get("Cookie") || "");
  return m ? m[1] : null;
}
function resultado(r, okStatus, chave) {
  if (r.erro) return erro(r.status || 400, r.erro, r.campos);
  const corpo = { [chave]: r[chave] }; if (r.msg) corpo.msg = r.msg; if (r.duplicado) corpo.duplicado = true;
  return json(okStatus, corpo);
}

export async function tratarApi(req, ctx) {
  try {
    const url = new URL(req.url), caminho = url.pathname.replace(/\/+$/, ""), metodo = req.method;
    if (metodo === "POST") {
      // contra CSRF: só JSON e só da própria origem
      const tipo = (req.headers.get("Content-Type") || "").toLowerCase();
      const origem = req.headers.get("Origin");
      if (tipo.indexOf("application/json") !== 0 || (origem && origem !== url.origin) || (!origem && req.headers.get("Sec-Fetch-Site") === "cross-site"))
        return erro(403, "Requisição recusada.");
    }
    const corpo = metodo === "POST" ? await req.json().catch(() => ({})) : null;
    const token = lerCookie(req);

    if (metodo === "POST" && caminho === "/api/cadastro") {
      const r = await cadastrar(ctx, corpo || {});
      if (r.erro) return erro(r.status || 400, r.erro, r.campos);
      return json(201, { cliente: perfilPublico(r.cliente) }, { "Set-Cookie": cookieSessao(r.token) });
    }
    if (metodo === "POST" && caminho === "/api/login") {
      const r = await entrar(ctx, corpo && corpo.ident, corpo && corpo.senha);
      if (r.erro) return erro(r.status || 401, r.erro);
      return json(200, { cliente: perfilPublico(r.cliente) }, { "Set-Cookie": cookieSessao(r.token) });
    }
    if (metodo === "POST" && caminho === "/api/sair") {
      await sair(ctx, token);
      return json(200, { ok: true }, { "Set-Cookie": cookieApagar });
    }
    if (metodo === "GET" && caminho === "/api/ocupacao") {
      const ini = new Date(url.searchParams.get("inicio")), fim = new Date(url.searchParams.get("fim"));
      if (isNaN(ini) || isNaN(fim) || fim <= ini) return erro(400, "Período inválido.");
      return json(200, { ocupados: await ocupados(ctx, ini, fim) });
    }

    // daqui em diante, só com sessão
    const cliente = await clienteDaSessao(ctx, token);
    if (metodo === "GET" && caminho === "/api/eu") {
      if (!cliente) return json(401, { erro: "Sessão encerrada. Entre novamente." }, token ? { "Set-Cookie": cookieApagar } : null);
      return json(200, { cliente: perfilPublico(cliente) });
    }
    if (caminho === "/api/reservas" || caminho.indexOf("/api/reservas/") === 0) {
      if (!cliente) return erro(401, "Entre na sua conta para continuar.");
      if (metodo === "GET" && caminho === "/api/reservas") return json(200, { reservas: await listarReservas(ctx, cliente.id) });
      if (metodo === "POST" && caminho === "/api/reservas") return resultado(await criarReserva(ctx, cliente, corpo || {}), 201, "reserva");
      const m = /^\/api\/reservas\/([A-Z0-9-]{4,20})(\/pagamento|\/cancelar)?$/.exec(caminho);
      if (m && metodo === "GET" && !m[2]) {
        const r = await obterReserva(ctx, cliente.id, m[1]);
        return r ? json(200, { reserva: r }) : erro(404, "Reserva não encontrada.");
      }
      if (m && metodo === "POST" && m[2] === "/pagamento") return resultado(await pagar(ctx, cliente, m[1], corpo || {}), 200, "reserva");
      if (m && metodo === "POST" && m[2] === "/cancelar") return resultado(await cancelar(ctx, cliente, m[1]), 200, "reserva");
    }
    return erro(404, "Rota não encontrada.");
  } catch (e) {
    console.error("api", e && e.stack || e);
    return erro(500, "Erro interno. Tente novamente em instantes.");
  }
}
