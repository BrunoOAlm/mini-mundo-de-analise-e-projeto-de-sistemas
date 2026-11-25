// Catálogo e regras do site (dados.js + nucleo.js) carregados como no servidor, para os testes.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { carregar } = require("./carregar.js");

export function carregarFC(agora) { return carregar(["dados.js", "nucleo.js"], agora); }

// contexto do servidor com relógio controlável
export function contexto(db, FC, inicio) {
  let t = new Date(inicio || Date.now()).getTime();
  return { db, FC, agora: () => new Date(t), avancar: (ms) => { t += ms; } };
}
