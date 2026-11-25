// Carrega scripts de claude/js/ num contexto isolado (sem navegador) e devolve window.FC.
// agora (opcional): congela o relógio — new Date() e Date.now() sem argumento passam a devolver esse instante.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function carregar(arquivos, agora, inicial) {
  const mem = {};
  // como no navegador, window é o próprio objeto global
  const ctx = {
    console,
    localStorage: {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; }
    }
  };
  ctx.window = ctx;
  if (inicial) ctx.FC = Object.assign({}, inicial);
  if (agora) {
    const Real = Date, t = new Real(agora).getTime();
    function D(...a) { return a.length ? new Real(...a) : new Real(t); }
    D.prototype = Real.prototype; D.now = () => t; D.UTC = Real.UTC; D.parse = Real.parse;
    ctx.Date = D;
  }
  vm.createContext(ctx);
  for (const f of arquivos) {
    const src = fs.readFileSync(path.join(__dirname, "..", "claude", "js", f), "utf8");
    vm.runInContext(src, ctx, { filename: f });
  }
  return ctx.FC;
}

module.exports = { carregar };
