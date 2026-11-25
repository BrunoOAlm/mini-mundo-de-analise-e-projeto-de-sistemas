// Gera o SQL que prepara (ou restaura) a base de apresentação do backend (RNF38):
// as contas de exemplo de dados.js e algumas reservas delas, com datas relativas a hoje.
// Uso: node scripts/preparar-base.mjs > base.sql   (depois: wrangler d1 execute ... --file base.sql)
import { hashSenha } from "../server/cripto.mjs";

// a mesma senha de demonstração das contas de exemplo em claude/js/dados.js (já pública no repositório)
export const SENHA_DEMO = "Senha@123";
const EXEMPLOS = ["C1", "C2", "C3", "C4"];

const q = (v) => (v == null ? "NULL" : typeof v === "number" ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");

// dia útil (a loja SPPAU fecha aos domingos) às `hora` horas, `dias` a partir de `agora`
function dia(agora, dias, hora) {
  const d = new Date(agora); d.setDate(d.getDate() + dias);
  if (d.getDay() === 0) d.setDate(d.getDate() + (dias < 0 ? -1 : 1));
  d.setHours(hora, 0, 0, 0); return d;
}

export async function gerarSQL(FC, agora) {
  const linhas = ["DELETE FROM cupons_uso;", "DELETE FROM eventos;", "DELETE FROM pagamentos;", "DELETE FROM ocupacao;", "DELETE FROM reservas;",
    "DELETE FROM sessoes;", "DELETE FROM tentativas;", "DELETE FROM clientes;"];
  const clientes = FC.buildSeed().clientes.filter((c) => EXEMPLOS.indexOf(c.id) >= 0);
  for (const c of clientes) {
    const cnh = c.cnh ? { numero: c.cnh.numero, categoria: c.cnh.categoria, validade: c.cnh.validade, restricoes: c.cnh.restricoes || [], status: c.cnh.status } : null;
    linhas.push("INSERT INTO clientes (id, nome, email, doc_tipo, doc, telefone, nascimento, cnh_json, senha_hash, criado_em) VALUES (" +
      [c.id, c.nome, c.email, c.docTipo, c.doc, c.telefone, c.nascimento, cnh ? JSON.stringify(cnh) : null, await hashSenha(SENHA_DEMO), c.criadoEm].map(q).join(", ") + ");");
  }
  // carros da loja SPPAU sem exigência especial de habilitação, um por reserva
  const carros = FC.db.veiculos.filter((v) => v.ativo && v.tipo === "carro" && v.lojaResponsavel === "SPPAU" && !v.cnh && !v.acessibilidade.length);
  let k = 0, seq = 0;
  const reservas = [
    ["C1", "em_andamento", dia(agora, -2, 10), dia(agora, 2, 10)],
    ["C1", "confirmada", dia(agora, 10, 10), dia(agora, 13, 10)],
    ["C1", "encerrada", dia(agora, -40, 9), dia(agora, -36, 9)],
    ["C1", "encerrada", dia(agora, -95, 11), dia(agora, -88, 11)],
    ["C2", "encerrada", dia(agora, -30, 10), dia(agora, -27, 10)],
    ["C3", "encerrada", dia(agora, -60, 10), dia(agora, -55, 10)],
    ["C4", "encerrada", dia(agora, -20, 10), dia(agora, -17, 10)]
  ];
  for (const [cli, estado, ini, fim] of reservas) {
    const v = carros[k++ % carros.length];
    const sel = { veiculoId: v.id, lojaRetirada: "SPPAU", lojaDevolucao: "SPPAU", inicio: ini.toISOString(), fim: fim.toISOString() };
    const p = FC.calcularPreco(sel, {});
    const preco = { total: p.total, agora: p.agora, caucao: p.caucao, semanal: null, itens: p.itens.map((i) => ({ rotulo: i.rotulo, valor: Math.round(i.valor * 100) / 100, tipo: i.tipo })) };
    const codigo = "FC-EX" + String(++seq).padStart(3, "0");
    const criado = new Date(ini.getTime() - 5 * 86400000).toISOString();
    linhas.push("INSERT INTO reservas (codigo, cliente_id, veiculo_id, motorista_id, loja_retirada, loja_devolucao, inicio, fim, estado, pagamento, metodo, parcelas, preco_json, sel_json, tarifa_versao, bloqueio_expira, criado_em) VALUES (" +
      [codigo, cli, v.id, null, "SPPAU", "SPPAU", sel.inicio, sel.fim, estado, "aprovado", "pix", 1, JSON.stringify(preco), JSON.stringify(sel), p.tarifaVersao, null, criado].map(q).join(", ") + ");");
    linhas.push("INSERT INTO pagamentos (id_evento, reserva_codigo, metodo, parcelas, valor, resultado, criado_em) VALUES (" + [codigo + "-PG", codigo, "pix", 1, p.total, "aprovado", criado].map(q).join(", ") + ");");
    linhas.push("INSERT INTO eventos (reserva_codigo, data, autor, texto) VALUES (" + [codigo, criado, "sistema", "Reserva de exemplo da base de apresentação (pagamento aprovado via Pix)"].map(q).join(", ") + ");");
    if (estado !== "encerrada")
      linhas.push("INSERT INTO ocupacao (recurso, inicio, fim, tipo, ref, expira_em) VALUES (" + ["V:" + v.id, sel.inicio, sel.fim, "reserva", codigo, null].map(q).join(", ") + ");");
  }
  return linhas.join("\n") + "\n";
}

// rodando direto: imprime o SQL
if (import.meta.url === "file:///" + process.argv[1].replace(/\\/g, "/") || import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const { carregar } = require("../tests/carregar.js");
  const FC = carregar(["dados.js", "nucleo.js"]);
  process.stdout.write(await gerarSQL(FC, new Date()));
}
