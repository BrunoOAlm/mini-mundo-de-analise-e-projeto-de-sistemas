/* Falls Car — administração: shell, painel, reservas/locações, reserva assistida */
(function () {
  "use strict";
  var FC = window.FC, $ = FC.$, $$ = FC.$$, esc = FC.esc, icon = FC.icon, rf = FC.rf, brl = FC.brl;
  FC.adminPages = {};

  var MENU = [
    ["Operação", [["painel", "Painel", "chart", "painel"], ["reservas", "Reservas e locações", "list", "reservas:ver"], ["assistida", "Nova reserva assistida", "phone", "assistida"], ["frota", "Frota", "car", "frota:ver"], ["agenda", "Agenda de disponibilidade", "calendar", "frota:ver"], ["transferencias", "Transferências", "truck", "transferencias"], ["manutencao", "Manutenção", "wrench", "manutencao"], ["motoristas", "Motoristas", "driver", "motoristas:ver"]]],
    ["Clientes", [["clientes", "Clientes e documentos", "users", "clientes"], ["atendimento", "Atendimento", "chat", "atendimento"], ["lgpd", "Pedidos de privacidade", "lock", "clientes"], ["saida", "Caixa de saída", "inbox", "saida"]]],
    ["Gestão", [["relatorios", "Relatórios", "chart", "relatorios"], ["lojas", "Lojas", "store", "lojas:ver"], ["tarifas", "Tarifas e políticas", "money", "tarifas"], ["usuarios", "Usuários internos", "account", "usuarios"], ["auditoria", "Auditoria", "doc", "auditoria"], ["requisitos", "Mapa de requisitos", "check", "requisitos"]]]
  ];

  FC.route("admin", function (view, rt) {
    var u = FC.adminAtual();
    if (!u) { FC.telaLoginAdmin(view); return; }
    var page = rt.parts[1] || "painel";
    var item = null;
    MENU.forEach(function (g) { g[1].forEach(function (i) { if (i[0] === page) item = i; }); });
    if (page === "reserva") item = ["reservas", "", "", "reservas:ver"];
    var permitido = item && FC.pode(item[3]);
    view.innerHTML = '<div class="admin"><nav class="admin__side" aria-label="Menu administrativo"><div class="admin__user">' + icon("account", 14) + " <strong>" + esc(u.nome) + "</strong><br>" + FC.PERFIS[u.perfil] + "<br><span style=\"opacity:.75\">Lojas: " + (u.lojas[0] === "*" ? "todas" : u.lojas.join(", ")) + "</span>" + rf("RF70") + "</div>" +
      MENU.map(function (g) {
        return "<h2>" + g[0] + "</h2>" + g[1].map(function (i) {
          var ok = FC.pode(i[3]);
          return '<a href="#/admin/' + i[0] + '" class="' + (i[0] === (page === "reserva" ? "reservas" : page) ? "is-active" : "") + '"' + (ok ? "" : ' aria-disabled="true" tabindex="-1" title="Sem permissão para o seu perfil"') + ">" + icon(i[2], 16) + i[1] + "</a>";
        }).join("");
      }).join("") + '<div class="admin__demo"><label class="switch"><input type="checkbox" id="toggle-rf"' + (document.body.classList.contains("show-rf") ? " checked" : "") + '> Mostrar requisitos (RF/RNF)</label><button type="button" class="btn btn--link" id="reset-db">Restaurar base de demonstração</button></div></nav><div class="admin__main" id="admin-main"></div></div>';
    var main = $("#admin-main", view);
    if (!permitido) {
      FC.audit("Acesso negado", "admin/" + page, "perfil " + u.perfil, "negado");
      FC.save();
      main.innerHTML = '<div class="note note--bad">' + icon("lock", 16) + "<span>Seu perfil (" + FC.PERFIS[u.perfil] + ") não tem permissão para esta área. A tentativa foi registrada na auditoria." + rf("RNF32") + "</span></div>";
      return;
    }
    FC.adminPages[page](main, rt);
  });

  FC.lojasEscopo = function () { return FC.db.lojas.filter(function (l) { return FC.noEscopo(l.id); }); };
  FC.selLojaEscopo = function (id, val, todas) {
    return '<select class="sel" id="' + id + '">' + (todas !== false ? '<option value="">Todas do meu escopo</option>' : "") + FC.lojasEscopo().map(function (l) { return '<option value="' + l.id + '"' + (l.id === val ? " selected" : "") + ">" + esc(l.nome) + "</option>"; }).join("") + "</select>";
  };
  FC.head = function (titulo, sub, acoes) { return '<div class="page-head"><div><h1 class="t-h2">' + titulo + "</h1>" + (sub ? "<p>" + sub + "</p>" : "") + "</div>" + (acoes ? '<div class="row">' + acoes + "</div>" : "") + "</div>"; };

  /* Painel (RF87): claude/js/painel.js */

  /* ---------- Reservas e locações ---------- */
  var resFiltro = { estado: "", loja: "", canal: "", q: "" };
  FC.adminPages.reservas = function (main) {
    var f = resFiltro;
    var lista = FC.db.reservas.filter(function (r) {
      if (!FC.noEscopo(r.lojaRetirada) && !FC.noEscopo(r.lojaDevolucao)) return false;
      if (f.estado && r.estado !== f.estado) return false;
      if (f.loja && r.lojaRetirada !== f.loja) return false;
      if (f.canal && r.canal !== f.canal) return false;
      if (f.q) { var c = FC.clienteById(r.clienteId); var q = f.q.toLowerCase(); if ((r.codigo + " " + (c ? c.nome : "")).toLowerCase().indexOf(q) < 0) return false; }
      return true;
    }).sort(function (a, b) { return new Date(b.inicio) - new Date(a.inicio); });
    main.innerHTML = FC.head("Reservas e locações" + rf("RF79", "RF27", "RF92"), "Estados de reserva e de pagamento são controlados separadamente.", FC.pode("assistida") ? '<a class="btn btn--primary" href="#/admin/assistida">' + icon("plus", 16) + "Reserva assistida</a>" : "") +
      '<form class="box form-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px" id="rf">' +
      FC.fld("Buscar", '<input class="inp" id="rf-q" value="' + esc(f.q) + '" placeholder="Código ou cliente">') +
      FC.fld("Estado", '<select class="sel" id="rf-e"><option value="">Todos</option>' + Object.keys(FC.ESTADOS).map(function (k) { return '<option value="' + k + '"' + (f.estado === k ? " selected" : "") + ">" + FC.ESTADOS[k] + "</option>"; }).join("") + "</select>") +
      FC.fld("Loja de retirada", FC.selLojaEscopo("rf-l", f.loja)) +
      FC.fld("Canal", '<select class="sel" id="rf-c"><option value="">Todos</option>' + Object.keys(FC.CANAIS).map(function (k) { return '<option value="' + k + '"' + (f.canal === k ? " selected" : "") + ">" + FC.CANAIS[k] + "</option>"; }).join("") + "</select>") + "</form>" +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Código</th><th>Cliente</th><th>Veículo</th><th>Retirada</th><th>Devolução</th><th>Canal</th><th>Reserva</th><th>Pagamento</th><th class="num">Total</th></tr></thead><tbody>' +
      (lista.slice(0, 200).map(function (r) {
        var c = FC.clienteById(r.clienteId), v = FC.veiculoById(r.veiculoId);
        return '<tr><td><a class="link" href="#/admin/reserva/' + r.codigo + '"><strong>' + r.codigo + "</strong></a></td><td>" + esc(c ? c.nome : "—") + "</td><td>" + esc(v.modelo) + '<br><span class="small muted">' + v.id + "</span></td><td>" + esc(r.lojaRetirada) + "<br>" + FC.dtBR(r.inicio) + "</td><td>" + esc(r.lojaDevolucao) + "<br>" + FC.dtBR(r.fim) + "</td><td>" + (FC.CANAIS[r.canal] || r.canal) + "</td><td>" + FC.badgeEstado(r.estado) + "</td><td>" + (FC.PAGAMENTOS[r.pagamento] || r.pagamento) + '</td><td class="num">' + brl(r.preco.total) + "</td></tr>";
      }).join("") || '<tr><td colspan="9" class="empty">Nenhuma reserva para os filtros.</td></tr>') + "</tbody></table></div>";
    var form = $("#rf", main);
    form.addEventListener("change", function () { f.q = $("#rf-q", main).value; f.estado = $("#rf-e", main).value; f.loja = $("#rf-l", main).value; f.canal = $("#rf-c", main).value; FC.render(); });
    form.addEventListener("submit", function (e) { e.preventDefault(); f.q = $("#rf-q", main).value; FC.render(); });
  };

  /* Detalhe da reserva/locação */
  var detTab = "resumo";
  FC.adminPages.reserva = function (main, rt) {
    var r = FC.reservaByCodigo(rt.parts[2]);
    if (!r || (!FC.noEscopo(r.lojaRetirada) && !FC.noEscopo(r.lojaDevolucao))) { main.innerHTML = '<div class="note note--bad">Reserva não encontrada no seu escopo.' + rf("RNF32") + "</div>"; return; }
    var c = FC.clienteById(r.clienteId), v = FC.veiculoById(r.veiculoId);
    var TABS = [["resumo", "Resumo e eventos"], ["vistoria", "Retirada e devolução"], ["financeiro", "Financeiro"], ["ocorrencias", "Infrações e sinistros"]];
    main.innerHTML = '<p class="crumbs"><a href="#/admin/reservas">← Reservas</a></p>' + FC.head("Reserva " + esc(r.codigo) + " " + FC.badgeEstado(r.estado), esc(c ? c.nome : "") + " · " + esc(v.modelo) + " (" + v.id + ") · canal " + (FC.CANAIS[r.canal] || r.canal) + " · pagamento " + (FC.PAGAMENTOS[r.pagamento] || r.pagamento)) +
      '<div class="tabs" role="tablist">' + TABS.map(function (t) { return '<button type="button" role="tab" aria-selected="' + (t[0] === detTab) + '" data-dt="' + t[0] + '">' + t[1] + "</button>"; }).join("") + '</div><div id="dt-body"></div>';
    $$("[data-dt]", main).forEach(function (b) { b.addEventListener("click", function () { detTab = b.dataset.dt; FC.render(); }); });
    var body = $("#dt-body", main);
    ({ resumo: dtResumo, vistoria: dtVistoria, financeiro: dtFinanceiro, ocorrencias: dtOcorrencias })[detTab](body, r, c, v);
  };

  function dtResumo(body, r, c, v) {
    body.innerHTML = '<div class="grid-2"><div class="stack">' + FC.resumoReservaBox(r) +
      '<div class="box"><h3>Condutores' + rf("RF63", "RF77") + "</h3><p class=\"small\">" + (r.motorista ? "Motorista contratado: <strong>" + esc(FC.motoristaById(r.motorista).nome) + "</strong> (CNH " + FC.motoristaById(r.motorista).categoria + ")<br>" : "") +
      (r.condutorPrincipal ? "Condutor principal: " + esc(r.condutorPrincipal.nome || c.nome) + " · CNH " + esc(r.condutorPrincipal.categoria) + "<br>" : (!r.motorista && c && c.cnh ? "Condutor principal: " + esc(c.nome) + " · CNH " + esc(c.cnh.categoria) + " (" + esc(c.cnh.status) + ")<br>" : "")) +
      (r.condutores || []).map(function (x) { return "Adicional: " + esc(x.nome) + " · CNH " + esc(x.categoria); }).join("<br>") + "</p>" +
      (r.voo ? '<p class="small">Voo: ' + esc(r.voo.cia + " " + r.voo.numero) + rf("RF48") + "</p>" : "") +
      (r.aceite ? '<p class="small muted">Aceite dos termos ' + esc(r.aceite.versao) + " em " + FC.dtBR(r.aceite.data) + " por " + esc(r.aceite.autor) + rf("RF49") + "</p>" : "") +
      '<p class="small muted">Tarifa v' + r.tarifaVersao + " · parâmetros v" + r.configVersao + " preservados" + rf("RNF35") + "</p></div></div>" +
      '<div class="stack"><div class="box"><h3>Eventos' + rf("RF79", "RNF30") + '</h3><ul class="events">' + r.eventos.slice().reverse().map(function (e) { return "<li><time>" + FC.dtBR(e.data) + "</time><strong>" + esc(e.autor) + ":</strong> " + esc(e.evento) + "</li>"; }).join("") + "</ul></div>" +
      (r.estado === "aguardando_pagamento" || r.estado === "excecao" || r.pagamento === "pendente" ? '<div class="box" style="background:#fff8e6"><h3>Simulador do provedor de pagamento' + rf("RF84", "RF80", "RF81") + '</h3><p class="small muted">Envie eventos do “provedor” para testar aprovação, recusa, pendência, aprovação tardia e repetição do mesmo evento.</p><div class="row" style="margin-top:8px">' +
        ["aprovado", "recusado", "pendente", "aprovado_tardio"].map(function (x) { return '<button class="btn btn--ghost btn--sm" type="button" data-sim="' + x + '">' + { aprovado: "Aprovar", recusado: "Recusar", pendente: "Pendente", aprovado_tardio: "Aprovação tardia" }[x] + "</button>"; }).join("") + "</div></div>" : "") +
      (r.pagamento === "aprovado" ? '<div class="box"><h3>Teste de idempotência' + rf("RF80", "RNF34") + '</h3><p class="small muted">Reenvia o último evento de aprovação. Nada deve ser cobrado ou confirmado de novo.</p><button class="btn btn--ghost btn--sm" type="button" id="dt-dup" style="margin-top:8px">Reenviar evento de aprovação</button></div>' : "") +
      (r.estado === "confirmada" && FC.pode("reservas") ? '<div class="box"><h3>Ações</h3><div class="row"><button class="btn btn--ghost btn--sm" type="button" id="dt-link">Reenviar confirmação</button><button class="btn btn--danger btn--sm" type="button" id="dt-cancel">Cancelar pela empresa</button></div></div>' : "") +
      "</div></div>";
    $$("[data-sim]", body).forEach(function (b) { b.addEventListener("click", function () { var res = FC.processarPagamento(r.codigo, r.metodo || "credito", r.parcelas || 1, b.dataset.sim); FC.audit("Evento de pagamento simulado", r.codigo, b.dataset.sim, res.reserva.estado); FC.save(); FC.toast(res.msg); FC.render(); }); });
    var dup = $("#dt-dup", body);
    if (dup) dup.addEventListener("click", function () {
      var ultimo = (r.pagamentos || []).filter(function (p) { return p.resultado.indexOf("aprovado") === 0; }).slice(-1)[0];
      var res = FC.processarPagamento(r.codigo, r.metodo || "credito", 1, "aprovado", ultimo ? ultimo.idEvento : null);
      FC.toast(res.msg || "Evento ignorado.", "ok");
    });
    var lk = $("#dt-link", body);
    if (lk) lk.addEventListener("click", function () { FC.outbox(c.email, "e-mail", "confirmação (reenvio)", "Reserva " + r.codigo + " confirmada", "Reenvio da confirmação. Nenhuma nova reserva foi criada.", { ref: r.codigo }); FC.evento(r, "Confirmação reenviada ao cliente (sem duplicar reserva)"); FC.save(); FC.toast("Confirmação reenviada.", "ok"); FC.render(); });
    var cn = $("#dt-cancel", body);
    if (cn) cn.addEventListener("click", function () {
      var m = FC.modal("Cancelar pela empresa", '<p class="small">Cancelamento pela empresa devolve o valor integral. Registre o motivo.</p>' + FC.fld("Motivo", '<textarea class="txt" id="cx-m" autofocus></textarea>') + '<button class="btn btn--danger" type="button" id="cx-ok" style="margin-top:12px">Cancelar e reembolsar</button>');
      $("#cx-ok", m).addEventListener("click", function () {
        var mo = $("#cx-m", m).value.trim(); if (mo.length < 5) { FC.toast("Informe o motivo.", "bad"); return; }
        r.estado = "cancelada"; FC.liberarRecursos(r); FC.evento(r, "Cancelada pela empresa: " + mo);
        FC.reembolsar(r, r.preco.total, "Cancelamento pela empresa: " + mo);
        FC.outbox(c.email, "e-mail", "cancelamento", "Reserva " + r.codigo + " cancelada", "Lamentamos. Motivo: " + mo + ". Reembolso integral iniciado.", { ref: r.codigo });
        FC.audit("Cancelamento pela empresa", r.codigo, mo, "ok"); FC.save(); FC.closeModal(); FC.render();
      });
    });
  }

  function vistoriaForm(prefix, d) {
    d = d || {};
    return '<div class="form-grid">' + FC.fld("Data e hora", '<input class="inp" type="datetime-local" id="' + prefix + '-dt" value="' + (d.data ? FC.isoDate(d.data) + "T" + FC.horaBR(d.data) : FC.isoDate(new Date()) + "T" + FC.horaBR(new Date())) + '">') +
      FC.fld("Quilometragem", '<input class="inp" type="number" min="0" id="' + prefix + '-km" value="' + (d.km || "") + '">') +
      FC.fld("Combustível", '<select class="sel" id="' + prefix + '-fuel">' + ["Cheio", "3/4", "1/2", "1/4", "Reserva"].map(function (x) { return "<option" + (d.combustivel === x ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select>") +
      FC.fld("Fotos da vistoria", '<input class="inp" type="file" id="' + prefix + '-fotos" accept="image/*" multiple style="padding:8px">') +
      FC.fld("Vistoria e divergências", '<textarea class="txt" id="' + prefix + '-vis">' + esc(d.vistoria || "") + "</textarea>", null, "span-all") +
      '<label class="chk span-all"><input type="checkbox" id="' + prefix + '-ac"> Cliente conferiu e aceitou o registro da vistoria</label></div>';
  }
  function lerVistoria(body, prefix) {
    var fotos = $("#" + prefix + "-fotos", body).files;
    return { operador: FC.autorAtual(), data: new Date($("#" + prefix + "-dt", body).value).toISOString(), km: +$("#" + prefix + "-km", body).value, combustivel: $("#" + prefix + "-fuel", body).value, vistoria: $("#" + prefix + "-vis", body).value.trim(), fotos: Array.prototype.map.call(fotos, function (f) { return f.name; }), aceite: $("#" + prefix + "-ac", body).checked };
  }
  function dtVistoria(body, r, c, v) {
    var podeV = FC.pode("vistoria") || FC.adminAtual().perfil === "gestor";
    var h = '<div class="grid-2"><section class="box"><h3>Retirada' + rf("RF27") + "</h3>" + (r.checkin ? '<div class="note note--ok" style="margin-bottom:12px">' + icon("check", 16) + "<span>Check-in online em " + FC.dtBR(r.checkin.data) + " · token <strong>" + esc(r.checkin.token) + "</strong>. Confira documento e CNH no balcão.</span></div>" : "");
    if (r.retirada) h += '<p class="small">Por ' + esc(r.retirada.operador) + " em " + FC.dtBR(r.retirada.data) + "<br>Km " + r.retirada.km + " · combustível " + esc(r.retirada.combustivel) + "<br>Vistoria: " + esc(r.retirada.vistoria) + (r.retirada.fotos && r.retirada.fotos.length ? "<br>Fotos: " + esc(r.retirada.fotos.join(", ")) : "") + "<br>Aceite do cliente: " + (r.retirada.aceite ? "sim" : "não") + "</p>";
    else if (r.estado === "confirmada" && podeV) h += vistoriaForm("rt", { km: v.km }) + '<button class="btn btn--primary" type="button" id="rt-ok" style="margin-top:12px">Registrar retirada e iniciar locação</button>';
    else h += '<p class="small muted">' + (r.estado === "confirmada" ? "Somente operador de frota ou gestor registra a retirada." : "Disponível quando a reserva estiver confirmada.") + "</p>";
    h += '</section><section class="box"><h3>Devolução' + rf("RF27", "RF92") + "</h3>";
    if (r.devolucao) h += '<p class="small">Por ' + esc(r.devolucao.operador) + " em " + FC.dtBR(r.devolucao.data) + "<br>Km " + r.devolucao.km + " · combustível " + esc(r.devolucao.combustivel) + "<br>Vistoria: " + esc(r.devolucao.vistoria) + "<br>Aceite do cliente: " + (r.devolucao.aceite ? "sim" : "não") + "</p>";
    else if (r.estado === "em_andamento" && podeV) h += vistoriaForm("dv", { km: (r.retirada || {}).km }) + '<p class="small muted" style="margin-top:8px">A locação é encerrada mesmo que existam cobranças posteriores; elas ficam vinculadas como pendências financeiras.</p><button class="btn btn--primary" type="button" id="dv-ok" style="margin-top:12px">Registrar devolução e encerrar locação</button>';
    else h += '<p class="small muted">Disponível durante a locação.</p>';
    h += "</section></div>";
    body.innerHTML = h;
    var rt = $("#rt-ok", body);
    if (rt) rt.addEventListener("click", function () {
      var d = lerVistoria(body, "rt");
      if (!d.km) { FC.toast("Informe a quilometragem.", "bad"); return; }
      if (!d.aceite) { FC.toast("Registre o aceite do cliente na vistoria.", "bad"); return; }
      if (v.localAtual !== r.lojaRetirada) { FC.toast("A unidade ainda não está nesta loja (transferência pendente).", "bad"); return; }
      r.retirada = d; r.estado = "em_andamento"; v.km = d.km;
      FC.db.agenda.forEach(function (a) { if (a.ref === r.codigo && a.tipo === "reserva") a.tipo = "locacao"; });
      FC.evento(r, "Retirada registrada (km " + d.km + ", " + d.combustivel + ")"); FC.audit("Retirada registrada", r.codigo, "", "ok"); FC.save(); FC.toast("Locação iniciada.", "ok"); FC.render();
    });
    var dv = $("#dv-ok", body);
    if (dv) dv.addEventListener("click", function () {
      var d = lerVistoria(body, "dv");
      if (!d.km || d.km < (r.retirada || {}).km) { FC.toast("Quilometragem inválida (menor que a da retirada).", "bad"); return; }
      r.devolucao = d; r.estado = "encerrada"; v.km = d.km;
      if (r.lojaDevolucao !== v.localAtual) { FC.db.movimentos.push({ id: FC.uid("M"), veiculoId: v.id, data: d.data, de: v.localAtual, para: r.lojaDevolucao, motivo: "Devolução em outra loja (" + r.codigo + ")", autor: FC.autorAtual() }); v.localAtual = r.lojaDevolucao; }
      FC.db.agenda.forEach(function (a) { if (a.ref === r.codigo) a.fim = d.data; });
      FC.db.reservasAcessorios = FC.db.reservasAcessorios.filter(function (a) { return a.ref !== r.codigo; });
      // franquia de km (RF17)
      if (r.km) { var mod = FC.cfg().km.modalidades.filter(function (m) { return m.id === r.km; })[0]; var rodado = d.km - r.retirada.km; var lim = mod && mod.franquiaDia ? mod.franquiaDia * FC.duracao(r.inicio, r.fim).periodos : null; if (lim && rodado > lim) r.despesas.push({ descricao: "Quilometragem excedente (" + (rodado - lim) + " km)", valor: Math.round((rodado - lim) * mod.excedente * 100) / 100, evidencia: "Km retirada " + r.retirada.km + " / devolução " + d.km, status: "pendente", data: new Date().toISOString() }); }
      if (r.retirada.combustivel === "Cheio" && d.combustivel !== "Cheio") r.despesas.push({ descricao: "Reabastecimento (" + d.combustivel + " na devolução)", valor: 150, evidencia: "Vistoria de devolução", status: "pendente", data: new Date().toISOString() });
      if (new Date(d.data) > new Date(new Date(r.fim).getTime() + FC.cfg().toleranciaDevolucaoMin * 60000)) r.despesas.push({ descricao: "Devolução após a tolerância", valor: FC.diariaVeiculo(FC.tarifaVigente(), FC.veiculoById(r.veiculoId) || { grupo: r.grupo }), evidencia: "Previsto " + FC.dtBR(r.fim) + ", devolvido " + FC.dtBR(d.data), status: "pendente", data: new Date().toISOString() });
      FC.evento(r, "Devolução registrada e locação encerrada" + (r.despesas.length ? " (" + r.despesas.length + " despesa(s) pendente(s))" : ""));
      FC.outbox(c.email, "e-mail", "avaliação", "Como foi sua locação?", "Avalie a locação " + r.codigo + " em Minha conta (uma avaliação por locação).", { ref: r.codigo });
      FC.audit("Devolução registrada", r.codigo, "", "ok"); FC.save(); FC.toast("Locação encerrada.", "ok"); FC.render();
    });
  }

  function dtFinanceiro(body, r, c) {
    var pago = (r.pagamentos || []).filter(function (p) { return p.resultado.indexOf("aprovado") === 0; }).reduce(function (s, p) { return s + p.valor; }, 0);
    var reemb = (r.reembolsos || []).reduce(function (s, x) { return s + x.valor; }, 0);
    var desp = (r.despesas || []);
    body.innerHTML = '<div class="kpis"><div class="kpi"><b>' + brl(r.preco.total) + '</b><span>Valor original</span></div><div class="kpi"><b>' + brl(pago) + '</b><span>Pago</span></div><div class="kpi"><b>' + brl(reemb) + '</b><span>Reembolsado</span></div><div class="kpi"><b>' + brl(desp.reduce(function (s, d) { return s + (d.status === "cancelada" ? 0 : d.valor); }, 0)) + "</b><span>Despesas posteriores</span></div></div>" +
      '<div class="grid-2"><section class="box"><h3>Despesas posteriores' + rf("RF28", "RF88") + "</h3>" + (desp.length ? '<ul class="events">' + desp.map(function (d, i) {
        return "<li><strong>" + esc(d.descricao) + "</strong> — " + brl(d.valor) + " · " + esc(d.status) + '<br><span class="small">Evidência: ' + esc(d.evidencia || "—") + "</span>" + (d.contestacao ? '<br><span class="small">Contestação do cliente: ' + esc(d.contestacao.texto) + "</span>" : "") + (d.solucao ? '<br><span class="small">Solução: ' + esc(d.solucao) + "</span>" : "") +
          (d.status === "em contestação" && FC.pode("reservas") ? '<br><button class="btn btn--ghost btn--sm" type="button" data-sol="' + i + '|manter">Manter cobrança</button> <button class="btn btn--ghost btn--sm" type="button" data-sol="' + i + '|cancelar">Cancelar cobrança</button>' : "") + "</li>";
      }).join("") + "</ul>" : '<p class="small muted">Nenhuma.</p>') +
      (FC.pode("reservas") || FC.pode("vistoria") ? '<details style="margin-top:12px"><summary class="btn btn--ghost btn--sm">' + icon("plus", 14) + ' Lançar despesa</summary><div class="form-grid" style="margin-top:8px">' + FC.fld("Descrição", '<input class="inp" id="dp-d">') + FC.fld("Valor (R$)", '<input class="inp" type="number" step="0.01" min="0" id="dp-v">') + FC.fld("Evidência (obrigatória)", '<input class="inp" id="dp-e" placeholder="Foto, laudo, nota…">', null, "span-all") + '</div><button class="btn btn--primary btn--sm" type="button" id="dp-ok" style="margin-top:8px">Lançar e comunicar cliente</button></details>' : "") + "</section>" +
      '<section class="box"><h3>Pagamentos e reembolsos' + rf("RF82") + "</h3><ul class=\"events\">" + (r.pagamentos || []).map(function (p) { return "<li><time>" + FC.dtBR(p.data) + "</time>" + esc(p.metodo) + " · " + brl(p.valor) + " · " + esc(p.resultado) + ' <span class="small muted">(' + esc(p.idEvento) + ")</span></li>"; }).join("") + (r.reembolsos || []).map(function (x) { return "<li><time>" + FC.dtBR(x.data) + "</time>Reembolso " + brl(x.valor) + " · " + esc(x.motivo) + " · autorizado por " + esc(x.autorizadoPor) + "</li>"; }).join("") + "</ul>" +
      (FC.pode("reservas") && pago - reemb > 0 ? '<div class="form-grid" style="margin-top:12px">' + FC.fld("Valor do reembolso", '<input class="inp" type="number" step="0.01" min="0" max="' + (pago - reemb) + '" id="rb-v">', "Máximo: " + brl(pago - reemb) + ". Estornos duplicados são bloqueados.") + FC.fld("Motivo", '<input class="inp" id="rb-m">') + '</div><button class="btn btn--ghost btn--sm" type="button" id="rb-ok" style="margin-top:8px">Autorizar reembolso</button>' : "") + "</section>" +
      '<section class="box"><h3>Caução' + rf("RF30") + "</h3><p class=\"small\">" + (r.preco.caucao ? brl(r.preco.caucao) + " · " + esc(FC.cfg().caucao.modalidade) + "<br>Estado: <strong>" + esc(r.caucaoStatus || (r.estado === "encerrada" ? "liberada" : r.estado === "em_andamento" ? "pré-autorizada" : "a constituir na retirada")) + "</strong>" : "Não adotada para esta reserva.") + "</p>" +
      (r.preco.caucao && FC.pode("reservas") ? '<div class="row" style="margin-top:8px"><button class="btn btn--ghost btn--sm" type="button" data-cau="falha na pré-autorização">Registrar falha</button><button class="btn btn--ghost btn--sm" type="button" data-cau="retida parcialmente">Reter parcialmente</button><button class="btn btn--ghost btn--sm" type="button" data-cau="liberada">Liberar</button></div>' : "") + "</section></div>";
    $$("[data-sol]", body).forEach(function (b) { b.addEventListener("click", function () { var p = b.dataset.sol.split("|"); var d = r.despesas[+p[0]]; d.status = p[1] === "manter" ? "mantida após análise" : "cancelada"; d.solucao = (p[1] === "manter" ? "Cobrança mantida" : "Cobrança cancelada") + " por " + FC.autorAtual() + " em " + FC.dtBR(new Date()); FC.outbox(c.email, "e-mail", "despesa", "Contestação analisada", d.descricao + ": " + d.solucao, { ref: r.codigo }); FC.evento(r, "Contestação resolvida: " + d.solucao); FC.audit("Contestação resolvida", r.codigo, d.descricao, d.status); FC.save(); FC.render(); }); });
    var dp = $("#dp-ok", body);
    if (dp) dp.addEventListener("click", function () {
      var d = $("#dp-d", body).value.trim(), val = +$("#dp-v", body).value, e = $("#dp-e", body).value.trim();
      if (!d || !(val > 0) || !e) { FC.toast("Descrição, valor e evidência são obrigatórios.", "bad"); return; }
      r.despesas.push({ descricao: d, valor: val, evidencia: e, status: "pendente", data: new Date().toISOString(), prazoContestacao: new Date(Date.now() + 7 * 864e5).toISOString() });
      FC.outbox(c.email, "e-mail", "despesa", "Nova cobrança na locação " + r.codigo, d + " — " + brl(val) + ". Você pode contestar em Minha conta até " + FC.dataBR(Date.now() + 7 * 864e5) + ".", { ref: r.codigo });
      FC.evento(r, "Despesa lançada: " + d + " (" + brl(val) + ")"); FC.audit("Despesa lançada", r.codigo, d, brl(val)); FC.save(); FC.render();
    });
    var rb = $("#rb-ok", body);
    if (rb) rb.addEventListener("click", function () { var v = +$("#rb-v", body).value, m = $("#rb-m", body).value.trim(); if (!(v > 0) || !m) { FC.toast("Informe valor e motivo.", "bad"); return; } var x = FC.reembolsar(r, v, m); FC.save(); FC.toast(x ? "Reembolso de " + brl(x.valor) + " autorizado." : "Nada a reembolsar (evita estorno duplicado).", x ? "ok" : "bad"); FC.render(); });
    $$("[data-cau]", body).forEach(function (b) { b.addEventListener("click", function () { r.caucaoStatus = b.dataset.cau; FC.evento(r, "Caução: " + b.dataset.cau); FC.audit("Caução atualizada", r.codigo, b.dataset.cau, "ok"); FC.save(); FC.render(); }); });
  }

  function dtOcorrencias(body, r, c) {
    var condutores = [r.motorista ? FC.motoristaById(r.motorista).nome + " (motorista contratado)" : c.nome].concat((r.condutores || []).map(function (x) { return x.nome; }));
    body.innerHTML = '<div class="grid-2"><section class="box"><h3>Infrações' + rf("RF31") + "</h3>" + ((r.infracoes || []).length ? '<ul class="events">' + r.infracoes.map(function (i) { return "<li><strong>" + esc(i.descricao) + "</strong> · " + FC.dtBR(i.data) + "<br>Condutor responsável: " + esc(i.condutor) + " · evidência: " + esc(i.evidencia) + " · " + esc(i.status) + "</li>"; }).join("") + "</ul>" : '<p class="small muted">Nenhuma.</p>') +
      '<div class="form-grid" style="margin-top:12px">' + FC.fld("Descrição", '<input class="inp" id="in-d" placeholder="Ex.: excesso de velocidade">') + FC.fld("Data e hora", '<input class="inp" type="datetime-local" id="in-dt">') + FC.fld("Condutor no período", '<select class="sel" id="in-c">' + condutores.map(function (x) { return "<option>" + esc(x) + "</option>"; }).join("") + "</select>") + FC.fld("Evidência", '<input class="inp" id="in-e" placeholder="Nº do auto, foto…">') + '</div><button class="btn btn--ghost btn--sm" type="button" id="in-ok" style="margin-top:8px">Registrar e comunicar cliente</button></section>' +
      '<section class="box"><h3>Sinistros' + rf("RF32") + "</h3>" + ((r.sinistros || []).length ? '<ul class="events">' + r.sinistros.map(function (s) { return "<li><strong>" + esc(s.tipo) + "</strong> · " + FC.dtBR(s.data) + "<br>" + esc(s.descricao) + "<br>Documentos: " + esc(s.documentos || "—") + " · assistência: " + esc(s.assistencia || "—") + " · substituição: " + esc(s.substituicao || "não") + "</li>"; }).join("") + "</ul>" : '<p class="small muted">Nenhum.</p>') +
      '<div class="form-grid" style="margin-top:12px">' + FC.fld("Tipo", '<select class="sel" id="si-t"><option>Colisão</option><option>Roubo/furto</option><option>Pane</option><option>Outro</option></select>') + FC.fld("Data", '<input class="inp" type="datetime-local" id="si-dt">') + FC.fld("Descrição", '<textarea class="txt" id="si-d"></textarea>', null, "span-all") + FC.fld("Documentos (BO, fotos)", '<input class="inp" id="si-doc">') + FC.fld("Assistência acionada", '<input class="inp" id="si-as">') +
      '<label class="chk span-all"><input type="checkbox" id="si-ind"> Veículo fica indisponível (bloqueia agenda por 7 dias)</label></div><button class="btn btn--ghost btn--sm" type="button" id="si-ok" style="margin-top:8px">Registrar sinistro</button></section></div>';
    $("#in-ok", body).addEventListener("click", function () {
      var d = $("#in-d", body).value.trim(), dt = $("#in-dt", body).value;
      if (!d || !dt) { FC.toast("Descrição e data são obrigatórias.", "bad"); return; }
      var i = { descricao: d, data: new Date(dt).toISOString(), condutor: $("#in-c", body).value, evidencia: $("#in-e", body).value.trim() || "—", status: "comunicada ao cliente — prazo de contestação aberto" };
      r.infracoes = r.infracoes || []; r.infracoes.push(i);
      FC.outbox(c.email, "e-mail", "infração", "Infração registrada na locação " + r.codigo, d + " em " + FC.dtBR(i.data) + ". Condutor no período: " + i.condutor + ". Você pode contestar pelo atendimento.", { ref: r.codigo });
      FC.evento(r, "Infração registrada: " + d); FC.audit("Infração registrada", r.codigo, d, "ok"); FC.save(); FC.render();
    });
    $("#si-ok", body).addEventListener("click", function () {
      var dt = $("#si-dt", body).value, d = $("#si-d", body).value.trim();
      if (!dt || !d) { FC.toast("Data e descrição são obrigatórias.", "bad"); return; }
      var s = { tipo: $("#si-t", body).value, data: new Date(dt).toISOString(), descricao: d, documentos: $("#si-doc", body).value.trim(), assistencia: $("#si-as", body).value.trim(), substituicao: "a avaliar conforme política" };
      r.sinistros = r.sinistros || []; r.sinistros.push(s);
      if ($("#si-ind", body).checked) FC.db.agenda.push({ id: FC.uid("AG"), veiculoId: r.veiculoId, inicio: s.data, fim: new Date(new Date(s.data).getTime() + 7 * 864e5).toISOString(), tipo: "manutencao", ref: "SIN-" + r.codigo });
      FC.evento(r, "Sinistro registrado: " + s.tipo); FC.audit("Sinistro registrado", r.codigo, s.tipo, "ok"); FC.save(); FC.render();
    });
  }

  /* ---------- Reserva assistida (RF06, RF07) ---------- */
  var asst = null;
  FC.adminPages.assistida = function (main) {
    if (!asst) { var a = new Date(); a.setDate(a.getDate() + 2); var b = new Date(); b.setDate(b.getDate() + 4); asst = { canal: "telefone", clienteId: "", loja: FC.lojasEscopo()[0].id, dIni: FC.isoDate(a), hIni: "10:00", dFim: FC.isoDate(b), hFim: "10:00", tipo: "todos", veiculoId: null, motorista: null, protecoes: [], codigo: null }; }
    var s = asst;
    var lojas = FC.lojasEscopo();
    var h = FC.head("Nova reserva assistida" + rf("RF06", "RF07"), "Mesmas regras do site: elegibilidade, disponibilidade e pagamento antes da confirmação. O canal fica registrado.") +
      '<section class="box"><h3>1. Canal e cliente</h3><div class="form-grid form-grid--3">' +
      FC.fld("Canal", '<select class="sel" id="as-canal">' + [["telefone", "Telefone"], ["loja", "Presencial na loja"], ["whatsapp", "WhatsApp"]].map(function (x) { return '<option value="' + x[0] + '"' + (s.canal === x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select>") +
      FC.fld("Cliente cadastrado", '<select class="sel" id="as-cli"><option value="">Selecione</option>' + FC.db.clientes.map(function (c) { return '<option value="' + c.id + '"' + (s.clienteId === c.id ? " selected" : "") + ">" + esc(c.nome) + " — " + esc(FC.mascaraDoc(c.doc)) + (c.bloqueado ? " (em revisão)" : "") + "</option>"; }).join("") + "</select>", "Cliente novo? Cadastre pelo site junto com ele ou use a conta já existente.") +
      FC.fld("Loja de retirada", '<select class="sel" id="as-loja">' + lojas.map(function (l) { return '<option value="' + l.id + '"' + (s.loja === l.id ? " selected" : "") + ">" + esc(l.nome) + "</option>"; }).join("") + "</select>") + "</div></section>" +
      '<section class="box"><h3>2. Período</h3><div class="form-grid" style="grid-template-columns:repeat(5,1fr)">' +
      FC.fld("Retirada", '<input class="inp" type="date" id="as-di" value="' + s.dIni + '">') + FC.fld("Hora", '<select class="sel" id="as-hi">' + FC.slots(FC.lojaById(s.loja), s.dIni).map(function (x) { return "<option" + (x === s.hIni ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select>") +
      FC.fld("Devolução", '<input class="inp" type="date" id="as-df" value="' + s.dFim + '">') + FC.fld("Hora", '<select class="sel" id="as-hf">' + FC.slots(FC.lojaById(s.loja), s.dFim).map(function (x) { return "<option" + (x === s.hFim ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select>") +
      FC.fld("Tipo", '<select class="sel" id="as-tipo"><option value="todos">Todos</option><option value="carro"' + (s.tipo === "carro" ? " selected" : "") + '>Carros</option><option value="moto"' + (s.tipo === "moto" ? " selected" : "") + ">Motos</option></select>") + '</div><button class="btn btn--ghost btn--sm" type="button" id="as-busca" style="margin-top:12px">Buscar unidades</button><div id="as-unid" style="margin-top:12px"></div></section>' +
      '<div id="as-rest"></div>';
    main.innerHTML = h;
    function ler() { s.canal = $("#as-canal", main).value; s.clienteId = $("#as-cli", main).value; s.loja = $("#as-loja", main).value; s.dIni = $("#as-di", main).value; s.hIni = $("#as-hi", main).value; s.dFim = $("#as-df", main).value; s.hFim = $("#as-hf", main).value; s.tipo = $("#as-tipo", main).value; }
    ["#as-loja", "#as-di", "#as-df"].forEach(function (x) { $(x, main).addEventListener("change", function () { ler(); s.veiculoId = null; FC.render(); }); });
    ["#as-canal", "#as-cli", "#as-hi", "#as-hf", "#as-tipo"].forEach(function (x) { $(x, main).addEventListener("change", ler); });
    function unidades() {
      ler();
      var b = { loja: s.loja, dev: "", dIni: s.dIni, hIni: s.hIni, dFim: s.dFim, hFim: s.hFim };
      var erros = FC.validaBusca(b);
      if (erros.length) { $("#as-unid", main).innerHTML = '<div class="note note--bad">' + erros.map(function (x) { return esc(x.msg); }).join("<br>") + "</div>"; return; }
      var ini = FC.combina(s.dIni, s.hIni), fim = FC.combina(s.dFim, s.hFim);
      var lista = FC.unidadesDisponiveis(s.loja, ini, fim, { tipo: s.tipo });
      var t = FC.tarifaVigente(ini), n = FC.duracao(ini, fim).periodos;
      $("#as-unid", main).innerHTML = lista.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Unidade</th><th>Grupo</th><th>Local</th><th class="num">Locação</th></tr></thead><tbody>' + lista.map(function (x) { return '<tr><td><input type="radio" name="as-v" value="' + x.veiculo.id + '"' + (s.veiculoId === x.veiculo.id ? " checked" : "") + ' aria-label="Escolher ' + esc(x.veiculo.modelo) + '"></td><td>' + esc(x.veiculo.modelo) + " (" + x.veiculo.id + ")</td><td>" + esc(FC.grupoById(x.veiculo.grupo).nome) + "</td><td>" + (x.transf.necessaria ? "Transferir de " + esc(x.origem.nome) + " (" + x.transf.km.toFixed(1) + " km)" : "Na loja") + '</td><td class="num">' + brl(FC.diariaVeiculo(t, x.veiculo) * n) + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<div class="note note--warn">Nenhuma unidade disponível na cidade. Ofereça outra loja ou outras datas.' + rf("RF08", "RF93") + "</div>";
      $$('input[name="as-v"]', main).forEach(function (r) { r.addEventListener("change", function () { s.veiculoId = r.value; s.motorista = null; resto(); }); });
      if (s.veiculoId) resto();
    }
    function resto() {
      var c = FC.clienteById(s.clienteId), v = FC.veiculoById(s.veiculoId);
      var ini = FC.combina(s.dIni, s.hIni), fim = FC.combina(s.dFim, s.hFim);
      if (!v) return;
      var mots = FC.motoristasElegiveis(v, s.loja, ini, fim);
      var av = c && c.cnh ? FC.avaliaCondutor(c.cnh, v, fim, c.nome) : { ok: false, motivos: [(c ? c.nome : "Cliente") + ": sem CNH cadastrada."] };
      var sel = { veiculoId: v.id, lojaRetirada: s.loja, lojaDevolucao: s.loja, inicio: ini.toISOString(), fim: fim.toISOString(), motorista: s.motorista, protecoes: s.protecoes, acessorios: [], km: FC.cfg().km.definida ? "LIVRE" : null };
      var orig = FC.lojaById(v.localAtual), t = FC.avaliaTransferencia(orig, FC.lojaById(s.loja), ini);
      sel.transferencia = t.necessaria ? { necessaria: true, origem: orig.id, km: t.km, chegadaPrevista: t.chegadaPrevista.toISOString() } : null;
      var preco = FC.calcularPreco(sel, { clienteId: s.clienteId });
      $("#as-rest", main).innerHTML = '<section class="box"><h3>3. Condutor' + rf("RF21", "RF04") + "</h3>" + (c ? (av.ok ? '<div class="note note--ok">' + esc(c.nome) + " está habilitado(a) para este veículo.</div>" : '<div class="note note--bad">' + av.motivos.map(esc).join("<br>") + "</div>") : '<p class="small muted">Selecione o cliente.</p>') +
        '<label class="chk" style="margin-top:12px"><input type="checkbox" id="as-mot"' + (s.motorista ? " checked" : "") + (mots.length ? "" : " disabled") + "> Contratar motorista (" + mots.length + " elegível(is))</label>" + (s.motorista || (mots.length && $("#as-mot") && $("#as-mot").checked) ? '<select class="sel" id="as-mot-sel" style="margin-top:8px">' + mots.map(function (m) { return '<option value="' + m.id + '"' + (s.motorista === m.id ? " selected" : "") + ">" + esc(m.nome) + " (CNH " + m.categoria + ")</option>"; }).join("") + "</select>" : "") + "</section>" +
        '<section class="box"><h3>4. Proteções (só se o cliente pedir)' + rf("RF41", "RNF20") + "</h3>" + FC.db.protecoes.map(function (p) { return '<label class="chk"><input type="checkbox" class="as-p" value="' + p.id + '"' + (s.protecoes.indexOf(p.id) >= 0 ? " checked" : "") + "> " + esc(p.nome) + " — " + brl(p.diaria) + "/dia</label>"; }).join("") + "</section>" +
        '<section class="box"><h3>5. Revisão e aceite' + rf("RF43", "RF49") + "</h3>" + FC.priceBox(preco) + '<p class="small" style="margin-top:12px"><strong>Instruções da loja:</strong> ' + esc(FC.lojaById(s.loja).instrucoes) + "</p>" +
        '<label class="chk" style="margin-top:12px"><input type="checkbox" id="as-ac"> Li ao cliente os termos (' + esc(FC.db.termosVersao) + "), o preço total e a política de cancelamento, e ele aceitou expressamente.</label>" +
        '<div class="row" style="margin-top:16px"><button class="btn btn--primary" type="button" id="as-criar">Criar reserva pendente</button></div><div id="as-out"></div></section>';
      var cm = $("#as-mot", main);
      if (cm) cm.addEventListener("change", function () { s.motorista = cm.checked && mots[0] ? mots[0].id : null; resto(); });
      var ms = $("#as-mot-sel", main); if (ms) ms.addEventListener("change", function () { s.motorista = ms.value; resto(); });
      $$(".as-p", main).forEach(function (x) { x.addEventListener("change", function () { s.protecoes = $$(".as-p:checked", main).map(function (y) { return y.value; }); resto(); }); });
      $("#as-criar", main).addEventListener("click", function () {
        var erros = [];
        if (!c) erros.push("Selecione o cliente.");
        else if (c.bloqueado) erros.push("Cadastro do cliente em revisão (" + c.bloqueado.motivo + ").");
        if (!s.motorista && !av.ok) erros.push("Condutor não elegível. Contrate um motorista ou escolha outro veículo.");
        if (!$("#as-ac", main).checked) erros.push("Registre o aceite expresso do cliente.");
        if (erros.length) { $("#as-out", main).innerHTML = '<div class="note note--bad" style="margin-top:12px">' + erros.map(esc).join("<br>") + "</div>"; return; }
        sel.motorista = s.motorista;
        sel.condutorPrincipal = s.motorista ? null : c.cnh;
        sel.aceite = { versao: FC.db.termosVersao, data: new Date().toISOString(), autor: c.nome + " (aceite registrado por " + FC.autorAtual() + ", canal " + s.canal + ")" };
        var res = FC.criarReservaPendente(sel, c.id, s.canal, FC.autorAtual());
        if (res.erro) { $("#as-out", main).innerHTML = '<div class="note note--bad">' + esc(res.erro) + "</div>"; return; }
        s.codigo = res.reserva.codigo; FC.save(); pagamento();
      });
      if (s.codigo) pagamento();
    }
    function pagamento() {
      var r = FC.reservaByCodigo(s.codigo); var c = FC.clienteById(r.clienteId);
      $("#as-out", main).innerHTML = '<div class="box" style="margin-top:16px"><h3>6. Pagamento antes da confirmação' + rf("RF45", "RF06") + '</h3><p>Reserva <strong>' + r.codigo + "</strong> criada — " + FC.badgeEstado(r.estado) + ". A unidade fica bloqueada até " + (r.bloqueioExpira ? FC.horaBR(r.bloqueioExpira) : "—") + ".</p>" +
        '<div class="row" style="margin-top:12px"><button class="btn btn--primary" type="button" id="as-link">Enviar link de pagamento ao cliente</button>' + (s.canal === "loja" ? '<button class="btn btn--ghost" type="button" id="as-balcao">Pagamento no balcão (maquininha simulada)</button>' : "") + '<a class="btn btn--ghost" href="#/admin/reserva/' + r.codigo + '">Abrir reserva</a><button class="btn btn--link" type="button" id="as-nova">Nova reserva assistida</button></div>' +
        '<p class="small muted" style="margin-top:8px">A reserva só é confirmada quando o pagamento for aprovado. Não aceite pagamento na retirada.</p></div>';
      $("#as-link", main).addEventListener("click", function () { FC.outbox(c.email, "e-mail", "link de pagamento", "Pague sua reserva " + r.codigo, "Acesse Falls Car > Minha conta > Reservas > " + r.codigo + " > Concluir pagamento (link #/pagar/" + r.codigo + "). Válido até " + FC.horaBR(r.bloqueioExpira) + ".", { ref: r.codigo }); FC.evento(r, "Link de pagamento enviado ao cliente"); FC.save(); FC.toast("Link enviado (caixa de saída simulada).", "ok"); });
      var bal = $("#as-balcao", main);
      if (bal) bal.addEventListener("click", function () { var res = FC.processarPagamento(r.codigo, "credito", 1, "aprovado"); FC.toast(res.msg, "ok"); pagamento(); });
      $("#as-nova", main).addEventListener("click", function () { asst = null; FC.render(); });
    }
    $("#as-busca", main).addEventListener("click", unidades);
    if (s.veiculoId) unidades();
  };
})();
