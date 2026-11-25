// Reservas, ocupação e pagamento simulado no servidor (RF05, RF45, RF50, RF78–RF81, RN02, RN03, RNF34, RNF35).
// O catálogo e as regras de preço/habilitação vêm do mesmo dados.js + nucleo.js do site (FC).
import { gravarCnh } from "./contas.mjs";

function iso(d) { return new Date(d).toISOString(); }

// O servidor não usa as reservas de demonstração do navegador: começa vazio e só recebe, a cada cálculo,
// o que importa do banco (usos de cupom e locações válidas do cliente).
export function prepararFC(FC) {
  FC.db.reservas = []; FC.db.agenda = []; FC.db.reservasAcessorios = [];
  FC._usosBase = {}; FC.db.cupons.forEach((c) => { FC._usosBase[c.codigo] = c.usos; });
}

function linhaParaReserva(l, eventos, agora) {
  // reserva não paga cujo bloqueio venceu aparece como expirada (o carro já foi liberado)
  const expirada = l.estado === "aguardando_pagamento" && l.bloqueio_expira && agora && l.bloqueio_expira < iso(agora);
  return {
    codigo: l.codigo, veiculoId: l.veiculo_id, motorista: l.motorista_id, lojaRetirada: l.loja_retirada, lojaDevolucao: l.loja_devolucao,
    inicio: l.inicio, fim: l.fim, estado: expirada ? "expirada" : l.estado, pagamento: l.pagamento, metodo: l.metodo, parcelas: l.parcelas,
    preco: JSON.parse(l.preco_json), tarifaVersao: l.tarifa_versao, bloqueioExpira: l.bloqueio_expira, criadoEm: l.criado_em,
    eventos: (eventos || []).map((e) => ({ data: e.data, autor: e.autor, evento: e.texto }))
  };
}

// Ocupa um recurso só se não houver intervalo sobreposto ativo (uma instrução: atômica no SQLite/D1).
const SQL_OCUPAR = "INSERT INTO ocupacao (recurso, inicio, fim, tipo, ref, expira_em) SELECT ?1, ?2, ?3, ?4, ?5, ?6 " +
  "WHERE NOT EXISTS (SELECT 1 FROM ocupacao WHERE recurso = ?1 AND inicio < ?3 AND fim > ?2 AND (expira_em IS NULL OR expira_em > ?7))";
async function ocupar(ctx, recurso, inicio, fim, tipo, ref, expira) {
  const r = await ctx.db.prepare(SQL_OCUPAR).bind(recurso, inicio, fim, tipo, ref, expira, iso(ctx.agora())).run();
  return r.meta.changes === 1;
}

export async function ocupados(ctx, inicio, fim) {
  const { results } = await ctx.db.prepare("SELECT recurso, inicio, fim FROM ocupacao WHERE recurso LIKE 'V:%' AND inicio < ? AND fim > ? AND (expira_em IS NULL OR expira_em > ?)")
    .bind(iso(fim), iso(inicio), iso(ctx.agora())).all();
  return results.map((o) => ({ veiculoId: o.recurso.slice(2), inicio: o.inicio, fim: o.fim }));
}

async function precoNoServidor(ctx, cliente, s) {
  const FC = ctx.FC;
  // usos de cupom e "primeira locação" vêm do banco; o cálculo é síncrono, sem intercalar com outras requisições
  const usos = (await ctx.db.prepare("SELECT codigo, COUNT(*) AS n FROM cupons_uso GROUP BY codigo").all()).results;
  const validas = (await ctx.db.prepare("SELECT estado FROM reservas WHERE cliente_id = ? AND estado IN ('encerrada', 'em_andamento')").bind(cliente.id).all()).results;
  FC.db.cupons.forEach((c) => { const u = usos.find((x) => x.codigo === c.codigo); c.usos = (FC._usosBase[c.codigo] || 0) + (u ? u.n : 0); });
  FC.db.reservas = validas.map((r) => ({ clienteId: cliente.id, estado: r.estado }));
  try {
    if (s.cupom) { const cv = FC.cupomValido(s.cupom, s, cliente.id); if (cv && cv.erro) return { erro: cv.erro, campos: { cupom: cv.erro } }; }
    return { preco: FC.calcularPreco(s, { clienteId: cliente.id }) };
  } finally { FC.db.reservas = []; }
}

// só os campos que a regra usa, com tipos e tamanhos limitados; status sempre pendente (conferência é da empresa)
const CATEGORIAS = ["A", "B", "AB", "C", "D", "E", "AC", "AD", "AE", "ACC"];
export function limparCnh(c) {
  if (!c || typeof c !== "object") return null;
  const validade = new Date(c.validade);
  return {
    numero: String(c.numero || "").replace(/[^0-9A-Za-z-]/g, "").slice(0, 20),
    categoria: CATEGORIAS.indexOf(String(c.categoria || "").toUpperCase()) >= 0 ? String(c.categoria).toUpperCase() : "",
    validade: isNaN(validade) ? "" : validade.toISOString().slice(0, 10),
    restricoes: Array.isArray(c.restricoes) ? c.restricoes.slice(0, 5).map((x) => String(x).slice(0, 60)) : [],
    status: "pendente"
  };
}

function validar(ctx, cliente, s) {
  const FC = ctx.FC, campos = {}, agora = ctx.agora();
  const v = FC.veiculoById(s.veiculoId);
  const lr = FC.lojaById(s.lojaRetirada), ld = FC.lojaById(s.lojaDevolucao || s.lojaRetirada);
  if (!v || !v.ativo) campos.veiculo = "Veículo não encontrado.";
  if (!lr) campos.lojaRetirada = "Loja de retirada inválida.";
  if (!ld) campos.lojaDevolucao = "Loja de devolução inválida.";
  const ini = new Date(s.inicio), fim = new Date(s.fim);
  if (isNaN(ini) || isNaN(fim)) campos.datas = "Datas inválidas.";
  else {
    if (ini.getTime() < agora.getTime() + (FC.cfg().antecedenciaMin || 0) * 60000) campos.inicio = "A retirada precisa ser no futuro.";
    if (fim <= ini) campos.fim = "A devolução precisa ser depois da retirada.";
  }
  if (!s.aceite || !s.aceite.versao) campos.aceite = "É preciso aceitar os termos, o preço e a política de cancelamento.";
  if (Object.keys(campos).length) return campos;
  if (lr.id !== ld.id && !FC.cfg().devolucaoOutraLoja.habilitada) campos.lojaDevolucao = "Devolução em outra loja ainda não está liberada.";
  const hr = FC.validaHorario(lr, ini); if (!hr.ok) campos.inicio = hr.msg;
  const hd = FC.validaHorario(ld, fim); if (!hd.ok) campos.fim = hd.msg;
  if (s.motorista) {
    const m = FC.motoristaById(s.motorista);
    if (!m || !m.ativo || m.lojas.indexOf(lr.id) < 0 || !FC.categoriaCompativel(m.categoria, v)) campos.motorista = "Motorista indisponível para esta loja ou veículo.";
  } else {
    const cp = s.condutorPrincipal || {};
    // o próprio cliente com CNH no perfil: vale a do perfil, não a que o navegador mandou
    const cnh = cp.proprio && cliente.cnh ? cliente.cnh : limparCnh(cp.cnh);
    const av = FC.avaliaCondutor(cnh, v, fim, "Condutor principal");
    if (!av.ok) campos.cnh = av.motivos.join(" ");
  }
  (s.condutores || []).forEach((c, i) => {
    const av = FC.avaliaCondutor(limparCnh(c && c.cnh), v, fim, "Condutor adicional " + (i + 1));
    if (!av.ok) campos["condutor" + i] = av.motivos.join(" ");
  });
  if ((s.condutores || []).length > FC.cfg().maxCondutoresAdicionais) campos.condutores = "Número de condutores adicionais acima do permitido.";
  return Object.keys(campos).length ? campos : null;
}

export async function criarReserva(ctx, cliente, sel) {
  const FC = ctx.FC;
  const s = { veiculoId: sel.veiculoId, lojaRetirada: sel.lojaRetirada, lojaDevolucao: sel.lojaDevolucao || sel.lojaRetirada,
    inicio: sel.inicio, fim: sel.fim, motorista: sel.motorista || null, protecoes: sel.protecoes || [], acessorios: sel.acessorios || [],
    km: sel.km || null, cupom: sel.cupom ? String(sel.cupom).trim().toUpperCase() : null, plano: sel.plano || null,
    condutorPrincipal: sel.condutorPrincipal ? { proprio: !!sel.condutorPrincipal.proprio, nome: String(sel.condutorPrincipal.nome || "").slice(0, 120), cnh: limparCnh(sel.condutorPrincipal.cnh) } : null,
    condutores: (Array.isArray(sel.condutores) ? sel.condutores.slice(0, 5) : []).map((c) => ({ nome: String((c && c.nome) || "").slice(0, 120), cnh: limparCnh(c && c.cnh) })),
    aceite: sel.aceite && sel.aceite.versao ? { versao: String(sel.aceite.versao).slice(0, 40) } : null };
  const campos = validar(ctx, cliente, s);
  if (campos) return { erro: "Revise os dados da reserva.", campos, status: 400 };
  const pr = await precoNoServidor(ctx, cliente, s);
  if (pr.erro) return { erro: pr.erro, campos: pr.campos, status: 400 };
  const preco = pr.preco;

  const agora = ctx.agora(), expira = iso(agora.getTime() + FC.cfg().holdMin * 60000);
  const ini = iso(s.inicio), fim = iso(s.fim);
  let codigo = null;
  for (let i = 0; i < 5 && !codigo; i++) { const c = FC.novoCodigo(); if (!(await ctx.db.prepare("SELECT 1 FROM reservas WHERE codigo = ?").bind(c).first())) codigo = c; }

  if (!(await ocupar(ctx, "V:" + s.veiculoId, ini, fim, "bloqueio", codigo, expira)))
    return { erro: "Este veículo acabou de ficar indisponível para o período. Escolha outro veículo ou outras datas.", status: 409 };
  if (s.motorista && !(await ocupar(ctx, "M:" + s.motorista, ini, fim, "bloqueio", codigo, expira))) {
    await ctx.db.prepare("DELETE FROM ocupacao WHERE ref = ?").bind(codigo).run();
    return { erro: "O motorista não está livre neste período.", status: 409 };
  }

  const precoGuardado = { total: preco.total, agora: preco.agora, caucao: preco.caucao, semanal: preco.semanal,
    itens: preco.itens.map((i) => ({ rotulo: i.rotulo, valor: Math.round(i.valor * 100) / 100, tipo: i.tipo })) };
  const agoraIso = iso(agora);
  const stmts = [
    ctx.db.prepare("INSERT INTO reservas (codigo, cliente_id, veiculo_id, motorista_id, loja_retirada, loja_devolucao, inicio, fim, estado, pagamento, metodo, parcelas, preco_json, sel_json, tarifa_versao, bloqueio_expira, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aguardando_pagamento', 'pendente', NULL, 1, ?, ?, ?, ?, ?)")
      .bind(codigo, cliente.id, s.veiculoId, s.motorista, s.lojaRetirada, s.lojaDevolucao, ini, fim, JSON.stringify(precoGuardado), JSON.stringify(s), preco.tarifaVersao, expira, agoraIso),
    ctx.db.prepare("INSERT INTO eventos (reserva_codigo, data, autor, texto) VALUES (?, ?, ?, ?)").bind(codigo, agoraIso, cliente.nome, "Reserva criada pelo site; aguardando pagamento até " + FC.horaBR(expira))
  ];
  if (s.cupom) stmts.push(ctx.db.prepare("INSERT INTO cupons_uso (codigo, reserva_codigo, cliente_id) VALUES (?, ?, ?)").bind(s.cupom, codigo, cliente.id));
  await ctx.db.batch(stmts);
  const cp = s.condutorPrincipal;
  if (cp && cp.proprio && cp.cnh && cp.cnh.categoria && !cliente.cnh) await gravarCnh(ctx, cliente.id, cp.cnh);
  return { reserva: await obterReserva(ctx, cliente.id, codigo) };
}

export async function obterReserva(ctx, clienteId, codigo) {
  const l = await ctx.db.prepare("SELECT * FROM reservas WHERE codigo = ? AND cliente_id = ?").bind(String(codigo || ""), clienteId).first();
  if (!l) return null;
  const ev = (await ctx.db.prepare("SELECT data, autor, texto FROM eventos WHERE reserva_codigo = ? ORDER BY id").bind(l.codigo).all()).results;
  return linhaParaReserva(l, ev, ctx.agora());
}

export async function listarReservas(ctx, clienteId) {
  const { results } = await ctx.db.prepare("SELECT * FROM reservas WHERE cliente_id = ? ORDER BY criado_em DESC, rowid DESC").bind(clienteId).all();
  return results.map((l) => linhaParaReserva(l, [], ctx.agora()));
}

// Pagamento simulado (RF45, RF79–RF82, RF84). Idempotente por idEvento; confirma só com bloqueio/capacidade.
const METODOS = { pix: "Pix", credito: "cartão de crédito", debito: "cartão de débito" };
const RESULTADOS = ["aprovado", "recusado", "pendente", "aprovado_tardio"];

export async function pagar(ctx, cliente, codigo, p) {
  const db = ctx.db, FC = ctx.FC;
  if (!METODOS[p && p.metodo]) return { erro: "Meio de pagamento inválido.", campos: { metodo: "Escolha Pix, crédito ou débito." }, status: 400 };
  if (RESULTADOS.indexOf(p.resultado) < 0) return { erro: "Resultado de simulação inválido.", status: 400 };
  const idEvento = String(p.idEvento || "").slice(0, 80);
  if (!idEvento) return { erro: "Identificador do pagamento ausente.", status: 400 };
  const l = await db.prepare("SELECT * FROM reservas WHERE codigo = ? AND cliente_id = ?").bind(String(codigo || ""), cliente.id).first();
  if (!l) return { erro: "Reserva não encontrada.", status: 404 };
  const duplicado = async (msg) => ({ reserva: await obterReserva(ctx, cliente.id, l.codigo), duplicado: true, msg: msg || "Este pagamento já foi processado; nada foi cobrado de novo." });
  if (await db.prepare("SELECT 1 FROM pagamentos WHERE id_evento = ?").bind(idEvento).first()) return duplicado();
  if (l.pagamento === "aprovado") return duplicado("Pagamento já aprovado anteriormente; confirmação não duplicada.");
  if (l.estado !== "aguardando_pagamento") return { erro: "Esta reserva não está aguardando pagamento.", status: 409 };

  // só uma requisição por vez processa esta reserva (RF80, RNF34): quem não conseguir marcar "processando" para aqui
  const anterior = l.pagamento;
  const marcou = await db.prepare("UPDATE reservas SET pagamento = 'processando' WHERE codigo = ? AND cliente_id = ? AND estado = 'aguardando_pagamento' AND pagamento NOT IN ('aprovado', 'processando')")
    .bind(l.codigo, cliente.id).run();
  if (marcou.meta.changes !== 1) {
    const atual = await db.prepare("SELECT pagamento FROM reservas WHERE codigo = ?").bind(l.codigo).first();
    if (atual && atual.pagamento === "aprovado") return duplicado("Pagamento já aprovado anteriormente; confirmação não duplicada.");
    return { erro: "Este pagamento já está sendo processado. Aguarde um instante.", status: 409 };
  }
  const devolver = () => db.prepare("UPDATE reservas SET pagamento = ? WHERE codigo = ? AND pagamento = 'processando'").bind(anterior, l.codigo).run();
  try {
    return await processarPagamento(ctx, cliente, l, p, idEvento);
  } catch (e) {
    await devolver();
    if (await db.prepare("SELECT 1 FROM pagamentos WHERE id_evento = ?").bind(idEvento).first()) return duplicado();
    throw e;
  }
}

async function processarPagamento(ctx, cliente, l, p, idEvento) {
  const db = ctx.db, FC = ctx.FC;
  const agora = ctx.agora(), agoraIso = iso(agora), nome = METODOS[p.metodo];
  const parcelas = p.metodo === "credito" ? Math.max(1, Math.min(12, Number(p.parcelas) || 1)) : 1;
  const preco = JSON.parse(l.preco_json), valor = preco.agora != null ? preco.agora : preco.total;
  const ev = (texto, autor) => db.prepare("INSERT INTO eventos (reserva_codigo, data, autor, texto) VALUES (?, ?, ?, ?)").bind(l.codigo, agoraIso, autor || "simulador", texto);
  const regPg = db.prepare("INSERT INTO pagamentos (id_evento, reserva_codigo, metodo, parcelas, valor, resultado, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(idEvento, l.codigo, p.metodo, parcelas, valor, p.resultado, agoraIso);

  if (p.resultado === "recusado" || p.resultado === "pendente") {
    const estadoPg = p.resultado === "recusado" ? "recusado" : "pendente";
    await db.batch([regPg, db.prepare("UPDATE reservas SET pagamento = ?, metodo = ? WHERE codigo = ?").bind(estadoPg, p.metodo, l.codigo),
      ev(p.resultado === "recusado" ? "Pagamento recusado (" + nome + "); reserva não confirmada" : "Pagamento em análise (" + nome + ")")]);
    return { reserva: await obterReserva(ctx, cliente.id, l.codigo),
      msg: p.resultado === "recusado" ? "Pagamento recusado. A reserva não foi confirmada; tente outro meio enquanto o bloqueio estiver ativo." : "Pagamento em análise. A reserva só será confirmada após a aprovação." };
  }

  // aprovado: transforma o bloqueio ainda válido em reserva numa única instrução; se o bloqueio já venceu,
  // tenta ocupar de novo (aprovação tardia, RF81)
  const firmou = await db.prepare("UPDATE ocupacao SET tipo = 'reserva', expira_em = NULL WHERE ref = ? AND (expira_em IS NULL OR expira_em > ?)").bind(l.codigo, agoraIso).run();
  const temVeiculo = firmou.meta.changes > 0 && (await db.prepare("SELECT 1 FROM ocupacao WHERE ref = ? AND recurso LIKE 'V:%' AND expira_em IS NULL").bind(l.codigo).first());
  let ok = !!temVeiculo, tardio = !temVeiculo;
  if (tardio) {
    await db.prepare("DELETE FROM ocupacao WHERE ref = ?").bind(l.codigo).run();
    ok = await ocupar(ctx, "V:" + l.veiculo_id, l.inicio, l.fim, "reserva", l.codigo, null);
    if (ok && l.motorista_id && !(await ocupar(ctx, "M:" + l.motorista_id, l.inicio, l.fim, "reserva", l.codigo, null))) {
      await db.prepare("DELETE FROM ocupacao WHERE ref = ?").bind(l.codigo).run(); ok = false;
    }
  }
  const parc = parcelas > 1 ? ", " + parcelas + "x" : "";
  if (ok) {
    await db.batch([regPg,
      db.prepare("UPDATE reservas SET estado = 'confirmada', pagamento = 'aprovado', metodo = ?, parcelas = ?, bloqueio_expira = NULL WHERE codigo = ?").bind(p.metodo, parcelas, l.codigo),
      ev("Pagamento aprovado (" + nome + parc + ")"),
      ev(tardio ? "Aprovação após o fim do bloqueio: o veículo ainda estava livre e a reserva foi confirmada após nova verificação (RF81)" : "Reserva confirmada após aprovação do pagamento e verificação final de capacidade (RF80)", "sistema")]);
    return { reserva: await obterReserva(ctx, cliente.id, l.codigo), msg: "Pagamento aprovado e reserva confirmada." };
  }
  await db.batch([regPg,
    db.prepare("UPDATE reservas SET estado = 'excecao', pagamento = 'aprovado', metodo = ?, parcelas = ?, bloqueio_expira = NULL WHERE codigo = ?").bind(p.metodo, parcelas, l.codigo),
    ev("Pagamento aprovado (" + nome + parc + ")"),
    ev("Pagamento aprovado sem capacidade disponível: exceção aberta e reembolso integral de " + FC.brl(valor) + " iniciado (RF81, RF82)", "sistema")]);
  return { reserva: await obterReserva(ctx, cliente.id, l.codigo),
    msg: "O pagamento foi aprovado depois que o veículo deixou de estar disponível. Nenhum outro veículo foi reservado e o reembolso integral foi iniciado." };
}

// Cliente desiste antes de pagar: cancela e libera o veículo (e o motorista) na hora
export async function cancelar(ctx, cliente, codigo) {
  const db = ctx.db;
  const l = await db.prepare("SELECT * FROM reservas WHERE codigo = ? AND cliente_id = ?").bind(String(codigo || ""), cliente.id).first();
  if (!l) return { erro: "Reserva não encontrada.", status: 404 };
  const r = await db.prepare("UPDATE reservas SET estado = 'cancelada', bloqueio_expira = NULL WHERE codigo = ? AND estado = 'aguardando_pagamento' AND pagamento NOT IN ('aprovado', 'processando')").bind(l.codigo).run();
  if (r.meta.changes !== 1) return { erro: "Esta reserva não pode mais ser cancelada por aqui.", status: 409 };
  await db.batch([db.prepare("DELETE FROM ocupacao WHERE ref = ? AND tipo = 'bloqueio'").bind(l.codigo),
    db.prepare("INSERT INTO eventos (reserva_codigo, data, autor, texto) VALUES (?, ?, ?, ?)").bind(l.codigo, iso(ctx.agora()), cliente.nome, "Cliente desistiu antes do pagamento; veículo liberado")]);
  return { reserva: await obterReserva(ctx, cliente.id, l.codigo), msg: "Reserva cancelada e veículo liberado." }; }
