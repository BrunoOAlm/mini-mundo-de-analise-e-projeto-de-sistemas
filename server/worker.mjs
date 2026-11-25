// Worker do Cloudflare Pages (modo avançado): /api/* vai para a API; o resto é o site estático.
import "./fc-global.mjs";
import "../claude/js/dados.js";
import "../claude/js/nucleo.js";
import { tratarApi } from "./api.mjs";
import { servirAsset } from "./assets.mjs";
import { prepararFC } from "./reservas.mjs";

const FC = globalThis.FC;
prepararFC(FC);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      if (!env.DB) return new Response(JSON.stringify({ erro: "Banco de dados não configurado." }), { status: 503, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
      return tratarApi(request, { db: env.DB, FC, agora: () => new Date() });
    }
    return servirAsset(request, env);
  }
};
