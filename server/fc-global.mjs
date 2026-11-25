// Prepara o ambiente para os scripts do site (dados.js, nucleo.js), que esperam window e localStorage.
const mem = {};
globalThis.window = globalThis;
globalThis.FC = { SERVIDOR: true }; // dados.js pula o histórico de demonstração
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: () => {}, removeItem: () => {} };
