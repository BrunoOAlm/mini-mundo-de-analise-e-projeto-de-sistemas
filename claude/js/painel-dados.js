/* Falls Car — cálculos do painel do empresário (RF87, RF11). Sem DOM: recebe a base e devolve números e listas,
   para a tela montar e para o backend reaproveitar. */
(function () {
  "use strict";
  var FC = window.FC;
  var DIA = 86400000;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function mesDe(d) { d = new Date(d); return d.getFullYear() + "-" + pad(d.getMonth() + 1); }
  function inicioDia(d) { d = new Date(d); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
  function mesmoDia(a, b) { return inicioDia(a) === inicioDia(b); }
  function dataHora(d) { d = new Date(d); return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + " " + pad(d.getHours()) + "h"; }
  function indice(lista, chave) { var m = {}; (lista || []).forEach(function (x) { m[x[chave]] = x; }); return m; }
  function soma(lista, f) { return lista.reduce(function (s, x) { return s + (f ? f(x) : x); }, 0); }
  var SITUACAO = { "locado": "alugado", "manutenção": "oficina", "em transferência": "transferencia" };

  FC.painelDados = function (db, agora, opts) {
    var noEscopo = opts.noEscopo, situacaoDe = opts.situacaoDe, t = new Date(agora).getTime();
    var lojas = indice(db.lojas, "id"), clientes = indice(db.clientes, "id"), grupos = indice(db.grupos, "id");
    var reservas = (db.reservas || []).filter(function (r) { return noEscopo(r.lojaRetirada) || noEscopo(r.lojaDevolucao); });
    var nomeLoja = function (id) { return lojas[id] ? lojas[id].nome : id || ""; };

    /* ---------- Frota ---------- */
    var frota = { total: 0, alugados: 0, patio: 0, oficina: 0, vistoria: 0, transferencia: 0, ocupacao: 0, parados48h: [], lista: [], porCategoria: [] };
    var porGrupo = {};
    (db.veiculos || []).forEach(function (v) {
      if (!v.ativo || !noEscopo(v.localAtual)) return;
      var bruto = situacaoDe(v);
      if (bruto === "inativo") return;
      var sit = SITUACAO[bruto] || (v.aguardandoVistoria ? "vistoria" : "patio");
      var onde = nomeLoja(v.localAtual), quando = "";
      if (sit === "alugado") {
        var r = reservas.filter(function (x) { return x.veiculoId === v.id && x.estado === "em_andamento"; })[0];
        if (r) { onde = clientes[r.clienteId] ? clientes[r.clienteId].nome : "Cliente"; quando = "devolve " + dataHora(r.fim); }
      } else if (sit === "oficina") {
        var m = (db.manutencoes || []).filter(function (x) { return x.veiculoId === v.id && x.status !== "concluida"; })[0];
        if (m) { onde = m.motivo; quando = "volta " + dataHora(m.fim); }
      } else if (sit === "transferencia") {
        var tr = (db.transferencias || []).filter(function (x) { return x.veiculoId === v.id && x.status !== "concluida"; })[0];
        if (tr) { onde = nomeLoja(tr.origem) + " → " + nomeLoja(tr.destino); quando = "chega " + dataHora(tr.chegadaPrevista); }
      } else if (sit === "vistoria") {
        quando = "aguardando vistoria";
      } else {
        var ultima = reservas.filter(function (x) { return x.veiculoId === v.id && x.estado === "encerrada"; })
          .reduce(function (mx, x) { return Math.max(mx, new Date(x.fim).getTime()); }, 0);
        if (t - ultima > 2 * DIA) { frota.parados48h.push(v); quando = ultima ? "parado há " + Math.floor((t - ultima) / DIA) + " dias" : "sem locação recente"; }
        else quando = "disponível";
      }
      frota.total++;
      frota[{ alugado: "alugados", patio: "patio", oficina: "oficina", vistoria: "vistoria", transferencia: "transferencia" }[sit]]++;
      frota.lista.push({ veiculo: v, situacao: sit, onde: onde, quando: quando });
      var g = porGrupo[v.grupo] = porGrupo[v.grupo] || { total: 0, alugados: 0 };
      g.total++; if (sit === "alugado") g.alugados++;
    });
    frota.ocupacao = frota.total ? frota.alugados / frota.total : 0;
    frota.porCategoria = Object.keys(porGrupo).map(function (id) {
      return { grupo: grupos[id] ? grupos[id].nome : id, ocupacao: porGrupo[id].alugados / porGrupo[id].total };
    }).sort(function (a, b) { return b.ocupacao - a.ocupacao; });

    /* ---------- Hoje ---------- */
    var hoje0 = inicioDia(t), cobr = db.cobrancas || [];
    var deHoje = cobr.filter(function (c) { return mesmoDia(c.vencimento, t); });
    var atrasados = cobr.filter(function (c) { return !c.pagoEm && inicioDia(c.vencimento) < hoje0; })
      .map(function (c) { return { cobranca: c, dias: Math.round((hoje0 - inicioDia(c.vencimento)) / DIA) }; })
      .sort(function (a, b) { return b.dias - a.dias; });
    var movimento = [];
    reservas.forEach(function (r) {
      if (r.estado === "confirmada" && mesmoDia(r.inicio, t) && noEscopo(r.lojaRetirada)) movimento.push({ hora: new Date(r.inicio), tipo: "retirada", reserva: r });
      if (r.estado === "em_andamento" && mesmoDia(r.fim, t) && noEscopo(r.lojaDevolucao || r.lojaRetirada)) movimento.push({ hora: new Date(r.fim), tipo: "devolucao", reserva: r });
    });
    movimento.sort(function (a, b) { return a.hora - b.hora; });
    var pend = [];
    var link = function (codigo) { return "#/admin/reserva/" + codigo; };
    reservas.forEach(function (r) {
      if (r.estado === "aguardando_pagamento") pend.push({ rotulo: "Pagamento pendente", ref: r.codigo, link: link(r.codigo) });
      if (r.estado === "excecao") pend.push({ rotulo: "Exceção de pagamento", ref: r.codigo, link: link(r.codigo) });
      if (r.estado === "em_andamento" && new Date(r.fim).getTime() < t) pend.push({ rotulo: "Devolução atrasada", ref: r.codigo, link: link(r.codigo) });
      (r.despesas || []).forEach(function (d) { if (d.status === "em contestação") pend.push({ rotulo: "Despesa contestada", ref: r.codigo, link: link(r.codigo) }); });
    });
    (db.transferencias || []).forEach(function (x) {
      if (x.status !== "concluida" && (noEscopo(x.origem) || noEscopo(x.destino)) && new Date(x.chegadaPrevista).getTime() < t) pend.push({ rotulo: "Transferência atrasada", ref: x.id, link: "#/admin/transferencias" });
    });
    if (typeof FC.reservasAfetadas === "function" && db === FC.db) FC.reservasAfetadas().forEach(function (a) {
      if (noEscopo(a.reserva.lojaRetirada)) pend.push({ rotulo: "Reserva afetada (" + a.motivo + ")", ref: a.reserva.codigo, link: "#/admin/manutencao" });
    });
    (db.clientes || []).forEach(function (c) { if (c.cnh && c.cnh.status === "pendente") pend.push({ rotulo: "CNH aguardando conferência", ref: c.nome, link: "#/admin/clientes" }); });
    (db.chamados || []).forEach(function (h) { if (h.status === "aberto" && (!h.loja || noEscopo(h.loja))) pend.push({ rotulo: "Chamado aberto", ref: h.protocolo, link: "#/admin/atendimento" }); });
    var hoje = {
      recebimentos: { total: soma(deHoje, function (c) { return c.valor; }), itens: deHoje },
      atrasados: { total: soma(atrasados, function (a) { return a.cobranca.valor; }), itens: atrasados },
      movimento: movimento, pendencias: pend
    };

    /* ---------- Financeiro (só gestor) ---------- */
    var financeiro = null;
    if (opts.verFinanceiro) {
      var base = new Date(t), meses = [];
      for (var i = 5; i >= 0; i--) meses.push(mesDe(new Date(base.getFullYear(), base.getMonth() - i, 1)));
      var VALIDOS = { encerrada: 1, em_andamento: 1, confirmada: 1 };
      // mês corrente: a receita é só até hoje, então as despesas (mensais) entram proporcionais aos dias corridos;
      // a variação compara com o mesmo período do mês anterior
      var diasNoMes = function (mes) { return new Date(+mes.slice(0, 4), +mes.slice(5), 0).getDate(); };
      var diaHoje = base.getDate();
      var resumo = function (mes, ateDia, frac) {
        var noPeriodo = function (d) { return mesDe(d) === mes && (!ateDia || new Date(d).getDate() <= ateDia); };
        var rs = reservas.filter(function (r) { return r.pagamento === "aprovado" && VALIDOS[r.estado] && noPeriodo(r.inicio); });
        var fatRes = soma(rs, function (r) { return (r.preco && r.preco.total) || 0; });
        var fatCob = soma(cobr.filter(function (c) { return c.pagoEm && noPeriodo(c.pagoEm); }), function (c) { return c.valor; });
        var desp = (db.despesas || []).filter(function (d) { return d.mes === mes && noEscopo(d.loja); });
        var cats = {}; desp.forEach(function (d) { cats[d.categoria] = (cats[d.categoria] || 0) + d.valor; });
        Object.keys(cats).forEach(function (c) { cats[c] = Math.round(cats[c] * frac); });
        var despesas = soma(Object.keys(cats), function (c) { return cats[c]; }); // soma das categorias já arredondadas
        return { mes: mes, faturamento: fatRes + fatCob, despesas: despesas, lucro: fatRes + fatCob - despesas, fatRes: fatRes, n: rs.length, cats: cats };
      };
      var serie = meses.map(function (m, i) { return i === 5 ? resumo(m, 0, diaHoje / diasNoMes(m)) : resumo(m, 0, 1); });
      var atual = serie[5], anterior = resumo(meses[4], diaHoje, Math.min(1, diaHoje / diasNoMes(meses[4])));
      var porCat = atual.cats;
      financeiro = {
        mes: {
          faturamento: atual.faturamento, despesas: atual.despesas, lucro: atual.lucro,
          margem: atual.faturamento ? atual.lucro / atual.faturamento : 0,
          ticket: atual.n ? atual.fatRes / atual.n : 0,
          variacaoLucro: anterior.lucro ? (atual.lucro - anterior.lucro) / Math.abs(anterior.lucro) : 0
        },
        serie: serie.map(function (s) { return { mes: s.mes, faturamento: s.faturamento, despesas: s.despesas, lucro: s.lucro }; }),
        despesasPorCategoria: Object.keys(porCat).map(function (c) { return { categoria: c, valor: porCat[c] }; }).sort(function (a, b) { return b.valor - a.valor; })
      };
    }
    return { frota: frota, hoje: hoje, financeiro: financeiro };
  };
})();
