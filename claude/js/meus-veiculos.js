/* Falls Car — "Meus veículos": painel do cliente com as locações gravadas no servidor (RF53). Só consulta. */
(function () {
  "use strict";
  var FC = window.FC, esc = FC.esc, brl = FC.brl, icon = FC.icon, $ = FC.$;
  var DIA = 86400000;
  var ESTADO = { em_andamento: ["Em andamento", "on"], confirmada: ["Confirmada", "ok"], aguardando_pagamento: ["Aguardando pagamento", "warn"],
    encerrada: ["Encerrada", "mut"], cancelada: ["Cancelada", "mut"], expirada: ["Expirada", "mut"], excecao: ["Em análise (reembolso)", "bad"] };
  var carregado = null; // { em: Date, reservas: [] } — uma busca por visita à tela

  function selo(e) { var s = ESTADO[e] || [e, "mut"]; return '<span class="mv-selo mv-selo--' + s[1] + '">' + esc(s[0]) + "</span>"; }
  function loja(id) { var l = FC.lojaById(id); return l ? l.nome : id; }
  function quando(r) {
    var agora = Date.now(), ini = new Date(r.inicio).getTime(), fim = new Date(r.fim).getTime();
    if (r.estado === "em_andamento") { var d = Math.ceil((fim - agora) / DIA); return d > 1 ? "Devolução em " + d + " dias" : d === 1 ? "Devolução amanhã" : "Devolução hoje"; }
    if (r.estado === "confirmada" && ini > agora) { var n = Math.ceil((ini - agora) / DIA); return n > 1 ? "Retirada em " + n + " dias" : n === 1 ? "Retirada amanhã" : "Retirada hoje"; }
    return "";
  }
  function datas(r) { return '<span class="mv-datas">' + icon("calendar", 15) + FC.dtBR(r.inicio) + " → " + FC.dtBR(r.fim) + "</span>"; }
  function lojas(r) { return '<span class="mv-lojas">' + icon("pin", 15) + esc(loja(r.lojaRetirada)) + (r.lojaDevolucao && r.lojaDevolucao !== r.lojaRetirada ? " → " + esc(loja(r.lojaDevolucao)) : "") + "</span>"; }
  function comprovante(r) { return '<a class="mv-link" href="#/confirmacao/' + encodeURIComponent(r.codigo) + '">Ver comprovante' + icon("chevron-right", 12) + "</a>"; }

  function destaque(r) {
    var v = FC.veiculoById(r.veiculoId) || { modelo: "Veículo", tipo: "carro" };
    return '<article class="mv-destaque"><div class="mv-destaque__foto">' + FC.vehImg(v, "mv-img") + '</div><div class="mv-destaque__info">' +
      selo(r.estado) + '<h2 class="mv-destaque__modelo">' + esc(v.modelo) + '</h2><p class="mv-destaque__quando">' + esc(quando(r)) + "</p>" +
      '<div class="mv-meta">' + datas(r) + lojas(r) + "</div>" +
      '<div class="mv-destaque__pe"><div><span class="mv-rot">Valor pago</span><b>' + brl(r.preco ? r.preco.total : 0) + '</b></div><span class="mv-cod">' + esc(r.codigo) + "</span>" + comprovante(r) + "</div></div></article>";
  }
  function cartao(r) {
    var v = FC.veiculoById(r.veiculoId) || { modelo: "Veículo", tipo: "carro" };
    return '<article class="mv-card"><div class="mv-card__foto">' + FC.vehImg(v, "mv-img") + '</div><div class="mv-card__info">' + selo(r.estado) +
      '<h3 class="mv-card__modelo">' + esc(v.modelo) + "</h3>" + (quando(r) ? '<p class="mv-card__quando">' + esc(quando(r)) + "</p>" : "") +
      '<div class="mv-meta">' + datas(r) + lojas(r) + '</div><div class="mv-card__pe"><b>' + brl(r.preco ? r.preco.total : 0) + "</b>" + comprovante(r) + "</div></div></article>";
  }
  function linha(r) {
    var v = FC.veiculoById(r.veiculoId) || { modelo: "Veículo", tipo: "carro" };
    return '<li class="mv-hist"><div class="mv-hist__foto">' + FC.vehImg(v, "mv-img") + '</div><div class="mv-hist__txt"><b>' + esc(v.modelo) + "</b>" +
      '<span class="mv-sub">' + FC.dataBR(r.inicio) + " → " + FC.dataBR(r.fim) + " · " + esc(loja(r.lojaRetirada)) + "</span></div>" +
      selo(r.estado) + '<b class="mv-hist__valor">' + brl(r.preco ? r.preco.total : 0) + "</b>" + comprovante(r) + "</li>";
  }

  FC.route("meus-veiculos", function (view) {
    var c = FC.clienteAtual();
    if (!c || !c.servidor) {
      view.innerHTML = '<div class="container page" style="max-width:720px"><h1 class="t-h2" style="margin-bottom:8px">Meus veículos</h1><p class="muted" style="margin-bottom:16px">Entre na sua conta para ver os veículos que você alugou.</p><div class="box" id="auth"></div></div>';
      FC.authWidget($("#auth", view), function () { carregado = null; FC.render(); });
      return;
    }
    if (!carregado || carregado.cliente !== c.id || Date.now() - carregado.em > 30000) {
      view.innerHTML = '<div class="container page mv"><h1 class="t-h2">Meus veículos</h1><p class="muted" role="status" style="margin-top:12px">Carregando suas locações…</p></div>';
      FC.api("GET", "/reservas").then(function (r) {
        if (r.status === 401) { FC.esquecerClienteServidor(); carregado = null; FC.render(); return; }
        carregado = { cliente: c.id, em: Date.now(), reservas: r.ok ? r.dados.reservas : [], erro: r.ok ? null : (r.dados.erro || "Não foi possível carregar.") };
        carregado.reservas.forEach(function (x) { FC.guardarReservaServidor(x); });
        FC.render();
      });
      return;
    }
    var rs = carregado.reservas, agora = Date.now();
    var andamento = rs.filter(function (r) { return r.estado === "em_andamento"; });
    var proximas = rs.filter(function (r) { return (r.estado === "confirmada" || r.estado === "aguardando_pagamento") && new Date(r.fim).getTime() > agora; })
      .sort(function (a, b) { return new Date(a.inicio) - new Date(b.inicio); });
    var historico = rs.filter(function (r) { return andamento.indexOf(r) < 0 && proximas.indexOf(r) < 0; })
      .sort(function (a, b) { return new Date(b.inicio) - new Date(a.inicio); });
    var vazio = function (t) { return '<p class="mv-vazio">' + t + "</p>"; };
    view.innerHTML = '<div class="container page mv"><div class="mv-topo"><div><h1 class="t-h2">Meus veículos</h1><p class="muted">Olá, ' + esc(c.nome.split(" ")[0]) + ". Aqui ficam os veículos que você alugou com a Falls Car.</p></div>" +
      '<a class="btn btn--primary" href="#/">Alugar outro veículo</a></div>' +
      (carregado.erro ? '<div class="note note--bad" role="alert">' + icon("alert", 16) + "<span>" + esc(carregado.erro) + "</span></div>" : "") +
      '<section class="mv-sec" aria-labelledby="mv-a"><h2 id="mv-a" class="mv-sec__t">Em andamento</h2>' + (andamento.length ? andamento.map(destaque).join("") : vazio("Nenhum veículo com você agora.")) + "</section>" +
      '<section class="mv-sec" aria-labelledby="mv-p"><h2 id="mv-p" class="mv-sec__t">Próximas reservas</h2>' + (proximas.length ? '<div class="mv-grade">' + proximas.map(cartao).join("") + "</div>" : vazio('Nenhuma reserva futura. <a class="link" href="#/">Encontrar um veículo</a>')) + "</section>" +
      '<section class="mv-sec" aria-labelledby="mv-h"><h2 id="mv-h" class="mv-sec__t">Histórico</h2>' + (historico.length ? '<ul class="mv-lista">' + historico.map(linha).join("") + "</ul>" : vazio("Suas locações encerradas aparecem aqui.")) + "</section></div>";
  });
})();
