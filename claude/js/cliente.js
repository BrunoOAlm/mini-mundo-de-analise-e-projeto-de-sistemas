/* Falls Car — cliente: início, busca, veículos, reserva e pagamento */
(function () {
  "use strict";
  var FC = window.FC, $ = FC.$, $$ = FC.$$, esc = FC.esc, icon = FC.icon, rf = FC.rf, brl = FC.brl;

  /* ---------- Estado da busca ---------- */
  function defaultBusca() {
    var a = new Date(); a.setDate(a.getDate() + 3);
    var b = new Date(); b.setDate(b.getDate() + 6);
    return { loja: "SPPAU", dev: "", dIni: FC.isoDate(a), hIni: "10:00", dFim: FC.isoDate(b), hFim: "10:00", tipo: "todos" };
  }
  var salvo = FC.estadoSalvo || {};
  FC.busca = salvo.busca || FC.busca || defaultBusca();
  FC.ponto = salvo.ponto || FC.ponto || null; // localização do cliente (RF09)

  FC.validaBusca = function (b) {
    var erros = [];
    var lr = FC.lojaById(b.loja);
    if (!lr) erros.push({ campo: "loja", msg: "Escolha a loja de retirada." });
    if (!b.dIni) erros.push({ campo: "dIni", msg: "Informe a data de retirada." });
    if (!b.dFim) erros.push({ campo: "dFim", msg: "Informe a data de devolução." });
    if (erros.length) return erros;
    var ini = FC.combina(b.dIni, b.hIni), fim = FC.combina(b.dFim, b.hFim);
    if (ini < new Date()) erros.push({ campo: "dIni", msg: "A retirada não pode estar no passado." });
    else if (ini < new Date(Date.now() + FC.cfg().antecedenciaMin * 60000)) erros.push({ campo: "hIni", msg: "A retirada precisa de pelo menos " + FC.cfg().antecedenciaMin + " min de antecedência (parâmetro de demonstração, PM02)." });
    if (fim <= ini) erros.push({ campo: "dFim", msg: "A devolução precisa ser depois da retirada." });
    else if (b.plano && fim - ini < 7 * 864e5) erros.push({ campo: "dFim", msg: "Plano para motoristas de app: mínimo de 7 dias." });
    var vh = FC.validaHorario(lr, ini);
    if (!vh.ok) erros.push({ campo: "hIni", msg: vh.msg + " Alternativas: " + FC.alternativasHorario(lr, ini).join("; ") + "." });
    var ld = b.dev ? FC.lojaById(b.dev) : lr;
    if (b.dev && b.dev !== b.loja && !FC.cfg().devolucaoOutraLoja.habilitada) erros.push({ campo: "dev", msg: "Devolução em outra loja ainda não está liberada pela política (PM03)." });
    var vd = FC.validaHorario(ld, fim);
    if (!vd.ok) erros.push({ campo: "hFim", msg: vd.msg + " Alternativas: " + FC.alternativasHorario(ld, fim).join("; ") + "." });
    return erros;
  };

  function slotOptions(lojaId, data, sel) {
    var l = FC.lojaById(lojaId);
    var s = l && data ? FC.slots(l, data) : [];
    if (!s.length) return '<option value="">Fechada</option>';
    if (s.indexOf(sel) < 0) sel = s.indexOf("10:00") >= 0 ? "10:00" : s[0];
    return s.map(function (h) { return "<option" + (h === sel ? " selected" : "") + ">" + h + "</option>"; }).join("");
  }

  FC.slotOptions = slotOptions;

  /* ---------- Formulário de busca (hero) ---------- */
  FC.searchForm = function (b, head) {
    var cfg = FC.cfg();
    var hoje = FC.isoDate(new Date());
    return '<div class="search-card">' + (head || "") +
      '<div class="seg" role="radiogroup" aria-label="Tipo de veículo">' + [["todos", "Todos"], ["carro", "Carros"], ["moto", "Motos"]].map(function (t) {
        return '<label class="seg__opt"><input type="radio" name="b-tipo" value="' + t[0] + '"' + (b.tipo === t[0] ? " checked" : "") + "><span>" + t[1] + "</span></label>";
      }).join("") + "</div>" +
      '<form class="search" id="busca-form" novalidate autocomplete="off">' +
      '<div class="search__fields">' +
      '<label class="field field--location" style="cursor:default"><span class="field__label">Loja de retirada' + rf("RF12", "RF09") + '</span><select id="b-loja" aria-label="Loja de retirada">' + FC.lojaOptions(b.loja) + '<optgroup label="Outras opções"><option value="__cidade">Informar cidade manualmente</option></optgroup></select>' +
      '<button type="button" class="field__icon" id="b-geo" aria-label="Usar minha localização" title="Usar minha localização">' + icon("pin", 18) + "</button></label>" +
      '<label class="field"><span class="field__label">Data de retirada</span><input type="date" id="b-dIni" min="' + hoje + '" value="' + b.dIni + '" required></label>' +
      '<label class="field"><span class="field__label">Hora' + rf("RF36") + '</span><select id="b-hIni" aria-label="Hora de retirada">' + slotOptions(b.loja, b.dIni, b.hIni) + "</select></label>" +
      '<label class="field"><span class="field__label">Data de devolução</span><input type="date" id="b-dFim" min="' + hoje + '" value="' + b.dFim + '" required></label>' +
      '<label class="field"><span class="field__label">Hora</span><select id="b-hFim" aria-label="Hora de devolução">' + slotOptions(b.dev || b.loja, b.dFim, b.hFim) + "</select></label>" +
      '</div><button class="btn btn--primary search__submit" type="submit">Buscar</button></form>' +
      '<div class="search__options">' +
      (cfg.devolucaoOutraLoja.habilitada ? '<label class="checkbox"><input type="checkbox" id="b-outra"' + (b.dev && b.dev !== b.loja ? " checked" : "") + "><span>Devolver em outra loja" + rf("RF13") + "</span></label>" : '<span class="small muted">Devolução em outra loja indisponível até aprovação da política (PM03).</span>') +
      '<span id="b-dev-wrap"' + (b.dev && b.dev !== b.loja ? "" : " hidden") + ' class="age-select"><select id="b-dev" aria-label="Loja de devolução">' + FC.lojaOptions(b.dev || b.loja) + '</select><span class="small" id="b-dev-taxa"></span></span>' +
      '<span class="small search__hours" id="b-loja-hint" aria-live="polite"></span>' +
      "</div>" +
      '<div class="hero-errors" id="busca-erros" role="alert" hidden></div></div>';
  };
  FC.bindSearchForm = function (root, onSubmit) {
    var b = FC.busca;
    function sync() {
      b.loja = $("#b-loja", root).value; b.dIni = $("#b-dIni", root).value; b.hIni = $("#b-hIni", root).value;
      b.dFim = $("#b-dFim", root).value; b.hFim = $("#b-hFim", root).value;
      var t = $('input[name="b-tipo"]:checked', root); b.tipo = t ? t.value : "todos";
      var outra = $("#b-outra", root);
      b.dev = outra && outra.checked ? $("#b-dev", root).value : "";
    }
    function refreshSlots() {
      sync();
      $("#b-hIni", root).innerHTML = slotOptions(b.loja, b.dIni, b.hIni);
      $("#b-hFim", root).innerHTML = slotOptions(b.dev || b.loja, b.dFim, b.hFim);
      sync();
      var l = FC.lojaById(b.loja);
      $("#b-loja-hint", root).textContent = l && b.lojaEscolhida ? "Horário: " + FC.horarioTexto(l) : "";
      var taxa = $("#b-dev-taxa", root);
      if (taxa) {
        if (b.dev && b.dev !== b.loja) {
          var d = FC.distKm(FC.lojaById(b.loja), FC.lojaById(b.dev)); var c = FC.cfg().devolucaoOutraLoja;
          taxa.textContent = "Taxa estimada: " + brl(c.base + d * c.porKm) + " (" + d.toFixed(0) + " km em linha reta)";
        } else taxa.textContent = "";
      }
    }
    var lojaEl = $("#b-loja", root), lojaAnt = lojaEl.value;
    // roda antes de refreshSlots: a opção "__cidade" abre o modal e não vira loja
    lojaEl.addEventListener("change", function () {
      if (lojaEl.value === "__cidade") { lojaEl.value = lojaAnt; FC.escolherCidade(function () { FC.render(); }); return; }
      lojaAnt = lojaEl.value; b.lojaEscolhida = true;
    });
    ["#b-loja", "#b-dIni", "#b-dFim", "#b-dev"].forEach(function (s) { var el = $(s, root); if (el) el.addEventListener("change", refreshSlots); });
    ["#b-hIni", "#b-hFim"].forEach(function (s) { $(s, root).addEventListener("change", sync); });
    $$('input[name="b-tipo"]', root).forEach(function (r) { r.addEventListener("change", sync); });
    var outra = $("#b-outra", root);
    if (outra) outra.addEventListener("change", function () { $("#b-dev-wrap", root).hidden = !outra.checked; refreshSlots(); });
    $("#b-geo", root).addEventListener("click", function () { FC.pedirLocalizacao(function () { FC.render(); }); });
    refreshSlots();
    $("#busca-form", root).addEventListener("submit", function (e) {
      e.preventDefault(); sync();
      var erros = FC.validaBusca(b);
      var box = $("#busca-erros", root);
      $$(".field.is-invalid", root).forEach(function (f) { f.classList.remove("is-invalid"); });
      if (erros.length) {
        box.hidden = false;
        box.innerHTML = "<strong>Corrija os campos abaixo:</strong>" + rf("RF35", "RF14", "RF34") + "<ul>" + erros.map(function (x) { return "<li>" + esc(x.msg) + "</li>"; }).join("") + "</ul>";
        erros.forEach(function (x) { var el = $("#b-" + x.campo, root); if (el) el.closest(".field, .age-select").classList.add("is-invalid"); });
        var first = $("#b-" + erros[0].campo, root); if (first) first.focus();
        return;
      }
      box.hidden = true;
      onSubmit ? onSubmit(b) : FC.go("#/veiculos");
    });
  };

  /* ---------- Localização (RF09, RF54, RNF37) ---------- */
  FC.pedirLocalizacao = function (cb) {
    if (!navigator.geolocation) { FC.toast("Localização indisponível neste navegador. Informe sua cidade.", "bad"); FC.escolherCidade(cb); return; }
    navigator.geolocation.getCurrentPosition(function (p) {
      FC.ponto = { lat: p.coords.latitude, lon: p.coords.longitude, nome: "sua localização" };
      FC.recomendarLoja(); cb && cb();
    }, function () {
      FC.toast("Não foi possível obter sua localização. Escolha a cidade manualmente.", "bad");
      FC.escolherCidade(cb);
    }, { timeout: 8000 });
  };
  FC.escolherCidade = function (cb) {
    var b = FC.modal("Informar localização manualmente", '<p class="small muted">Usamos a distância em linha reta até cada loja, que pode diferir do tempo real de estrada.' + rf("RF09", "RNF37") + "</p>" +
      '<div class="stack" style="margin-top:12px">' + FC.fld("Cidade", '<select class="sel" id="mc-cidade" autofocus>' + FC.cidades.map(function (c, i) { return '<option value="' + i + '">' + c.nome + "</option>"; }).join("") + "</select>") +
      '<details><summary class="small">Ou informe coordenadas</summary><div class="form-grid" style="margin-top:8px">' + FC.fld("Latitude", '<input class="inp" id="mc-lat" inputmode="decimal" placeholder="-23.55">') + FC.fld("Longitude", '<input class="inp" id="mc-lon" inputmode="decimal" placeholder="-46.63">') + "</div></details>" +
      '<button class="btn btn--primary" type="button" id="mc-ok">Usar esta localização</button></div>');
    $("#mc-ok", b).addEventListener("click", function () {
      var lat = parseFloat(($("#mc-lat", b).value || "").replace(",", ".")), lon = parseFloat(($("#mc-lon", b).value || "").replace(",", "."));
      if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) FC.ponto = { lat: lat, lon: lon, nome: "coordenadas informadas" };
      else { var c = FC.cidades[+$("#mc-cidade", b).value]; FC.ponto = { lat: c.lat, lon: c.lon, nome: c.nome }; }
      FC.closeModal(); FC.recomendarLoja(); cb && cb();
    });
  };
  FC.recomendarLoja = function () {
    if (!FC.ponto) return;
    var lista = FC.lojasPorDistancia(FC.ponto);
    FC.busca.loja = lista[0].loja.id; FC.busca.lojaEscolhida = true;
    FC.toast("Loja mais próxima (linha reta): " + lista[0].loja.nome + " — " + lista[0].km.toFixed(1) + " km.");
  };

  /* ---------- Resultados: unidades disponíveis (RF15, RF08, RF38, RF39) ---------- */
  FC.filtros = Object.assign({ grupo: "todos", cambio: "todos", acess: [], ordem: "recomendado", soCompat: true }, (FC.estadoSalvo && FC.estadoSalvo.filtros) || {});
  FC.route("veiculos", function (view) {
    var b = FC.busca;
    var plano = b.plano ? FC.planoApp(b.plano) : null;
    var planoNota = plano ? '<div class="note" style="margin-top:16px">' + icon("car", 16) + "<span><strong>Plano " + esc(plano.nome) + "</strong> · " + brl(plano.semana) + "/semana · cobrança semanal antecipada · exige CNH com EAR. " + '<button type="button" class="btn btn--link small" data-sair-plano>Sair do plano</button></span></div>' : "";
    var erros = FC.validaBusca(b);
    var lr = FC.lojaById(b.loja);
    var ini = FC.combina(b.dIni, b.hIni), fim = FC.combina(b.dFim, b.hFim);
    var f = FC.filtros;
    var cli = FC.clienteAtual();
    var tarifa = FC.tarifaVigente(ini);
    var head = '<section class="hero" style="padding-bottom:24px"><div class="container"><h1 class="t-h2" style="color:#fff;margin-bottom:16px">Veículos disponíveis</h1>' + FC.searchForm(b) + planoNota + "</div></section>";
    if (erros.length) {
      view.innerHTML = head + '<div class="container page"><div class="note note--bad">' + icon("alert", 16) + "<span>" + erros.map(function (x) { return esc(x.msg); }).join("<br>") + "</span></div></div>";
      FC.bindSearchForm(view, function () { FC.render(); });
      var sp = $("[data-sair-plano]", view); if (sp) sp.addEventListener("click", function () { FC.busca.plano = null; FC.render(); });
      return;
    }
    // carros já alugados por outras pessoas (servidor) saem da lista; busca o período uma vez e redesenha
    if (FC._ocupChave !== new Date(ini).toISOString() + "|" + new Date(fim).toISOString()) {
      view.innerHTML = head + '<div class="container page"><p class="muted" role="status">Conferindo a disponibilidade…</p></div>';
      FC.ocupacaoServidor(ini, fim).then(function () { FC.render(); });
      return;
    }
    var lista = FC.unidadesDisponiveis(b.loja, ini, fim, { tipo: b.tipo, grupo: f.grupo, cambio: f.cambio, acess: f.acess });
    if (plano) lista = lista.filter(function (x) { return plano.grupos.indexOf(x.veiculo.grupo) >= 0; });
    var restr = cli && cli.cnh ? cli.cnh.restricoes || [] : [];
    if (f.soCompat && restr.length) {
      lista = lista.filter(function (x) { return FC.avaliaCondutor(cli.cnh, x.veiculo, fim).motivos.filter(function (m) { return m.indexOf("restrição") >= 0; }).length === 0; });
    }
    var dur = FC.duracao(ini, fim);
    var semanas = plano ? Math.max(1, Math.ceil(dur.horas / 168)) : 0;
    lista.forEach(function (x) { x.diaria = FC.diariaVeiculo(tarifa, x.veiculo); x.total = plano ? plano.semana * semanas : x.diaria * dur.periodos; });
    // recomendação: unidade já na loja e menor preço (critério explicado — RF38)
    var naLoja = lista.filter(function (x) { return !x.transf.necessaria; }).sort(function (a, b2) { return a.total - b2.total; });
    var recId = naLoja.length ? naLoja[0].veiculo.id : (lista.slice().sort(function (a, b2) { return a.transf.km - b2.transf.km; })[0] || {}).veiculo;
    if (recId && recId.id) recId = recId.id;
    if (f.ordem === "preco") lista.sort(function (a, b2) { return a.total - b2.total; });
    else if (f.ordem === "preco-desc") lista.sort(function (a, b2) { return b2.total - a.total; });
    else lista.sort(function (a, b2) { return (a.veiculo.id === recId ? -1 : b2.veiculo.id === recId ? 1 : 0) || (a.transf.necessaria - b2.transf.necessaria) || a.total - b2.total; });

    var ACESS = ["Câmbio automático", "Comandos manuais de freio e acelerador", "Pomo giratório no volante", "Assento giratório", "Rampa para cadeira de rodas"];
    var filtrosHtml = '<aside class="box filters" aria-label="Filtros">' +
      '<h3>Filtrar unidades</h3>' +
      FC.fld("Grupo", '<select class="sel" id="f-grupo"><option value="todos">Todos</option>' + FC.db.grupos.filter(function (g) { return b.tipo === "todos" || g.tipo === b.tipo; }).map(function (g) { return '<option value="' + g.id + '"' + (f.grupo === g.id ? " selected" : "") + ">" + esc(g.nome) + "</option>"; }).join("") + "</select>") +
      FC.fld("Câmbio", '<select class="sel" id="f-cambio">' + ["todos", "Automático", "Manual"].map(function (c) { return '<option value="' + c + '"' + (f.cambio === c ? " selected" : "") + ">" + (c === "todos" ? "Todos" : c) + "</option>"; }).join("") + "</select>") +
      '<fieldset class="fld"><legend>Acessibilidade e adaptações' + rf("RF39") + "</legend>" + ACESS.map(function (a) { return '<label class="chk"><input type="checkbox" class="f-acess" value="' + esc(a) + '"' + (f.acess.indexOf(a) >= 0 ? " checked" : "") + ">" + esc(a) + "</label>"; }).join("") +
      '<small>Filtre pelas adaptações que você usa. Ter uma deficiência não significa precisar de adaptação — escolha só o que se aplica a você.</small></fieldset>' +
      (restr.length ? '<label class="chk"><input type="checkbox" id="f-compat"' + (f.soCompat ? " checked" : "") + ">Mostrar só veículos compatíveis com as restrições da minha CNH (" + esc(restr.join(", ")) + ")</label>" : "") +
      FC.fld("Ordenar por", '<select class="sel" id="f-ordem"><option value="recomendado"' + (f.ordem === "recomendado" ? " selected" : "") + '>Recomendado</option><option value="preco"' + (f.ordem === "preco" ? " selected" : "") + '>Menor preço</option><option value="preco-desc"' + (f.ordem === "preco-desc" ? " selected" : "") + ">Maior preço</option></select>") +
      "</aside>";

    var cards = lista.map(function (x) {
      var v = x.veiculo, g = FC.grupoById(v.grupo);
      var rec = v.id === recId;
      return '<article class="veh' + (rec ? " veh--rec" : "") + '">' + FC.vehImg(v) +
        "<div>" + (rec ? '<span class="flag">' + icon("check", 12) + 'Recomendado</span> <button type="button" class="btn btn--link small" data-why>Por quê?</button> ' : "") +
        '<h2 class="veh__name" style="margin-top:6px">' + esc(v.modelo) + ' <span class="small muted">' + v.ano + " · " + esc(v.cor) + "</span></h2>" +
        '<p class="small muted">Grupo ' + esc(g.nome) + " · Unidade " + v.id + " · Placa final " + v.placa.slice(-2) + rf("RF15") + "</p>" +
        '<div class="veh__meta">' + FC.badgesVeiculo(v) + "</div>" +
        '<p class="small" style="margin-top:10px">' + (x.transf.necessaria
          ? icon("truck", 14) + " Está em <strong>" + esc(x.origem.nome) + "</strong> (" + x.transf.km.toFixed(1) + " km em linha reta). Transferência prevista para chegar até " + FC.dtBR(x.transf.chegadaPrevista) + ", antes da sua retirada." + rf("RF08", "RF94")
          : icon("check", 14) + " Já está na loja de retirada.") + "</p></div>" +
        '<div class="veh__side"><div><div class="small muted">' + (plano ? brl(plano.semana) + " por semana" : brl(x.diaria) + " por diária") + "</div><div class=\"veh__price\">" + brl(x.total) + '</div><div class="small muted">' + (plano ? semanas + (semanas > 1 ? " semanas" : " semana") : dur.periodos + (dur.periodos > 1 ? " diárias" : " diária")) + ", sem extras</div></div>" +
        '<button class="btn btn--primary" type="button" data-pick="' + v.id + '">Escolher esta unidade</button></div></article>';
    }).join("");

    var vazio = "";
    if (!lista.length) {
      var alternativas = FC.lojasPorDistancia(lr).filter(function (x) { return x.loja.id !== lr.id; }).map(function (x) {
        var okH = FC.validaHorario(x.loja, ini).ok && FC.validaHorario(x.loja, fim).ok;
        return okH ? { loja: x.loja, km: x.km, n: FC.unidadesDisponiveis(x.loja.id, ini, fim, { tipo: b.tipo }).length } : null;
      }).filter(function (x) { return x && x.n > 0; }).slice(0, 3);
      vazio = '<div class="box"><h3>Nenhuma unidade disponível em ' + esc(lr.nome) + " para esse período" + rf("RF09", "RF93") + "</h3>" +
        "<p>Nem a própria loja nem outra loja da mesma cidade conseguem atender a tempo com os filtros atuais.</p>" +
        (alternativas.length ? '<p style="margin-top:12px"><strong>Próximas lojas viáveis (distância em linha reta):</strong></p><ul class="stack" style="list-style:none;margin-top:8px">' + alternativas.map(function (a) {
          return '<li class="store"><strong>' + esc(a.loja.nome) + "</strong><br><span class=\"small\">" + esc(a.loja.endereco) + " · " + a.km.toFixed(1) + " km · " + a.n + " unidade(s)</span><br><button class=\"btn btn--primary btn--sm\" style=\"margin-top:8px\" type=\"button\" data-alt=\"" + a.loja.id + "\">Aceitar e buscar nesta loja</button></li>";
        }).join("") + "</ul>" : '<p class="small muted">Tente outras datas ou remova filtros.</p>') + "</div>";
    }

    view.innerHTML = head + '<div class="container page"><div class="page-head"><div><h2 class="t-h3">' + lista.length + " unidade(s) para retirar em " + esc(lr.nome) + "</h2><p>" + FC.dtBR(ini) + " → " + FC.dtBR(fim) + " · " + dur.periodos + " período(s) de " + FC.cfg().periodoCobrancaHoras + " h" + rf("RF10") + "</p></div></div>" +
      '<div class="layout-side" style="grid-template-columns:280px minmax(0,1fr)">' + filtrosHtml + '<div class="veh-list">' + (cards || vazio) +
      '<p class="small muted">Preços de referência sem proteções, acessórios ou taxas. O total final é calculado e discriminado antes do pagamento.' + rf("RF55", "RF16") + "</p></div></div></div>";

    FC.bindSearchForm(view, function () { FC.render(); });
    $("#f-grupo", view).addEventListener("change", function () { f.grupo = this.value; FC.render(); });
    $("#f-cambio", view).addEventListener("change", function () { f.cambio = this.value; FC.render(); });
    $("#f-ordem", view).addEventListener("change", function () { f.ordem = this.value; FC.render(); });
    var fc = $("#f-compat", view); if (fc) fc.addEventListener("change", function () { f.soCompat = this.checked; FC.render(); });
    $$(".f-acess", view).forEach(function (c) { c.addEventListener("change", function () { f.acess = $$(".f-acess:checked", view).map(function (x) { return x.value; }); FC.render(); }); });
    view.addEventListener("click", function (e) {
      if (e.target.closest("[data-sair-plano]")) { FC.busca.plano = null; FC.render(); return; }
      if (e.target.closest("[data-why]")) FC.modal("Por que esta unidade é recomendada?", "<p>Critério transparente: priorizamos a unidade que <strong>já está na loja de retirada</strong> (sem depender de transferência) e, entre elas, a de <strong>menor preço</strong> para o seu período. Nenhuma opção é escondida — você pode escolher qualquer unidade da lista." + rf("RF38") + "</p>");
      var alt = e.target.closest("[data-alt]");
      if (alt) { FC.busca.loja = alt.dataset.alt; FC.toast("Busca alterada para " + FC.lojaById(alt.dataset.alt).nome + " (aceita por você)."); FC.render(); }
      var pk = e.target.closest("[data-pick]");
      if (pk) {
        var x = lista.filter(function (y) { return y.veiculo.id === pk.dataset.pick; })[0];
        FC.db.rascunho = {
          veiculoId: x.veiculo.id, lojaRetirada: b.loja, lojaDevolucao: b.dev || b.loja, inicio: ini.toISOString(), fim: fim.toISOString(),
          transferencia: x.transf.necessaria ? { necessaria: true, origem: x.origem.id, km: x.transf.km, chegadaPrevista: x.transf.chegadaPrevista.toISOString() } : null,
          plano: b.plano || null, condutorModo: "eu", condutores: [], motorista: null, protecoes: [], acessorios: [], km: FC.cfg().km.definida ? "LIVRE" : null, cupom: "", voo: null, aceite: null, step: 1, canal: "site"
        };
        FC.save(); FC.go("#/reserva");
      }
    });
  });

  /* ---------- Reserva em etapas (RF05, RF43, RNF24) ---------- */
  var STEPS = ["Condutores", "Proteções e extras", "Seus dados", "Revisão", "Pagamento"];
  FC.resumoHtml = function (sel, clienteId) {
    var v = FC.veiculoById(sel.veiculoId);
    var lr = FC.lojaById(sel.lojaRetirada), ld = FC.lojaById(sel.lojaDevolucao);
    var preco = FC.calcularPreco(sel, { clienteId: clienteId });
    return '<aside class="box summary sticky" aria-label="Resumo da reserva"><h3>Resumo' + rf("RF43") + "</h3>" + FC.vehImg(v, "veh__img") +
      '<p class="t-h4" style="margin-top:8px">' + esc(v.modelo) + '</p><p class="small muted">' + esc(FC.grupoById(v.grupo).nome) + " · unidade " + v.id + "</p>" +
      '<dl style="margin-top:12px"><dt>Retirada</dt><dd>' + esc(lr.nome) + "<br>" + FC.dtBR(sel.inicio) + "</dd><dt>Devolução</dt><dd>" + esc(ld.nome) + "<br>" + FC.dtBR(sel.fim) + "</dd>" +
      (sel.motorista ? "<dt>Motorista</dt><dd>" + esc(FC.motoristaById(sel.motorista).nome) + "</dd>" : "") + "</dl>" +
      FC.priceBox(preco, { nota: false }) + (FC.cfg().fidelidade ? '<p class="small" style="margin-top:8px">Você ganha ' + preco.periodos * FC.CLUB.ptsDiaria + " pontos no Falls Club" + rf("RF33") + "</p>" : "") + "</aside>";
  };

  function revalida(sel) {
    var problemas = [];
    var v = FC.veiculoById(sel.veiculoId);
    if (!v || !v.ativo) problemas.push("A unidade escolhida não está mais ativa.");
    if (FC.conflitos(sel.veiculoId, sel.inicio, sel.fim, sel.codigoPendente).length) problemas.push("A unidade escolhida deixou de estar disponível para o período.");
    if (new Date(sel.inicio) < new Date(Date.now() + FC.cfg().antecedenciaMin * 60000)) problemas.push("A retirada não respeita mais a antecedência mínima configurada.");
    if (sel.transferencia && sel.transferencia.necessaria) {
      var t = FC.avaliaTransferencia(FC.lojaById(v.localAtual), FC.lojaById(sel.lojaRetirada), sel.inicio);
      if (!t.viavel) problemas.push("A transferência da unidade não chega mais a tempo da retirada.");
    }
    if (sel.motorista && !FC.motoristasElegiveis(v, sel.lojaRetirada, sel.inicio, sel.fim, sel.codigoPendente).some(function (m) { return m.id === sel.motorista; })) problemas.push("O motorista escolhido não está mais disponível.");
    return problemas;
  }

  FC.route("reserva", function (view) {
    var sel = FC.db.rascunho;
    if (!sel || !sel.veiculoId) { view.innerHTML = '<div class="container page"><div class="box"><h2 class="t-h3">Nenhuma reserva em andamento</h2><p style="margin-top:8px">Comece buscando loja e datas.</p><a class="btn btn--primary" style="margin-top:16px" href="#/">Buscar veículos</a></div></div>'; return; }
    var cli = FC.clienteAtual();
    var step = sel.step || 1;
    if (step === 5 && !sel.codigoPendente) step = 4;
    var problemas = step < 5 ? revalida(sel) : [];
    var stepsHtml = '<ol class="steps" aria-label="Etapas da reserva">' + STEPS.map(function (s, i) {
      var n = i + 1, cls = n < step ? "done" : n === step ? "current" : "";
      var canBack = n < step && step < 5;
      return '<li class="' + cls + '"' + (n === step ? ' aria-current="step"' : "") + ">" + (canBack ? '<button type="button" data-step="' + n + '">' : "") + "<b>Etapa " + n + "</b>" + s + (canBack ? "</button>" : "") + "</li>";
    }).join("") + "</ol>";
    var body = "";
    if (problemas.length) body += '<div class="note note--bad" style="margin-bottom:16px">' + icon("alert", 16) + "<span><strong>Revalidamos sua reserva e algo mudou:</strong><br>" + problemas.map(esc).join("<br>") + ' <a class="link" href="#/veiculos">Escolher outra unidade</a>' + rf("RF91") + "</span></div>";
    body += { 1: stepCondutores, 2: stepExtras, 3: stepDados, 4: stepRevisao, 5: stepPagamento }[step](sel, cli);
    view.innerHTML = '<div class="container page"><p class="crumbs"><a href="#/veiculos">← Voltar aos veículos</a></p><h1 class="t-h2" style="margin-bottom:16px">Sua reserva' + rf("RF05", "RNF24") + "</h1>" + stepsHtml +
      '<div class="layout-side"><div id="step-body">' + body + "</div>" + FC.resumoHtml(sel, cli && cli.id) + "</div></div>";
    $$("[data-step]", view).forEach(function (b) { b.addEventListener("click", function () { sel.step = +b.dataset.step; FC.save(); FC.render(); }); });
    ({ 1: bindCondutores, 2: bindExtras, 3: bindDados, 4: bindRevisao, 5: bindPagamento })[step](view, sel, cli);
  });

  function nav(prevLabel, nextLabel, nextDisabled) {
    return '<div class="row row--between" style="margin-top:24px">' + (prevLabel ? '<button class="btn btn--ghost" type="button" id="st-prev">' + prevLabel + "</button>" : "<span></span>") +
      '<button class="btn btn--primary btn--large" type="button" id="st-next"' + (nextDisabled ? " disabled" : "") + ">" + nextLabel + "</button></div>";
  }
  function go(sel, n) { sel.step = n; FC.save(); FC.render(); }

  /* Etapa 1 — Condutores (RF21, RF63, RF76, RF77, RF04, RN06) */
  function cnhForm(prefix, d) {
    d = d || {};
    return '<div class="form-grid">' +
      FC.fld("Nome completo", '<input class="inp" id="' + prefix + '-nome" value="' + esc(d.nome || "") + '" autocomplete="name">') +
      FC.fld("CPF ou documento", '<input class="inp" id="' + prefix + '-doc" value="' + esc(d.doc || "") + '">', "Brasileiros: CPF. Estrangeiros: passaporte.") +
      FC.fld("Categoria da CNH", '<select class="sel" id="' + prefix + '-cat"><option value="">Selecione</option>' + ["A", "B", "AB", "C", "D", "E", "AC", "AD", "AE"].map(function (c) { return "<option" + (d.categoria === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select>") +
      FC.fld("Validade da CNH", '<input class="inp" type="date" id="' + prefix + '-val" value="' + esc(d.validade ? FC.isoDate(d.validade) : "") + '">') +
      '<fieldset class="fld span-all"><legend>Restrições na CNH</legend>' + FC.RESTRICOES.map(function (r) { return '<label class="chk"><input type="checkbox" class="' + prefix + '-res" value="' + esc(r) + '"' + ((d.restricoes || []).indexOf(r) >= 0 ? " checked" : "") + ">" + esc(r) + "</label>"; }).join("") + "</fieldset></div>";
  }
  function lerCnh(root, prefix) {
    return { nome: $("#" + prefix + "-nome", root).value.trim(), doc: $("#" + prefix + "-doc", root).value.trim(), categoria: $("#" + prefix + "-cat", root).value, validade: $("#" + prefix + "-val", root).value ? new Date($("#" + prefix + "-val", root).value + "T12:00:00").toISOString() : "", restricoes: $$("." + prefix + "-res:checked", root).map(function (x) { return x.value; }), status: "informada" };
  }
  function stepCondutores(sel, cli) {
    var v = FC.veiculoById(sel.veiculoId);
    var mots = FC.motoristasElegiveis(v, sel.lojaRetirada, sel.inicio, sel.fim);
    var modo = sel.condutorModo || "eu";
    var cnhCli = cli && cli.cnh;
    var h = '<section class="box"><h3>Quem vai dirigir?' + rf("RF21", "RF77", "RN06") + "</h3>" +
      '<div class="radio-cards" role="radiogroup">' +
      '<label class="radio-card"><input type="radio" name="c-modo" value="eu"' + (modo === "eu" ? " checked" : "") + "><strong>Eu vou dirigir</strong><span class=\"small muted\">Conferimos sua habilitação.</span></label>" +
      '<label class="radio-card"><input type="radio" name="c-modo" value="outro"' + (modo === "outro" ? " checked" : "") + "><strong>Outra pessoa vai dirigir</strong><span class=\"small muted\">Informe a habilitação do condutor principal.</span></label>" +
      '<label class="radio-card"><input type="radio" name="c-modo" value="motorista"' + (modo === "motorista" ? " checked" : "") + (mots.length ? "" : " disabled") + "><strong>Quero um motorista Falls Car</strong><span class=\"small muted\">" + (mots.length ? mots.length + " motorista(s) disponível(is)" : "Nenhum motorista disponível nesta loja e período") + "</span></label></div>" +
      '<div id="c-detalhe" style="margin-top:20px"></div></section>' +
      '<section class="box"><h3>Condutores adicionais' + rf("RF63") + "</h3><p class=\"small muted\">Cada condutor adicional tem a habilitação validada separadamente. Limite atual: " + FC.cfg().maxCondutoresAdicionais + " (parâmetro de demonstração — DP04). Motorista contratado não conta como condutor adicional.</p>" +
      '<ul class="stack" style="list-style:none;margin-top:12px" id="c-adic">' + (sel.condutores || []).map(function (c, i) {
        var av = FC.avaliaCondutor(c, v, sel.fim, c.nome);
        return '<li class="store"><strong>' + esc(c.nome) + "</strong> · CNH " + esc(c.categoria) + " · validade " + FC.dataBR(c.validade) + "<br>" + (av.ok ? '<span class="status status--ok">Elegível</span>' : '<span class="status status--bad">Não elegível</span> <span class="small">' + av.motivos.map(esc).join(" ") + "</span>") + ' <button class="btn btn--link small" type="button" data-rm="' + i + '">Remover</button></li>';
      }).join("") + "</ul>" +
      ((sel.condutores || []).length < FC.cfg().maxCondutoresAdicionais ? '<details style="margin-top:12px"><summary class="btn btn--ghost btn--sm">' + icon("plus", 14) + " Adicionar condutor</summary><div style=\"margin-top:12px\">" + cnhForm("ad") + '<button class="btn btn--primary btn--sm" type="button" id="ad-add" style="margin-top:12px">Validar e adicionar</button></div></details>' : "") +
      "</section>" + (sel.plano ? '<section class="box"><h3>Plano para motoristas de app</h3><label class="chk"><input type="checkbox" id="c-ear"' + (sel.ear ? " checked" : "") + "> Minha CNH tem a observação EAR (exerce atividade remunerada). A CNH original é conferida no balcão.</label></section>" : "") + '<div id="c-res"></div>' + nav(null, "Continuar");
    return h;
  }
  function bindCondutores(view, sel, cli) {
    var v = FC.veiculoById(sel.veiculoId);
    function detalhe() {
      var modo = $('input[name="c-modo"]:checked', view).value;
      sel.condutorModo = modo;
      var d = $("#c-detalhe", view);
      if (modo === "eu") {
        if (cli && cli.cnh) {
          var av = FC.avaliaCondutor(cli.cnh, v, sel.fim, "Você");
          d.innerHTML = '<p class="small">Habilitação cadastrada: categoria <strong>' + esc(cli.cnh.categoria) + "</strong>, validade " + FC.dataBR(cli.cnh.validade) + (cli.cnh.restricoes.length ? ", restrições: " + esc(cli.cnh.restricoes.join(", ")) : "") + ". Situação do documento: <strong>" + esc(cli.cnh.status) + "</strong>.</p>" + resultado(av);
        } else {
          d.innerHTML = '<p class="small muted" style="margin-bottom:12px">' + (cli ? "Você ainda não cadastrou sua CNH. Informe os dados abaixo (envie a imagem depois em Minha conta > Documentos)." : "Informe os dados da sua CNH. Você poderá entrar na conta na etapa 3.") + rf("RF74") + "</p>" + cnhForm("eu", sel.condutorPrincipal) + '<button class="btn btn--ghost btn--sm" type="button" id="eu-val" style="margin-top:12px">Validar habilitação</button><div id="eu-res"></div>';
          $("#eu-val", d).addEventListener("click", function () { sel.condutorPrincipal = lerCnh(d, "eu"); FC.save(); $("#eu-res", d).innerHTML = resultado(FC.avaliaCondutor(sel.condutorPrincipal, v, sel.fim, "Você")); });
        }
        sel.motorista = null;
      } else if (modo === "outro") {
        d.innerHTML = cnhForm("cp", sel.condutorPrincipal) + '<button class="btn btn--ghost btn--sm" type="button" id="cp-val" style="margin-top:12px">Validar habilitação</button><div id="cp-res"></div>';
        $("#cp-val", d).addEventListener("click", function () { sel.condutorPrincipal = lerCnh(d, "cp"); FC.save(); $("#cp-res", d).innerHTML = resultado(FC.avaliaCondutor(sel.condutorPrincipal, v, sel.fim, sel.condutorPrincipal.nome || "Condutor")); });
        sel.motorista = null;
      } else {
        var mots = FC.motoristasElegiveis(v, sel.lojaRetirada, sel.inicio, sel.fim);
        d.innerHTML = '<p class="small" style="margin-bottom:12px">Mostramos só motoristas com habilitação compatível com este veículo e agenda livre no período. A sua CNH não é exigida só por contratar; quem dirigirá é o motorista.' + rf("RF04", "RF73", "RF77") + '</p><div class="radio-cards">' +
          mots.map(function (m) { return '<label class="radio-card"><input type="radio" name="c-mot" value="' + m.id + '"' + (sel.motorista === m.id ? " checked" : "") + "><strong>" + esc(m.nome) + '</strong><span class="small muted">CNH ' + m.categoria + " · agenda livre</span></label>"; }).join("") +
          '</div><p class="small" style="margin-top:12px">Custo: ' + brl(FC.cfg().motoristaDiaria) + " por diária, discriminado no total. Forma de cobrança definitiva pendente (PM01).</p>" +
          '<div class="note note--warn" style="margin-top:8px">' + icon("info", 16) + "<span>O cliente ou acompanhante sem habilitação compatível não fica autorizado a conduzir.</span></div>";
        $$('input[name="c-mot"]', d).forEach(function (r) { r.addEventListener("change", function () { sel.motorista = r.value; FC.save(); FC.render(); }); });
      }
      FC.save();
    }
    function resultado(av) {
      if (av.ok) return '<div class="note note--ok" style="margin-top:12px">' + icon("check", 16) + "<span>Habilitação compatível com o veículo segundo a matriz " + esc(FC.cfg().matrizCNH.versao) + "." + (av.pendente ? " Documento ainda pendente de conferência — envie a imagem em Minha conta." : "") + " Esta é uma conferência dos dados informados, não uma consulta oficial ao Senatran." + rf("RF76", "RN08") + "</span></div>";
      return '<div class="note note--bad" style="margin-top:12px">' + icon("alert", 16) + "<span><strong>Impedimento:</strong><br>" + av.motivos.map(esc).join("<br>") + "<br>Você pode escolher outro veículo ou contratar um motorista elegível." + rf("RF76") + "</span></div>";
    }
    $$('input[name="c-modo"]', view).forEach(function (r) { r.addEventListener("change", detalhe); });
    detalhe();
    view.addEventListener("click", function (e) {
      var rm = e.target.closest("[data-rm]");
      if (rm) { sel.condutores.splice(+rm.dataset.rm, 1); FC.save(); FC.render(); }
    });
    var add = $("#ad-add", view);
    if (add) add.addEventListener("click", function () {
      var c = lerCnh(view, "ad");
      FC.limparErros(view);
      var ok = true;
      if (!c.nome) { FC.erroCampo($("#ad-nome", view), "Informe o nome."); ok = false; }
      if (!c.doc) { FC.erroCampo($("#ad-doc", view), "Informe o documento."); ok = false; }
      else if (/^\d[\d.\-]*$/.test(c.doc) && !FC.cpfValido(c.doc)) { FC.erroCampo($("#ad-doc", view), "CPF inválido."); ok = false; }
      if (!c.categoria) { FC.erroCampo($("#ad-cat", view), "Selecione a categoria."); ok = false; }
      if (!c.validade) { FC.erroCampo($("#ad-val", view), "Informe a validade."); ok = false; }
      if (!ok) return;
      sel.condutores.push(c); FC.save(); FC.render();
    });
    $("#st-next", view).addEventListener("click", function () {
      var modo = sel.condutorModo;
      var erros = [];
      if (sel.plano) {
        sel.ear = !!($("#c-ear", view) && $("#c-ear", view).checked);
        if (!sel.ear) erros.push("O plano para motoristas de app exige CNH com EAR.");
        if (modo === "motorista") erros.push("No plano para motoristas de app, quem dirige é você: motorista contratado não se aplica.");
      }
      if (modo === "motorista") { if (!sel.motorista) erros.push("Escolha um motorista."); }
      else {
        var c = modo === "eu" && cli && cli.cnh ? cli.cnh : sel.condutorPrincipal;
        if (modo !== "eu" || !(cli && cli.cnh)) { var pre = modo === "eu" ? "eu" : "cp"; if ($("#" + pre + "-cat", view)) { sel.condutorPrincipal = lerCnh(view, pre); c = sel.condutorPrincipal; } }
        if (modo === "outro" && (!c || !c.nome)) erros.push("Informe o nome do condutor principal.");
        var av = FC.avaliaCondutor(c, v, sel.fim, "Condutor principal");
        if (!av.ok) erros = erros.concat(av.motivos);
      }
      (sel.condutores || []).forEach(function (c) { var av = FC.avaliaCondutor(c, v, sel.fim, c.nome); if (!av.ok) erros = erros.concat(av.motivos); });
      if (erros.length) { $("#c-res", view).innerHTML = '<div class="note note--bad" role="alert">' + icon("alert", 16) + "<span>" + erros.map(esc).join("<br>") + "</span></div>"; return; }
      FC.save(); go(sel, 2);
    });
  }

  /* Etapa 2 — Proteções, acessórios, km, upgrade (RF17, RF18, RF19, RF40, RF41, RF42, RNF20) */
  function stepExtras(sel, cli) {
    var v = FC.veiculoById(sel.veiculoId);
    var cfg = FC.cfg();
    var dur = FC.duracao(sel.inicio, sel.fim);
    var inclusas = {};
    (sel.protecoes || []).forEach(function (pid) { var p = FC.db.protecoes.filter(function (x) { return x.id === pid; })[0]; (p.inclui || []).forEach(function (i) { inclusas[i] = p.nome; }); });
    var h = "";
    if (cfg.km.definida) h += '<section class="box"><h3>Quilometragem' + rf("RF17") + '</h3><div class="radio-cards">' + cfg.km.modalidades.map(function (m) {
      return '<label class="radio-card"><input type="radio" name="x-km" value="' + m.id + '"' + (sel.km === m.id ? " checked" : "") + "><strong>" + esc(m.nome) + '</strong><span class="small muted">' + (m.franquiaDia ? "Franquia " + m.franquiaDia + " km/dia · excedente " + brl(m.excedente) + "/km" : "Sem limite de km") + (m.ajusteDiaria ? " · " + (m.ajusteDiaria < 0 ? "−" : "+") + brl(Math.abs(m.ajusteDiaria)) + "/dia" : "") + "</span></label>";
    }).join("") + '</div><p class="small muted" style="margin-top:8px">Modalidades e valores de demonstração (PM04).</p></section>';
    h += '<section class="box"><h3>Proteções (opcionais)' + rf("RF18", "RF41", "RNF20") + '</h3><p class="small muted">Nenhuma proteção vem marcada. Nomes, preços e coberturas são exemplos até a aprovação do catálogo (PM05).</p><div class="stack" style="margin-top:12px">' +
      FC.db.protecoes.map(function (p) {
        var inc = inclusas[p.id];
        var checked = (sel.protecoes || []).indexOf(p.id) >= 0;
        return '<label class="radio-card" style="flex-direction:row;gap:12px;align-items:flex-start"><input type="checkbox" class="x-prot" value="' + p.id + '"' + (checked ? " checked" : "") + (inc ? " disabled" : "") + ' style="position:static;opacity:1;width:18px;height:18px;margin-top:3px">' +
          '<span style="flex:1"><strong>' + esc(p.nome) + "</strong> — " + brl(p.diaria) + "/dia (" + brl(p.diaria * dur.periodos) + " no período)<br><span class=\"small\"><b>Cobre:</b> " + esc(p.cobertura) + "<br><b>Não cobre:</b> " + esc(p.exclusoes) + "<br><b>Participação/franquia:</b> " + (p.participacao ? brl(p.participacao) : "sem participação") + "</span>" +
          (inc ? '<br><span class="status status--info">Já incluída em ' + esc(inc) + " — não cobramos duas vezes</span>" : "") + "</span></label>";
      }).join("") + "</div></section>";
    var acs = FC.db.acessorios.filter(function (a) { return a.tipos.indexOf(v.tipo) >= 0; });
    h += '<section class="box"><h3>Acessórios' + rf("RF19", "RF42") + '</h3><p class="small muted">Somente acessórios compatíveis com ' + (v.tipo === "moto" ? "motos" : "carros") + ". Quantidade limitada ao estoque livre da loja no período (PM06).</p><div class=\"tbl-wrap\" style=\"margin-top:12px\"><table class=\"tbl\"><thead><tr><th>Acessório</th><th class=\"num\">Diária</th><th class=\"num\">Disponível</th><th>Quantidade</th></tr></thead><tbody>" +
      acs.map(function (a) {
        var livre = FC.acessorioLivre(a, sel.lojaRetirada, sel.inicio, sel.fim);
        var cur = ((sel.acessorios || []).filter(function (x) { return x.id === a.id; })[0] || {}).qtd || 0;
        return "<tr><td>" + esc(a.nome) + '</td><td class="num">' + brl(a.diaria) + '</td><td class="num">' + livre + '</td><td><select class="sel x-ac" data-ac="' + a.id + '" style="height:36px;width:90px" aria-label="Quantidade de ' + esc(a.nome) + '"' + (livre ? "" : " disabled") + ">" + Array.from({ length: livre + 1 }, function (_, i) { return "<option" + (i === cur ? " selected" : "") + ">" + i + "</option>"; }).join("") + "</select></td></tr>";
      }).join("") + "</tbody></table></div></section>";
    // Upgrade (RF40)
    var ordem = ["ECO", "COM", "SED", "SEDM", "SUV", "SUVG", "ELE", "LUX"], ordemM = ["MOT1", "SCO", "MOT2", "MOTL"];
    var seq = v.tipo === "moto" ? ordemM : ordem;
    var idx = seq.indexOf(v.grupo);
    if (idx >= 0 && idx < seq.length - 1) {
      var sup = FC.unidadesDisponiveis(sel.lojaRetirada, sel.inicio, sel.fim, { tipo: v.tipo }).filter(function (x) { return seq.indexOf(x.veiculo.grupo) === idx + 1; })[0];
      if (sup) {
        var t = FC.tarifaVigente(sel.inicio);
        var dif = FC.diariaVeiculo(t, sup.veiculo) - FC.diariaVeiculo(t, v);
        h += '<section class="box"><h3>Quer subir de categoria?' + rf("RF40") + '</h3><div class="row" style="gap:16px">' + FC.vehImg(sup.veiculo) + "<div><strong>" + esc(sup.veiculo.modelo) + "</strong> (" + esc(FC.grupoById(sup.veiculo.grupo).nome) + ")<br><span class=\"small\">+" + brl(dif) + " por diária · +" + brl(dif * dur.periodos) + " no total</span><br>" +
          '<button class="btn btn--ghost btn--sm" type="button" id="x-up" data-v="' + sup.veiculo.id + '" style="margin-top:8px">Trocar para este veículo</button> <span class="small muted">Nada muda sem o seu aceite.</span></div></div></section>';
      }
    }
    return h + nav("Voltar", "Continuar");
  }
  function bindExtras(view, sel) {
    $$('input[name="x-km"]', view).forEach(function (r) { r.addEventListener("change", function () { sel.km = r.value; FC.save(); FC.render(); }); });
    $$(".x-prot", view).forEach(function (c) {
      c.addEventListener("change", function () {
        var ids = $$(".x-prot:checked", view).map(function (x) { return x.value; });
        // remove sobreposição (RF41)
        var inc = [];
        ids.forEach(function (id) { var p = FC.db.protecoes.filter(function (x) { return x.id === id; })[0]; inc = inc.concat(p.inclui || []); });
        sel.protecoes = ids.filter(function (id) { return inc.indexOf(id) < 0; });
        FC.save(); FC.render();
      });
    });
    $$(".x-ac", view).forEach(function (s) {
      s.addEventListener("change", function () {
        sel.acessorios = (sel.acessorios || []).filter(function (x) { return x.id !== s.dataset.ac; });
        if (+s.value > 0) sel.acessorios.push({ id: s.dataset.ac, qtd: +s.value });
        FC.save(); FC.render();
      });
    });
    var up = $("#x-up", view);
    if (up) up.addEventListener("click", function () {
      var nv = FC.veiculoById(up.dataset.v);
      FC.confirmar2("Confirmar troca de veículo", "<p>Substituir <strong>" + esc(FC.veiculoById(sel.veiculoId).modelo) + "</strong> por <strong>" + esc(nv.modelo) + "</strong>? O preço será recalculado e a habilitação revalidada.</p>", "Aceitar troca", function () {
        var orig = FC.lojaById(nv.localAtual), t = FC.avaliaTransferencia(orig, FC.lojaById(sel.lojaRetirada), sel.inicio);
        sel.veiculoId = nv.id; sel.transferencia = t.necessaria ? { necessaria: true, origem: orig.id, km: t.km, chegadaPrevista: t.chegadaPrevista.toISOString() } : null;
        sel.acessorios = []; sel.step = 1; FC.save(); FC.toast("Veículo trocado. Revalide os condutores."); FC.render();
      });
    });
    $("#st-prev", view).addEventListener("click", function () { go(sel, 1); });
    $("#st-next", view).addEventListener("click", function () { go(sel, 3); });
  }

  /* Etapa 3 — Seus dados (RF05, RF20, RF22, RF47, RF48) */
  function stepDados(sel, cli) {
    var lr = FC.lojaById(sel.lojaRetirada);
    var h = "";
    if (!cli) h += '<section class="box"><h3>Entre ou crie sua conta para continuar' + rf("RF05", "RF22") + '</h3><div id="auth-slot"></div></section>';
    else {
      h += '<section class="box"><h3>Titular da reserva</h3><p>' + esc(cli.nome) + " · " + esc(cli.email) + " · " + esc(cli.docTipo) + " " + esc(FC.mascaraDoc(cli.doc)) + '</p><p class="small muted">Não é você? <button class="btn btn--link small" type="button" id="d-sair">Sair</button></p>' +
        (cli.bloqueado ? '<div class="note note--bad" style="margin-top:12px">' + icon("alert", 16) + "<span>Seu cadastro está em revisão (" + esc(cli.bloqueado.motivo) + "). Novas reservas estão suspensas até a conclusão. Fale com o atendimento." + rf("RF67") + "</span></div>" : "") + "</section>";
      if (lr.tipo === "aeroporto") h += '<section class="box"><h3>Dados do voo (opcional)' + rf("RF48") + '</h3><p class="small muted">Usamos o voo só para acompanhar atrasos e organizar a retirada. Mudanças de voo não alteram o contrato automaticamente — altere a reserva se precisar.</p><div class="form-grid" style="margin-top:12px">' +
        FC.fld("Companhia aérea", '<input class="inp" id="d-cia" value="' + esc((sel.voo || {}).cia || "") + '">') + FC.fld("Número do voo", '<input class="inp" id="d-voo" value="' + esc((sel.voo || {}).numero || "") + '" placeholder="Ex.: AB1234">') + "</div></section>";
      h += '<section class="box"><h3>Quem paga</h3>' + (FC.cfg().pagadorDistinto ? '<label class="chk"><input type="checkbox" id="d-pag"> Outra pessoa vai pagar (informaremos o link de pagamento a ela)</label>' : '<p class="small muted">O pagamento deve ser feito pelo titular. Pagador diferente do titular depende de aprovação da política (DP04).' + rf("RF47") + "</p>") + "</section>";
    }
    return h + nav("Voltar", "Continuar", !cli || !!(cli && cli.bloqueado));
  }
  function bindDados(view, sel, cli) {
    if (!cli) FC.authWidget($("#auth-slot", view), function () { FC.render(); });
    var s = $("#d-sair", view); if (s) s.addEventListener("click", function () { FC.sairCliente().then(FC.render); });
    $("#st-prev", view).addEventListener("click", function () { go(sel, 2); });
    $("#st-next", view).addEventListener("click", function () {
      var cia = $("#d-cia", view), voo = $("#d-voo", view);
      sel.voo = cia && (cia.value.trim() || voo.value.trim()) ? { cia: cia.value.trim(), numero: voo.value.trim().toUpperCase() } : null;
      go(sel, 4);
    });
  }

  /* Etapa 4 — Revisão (RF43, RF26, RF37, RF44, RF49, RF34, RF14) */
  function stepRevisao(sel, cli) {
    var v = FC.veiculoById(sel.veiculoId);
    var lr = FC.lojaById(sel.lojaRetirada), ld = FC.lojaById(sel.lojaDevolucao);
    var preco = FC.calcularPreco(sel, { clienteId: cli && cli.id });
    var cupomInfo = sel.cupom ? FC.cupomValido(sel.cupom, sel, cli && cli.id) : null;
    var club = cli && FC.cfg().fidelidade ? FC.clubSaldo(cli.id) : null;
    var condutor = sel.condutorModo === "motorista" ? "Motorista contratado: " + FC.motoristaById(sel.motorista).nome : sel.condutorModo === "eu" ? (cli ? cli.nome : "Titular") : (sel.condutorPrincipal || {}).nome;
    return '<section class="box"><h3>Confira tudo antes de pagar</h3><dl class="summary" style="display:grid;grid-template-columns:200px 1fr;gap:8px 16px;font-size:14px">' +
      "<dt class=\"muted\">Veículo</dt><dd style=\"margin:0\">" + esc(v.modelo) + " — unidade " + v.id + " (" + esc(FC.grupoById(v.grupo).nome) + ")</dd>" +
      '<dt class="muted">Retirada</dt><dd style="margin:0">' + esc(lr.nome) + " · " + FC.dtBR(sel.inicio) + "</dd>" +
      '<dt class="muted">Devolução</dt><dd style="margin:0">' + esc(ld.nome) + " · " + FC.dtBR(sel.fim) + "</dd>" +
      '<dt class="muted">Duração</dt><dd style="margin:0">' + preco.periodos + " período(s) de " + FC.cfg().periodoCobrancaHoras + " h" + rf("RF10") + "</dd>" +
      '<dt class="muted">Quem dirige</dt><dd style="margin:0">' + esc(condutor) + ((sel.condutores || []).length ? " + " + sel.condutores.map(function (c) { return esc(c.nome); }).join(", ") : "") + "</dd>" +
      (sel.voo ? '<dt class="muted">Voo</dt><dd style="margin:0">' + esc(sel.voo.cia + " " + sel.voo.numero) + "</dd>" : "") +
      (sel.transferencia ? '<dt class="muted">Transferência</dt><dd style="margin:0">A unidade virá de ' + esc(FC.lojaById(sel.transferencia.origem).nome) + " com chegada prevista até " + FC.dtBR(sel.transferencia.chegadaPrevista) + "</dd>" : "") +
      "</dl></section>" +
      '<section class="box"><h3>Preço discriminado' + rf("RF16", "RN07") + "</h3>" + FC.priceBox(preco) + "</section>" +
      '<section class="box"><h3>Cupom de desconto' + rf("RF26", "RF62") + '</h3><div class="row"><label class="fld" style="flex:1"><span class="visually-hidden">Código do cupom</span><input class="inp" id="r-cupom" value="' + esc(sel.cupom || "") + '" placeholder="Digite o código"></label><button class="btn btn--ghost" type="button" id="r-cupom-ok">Aplicar</button>' + (sel.cupom ? '<button class="btn btn--link" type="button" id="r-cupom-rm">Remover</button>' : "") + "</div>" +
      (cupomInfo && cupomInfo.erro ? '<p class="err" style="margin-top:8px">' + esc(cupomInfo.erro) + "</p>" : cupomInfo && cupomInfo.cupom ? '<p class="small" style="margin-top:8px;color:#0d5c33">Cupom aplicado. Condições: ' + esc(cupomInfo.cupom.regulamento) + "</p>" : "") + "</section>" +
      (club && (club.saldo > 0 || sel.pontos) ? '<section class="box"><h3>Falls Club' + rf("RF33") + '</h3><label class="chk"><input type="checkbox" id="r-pontos"' + (sel.pontos ? " checked" : "") + "> Usar meus pontos (" + club.saldo + ' disponíveis)</label><p class="small muted" style="margin-top:4px">' + (sel.pontos ? sel.pontos + " pontos = " + brl(sel.pontos * FC.CLUB.valorPonto) + " de desconto (simulado)." : "100 pontos = " + brl(100 * FC.CLUB.valorPonto) + ". Até metade do valor da locação.") + "</p></section>" : "") +
      '<section class="box"><h3>Retirada e devolução' + rf("RF37", "RF44") + '</h3><p class="small"><strong>Instruções da loja:</strong> ' + esc(lr.instrucoes) + "</p>" +
      '<p class="small" style="margin-top:8px"><strong>Tolerância na devolução:</strong> ' + FC.cfg().toleranciaDevolucaoMin + " minutos; depois disso, cobra-se mais um período. Parâmetro de demonstração (PM02) — não há regra especial por categoria de cliente.</p>" +
      '<p class="small" style="margin-top:8px"><strong>Cancelamento:</strong> ' + esc(FC.politicaCancelamento({ inicio: sel.inicio, preco: preco, pagamento: "aprovado" }).regra) + "</p>" +
      (preco.caucao ? '<p class="small" style="margin-top:8px"><strong>Caução:</strong> ' + brl(preco.caucao) + " — " + esc(FC.cfg().caucao.modalidade) + ", separada do preço e liberada após a devolução sem pendências." + rf("RF30") + "</p>" : "") + "</section>" +
      '<section class="box"><h3>Aceites' + rf("RF49", "RF20") + '</h3><label class="chk"><input type="checkbox" id="r-aceite"> Li e aceito os <button class="btn btn--link small" type="button" id="r-termos">termos de locação (versão ' + esc(FC.db.termosVersao) + ")</button>, o preço total de " + brl(preco.total) + " e a política de cancelamento.</label>" +
      '<label class="chk" style="margin-top:10px"><input type="checkbox" id="r-mkt"' + (cli && cli.marketing ? " checked" : "") + "> Quero receber ofertas por e-mail (opcional, separado da reserva).</label><div id=\"r-err\"></div></section>" +
      nav("Voltar", "Ir para o pagamento");
  }
  function bindRevisao(view, sel, cli) {
    $("#r-cupom-ok", view).addEventListener("click", function () { sel.cupom = $("#r-cupom", view).value.trim().toUpperCase(); FC.save(); FC.render(); });
    var rm = $("#r-cupom-rm", view); if (rm) rm.addEventListener("click", function () { sel.cupom = ""; FC.save(); FC.render(); });
    var rp = $("#r-pontos", view); if (rp) rp.addEventListener("change", function () { sel.pontos = rp.checked ? FC.pontosUsaveis(sel, cli.id) : 0; FC.save(); FC.render(); });
    $("#r-termos", view).addEventListener("click", function () { FC.modal("Termos de locação — " + FC.db.termosVersao, FC.termosHtml(), { wide: true }); });
    $("#st-prev", view).addEventListener("click", function () { go(sel, 3); });
    $("#st-next", view).addEventListener("click", function () {
      var erros = [];
      if (!$("#r-aceite", view).checked) erros.push("Você precisa aceitar os termos, o preço e a política de cancelamento para continuar.");
      var lr = FC.lojaById(sel.lojaRetirada), ld = FC.lojaById(sel.lojaDevolucao);
      if (new Date(sel.inicio) < new Date(Date.now() + FC.cfg().antecedenciaMin * 60000)) erros.push("A retirada não respeita a antecedência mínima (" + FC.cfg().antecedenciaMin + " min).");
      var h1 = FC.validaHorario(lr, new Date(sel.inicio)), h2 = FC.validaHorario(ld, new Date(sel.fim));
      if (!h1.ok) erros.push(h1.msg); if (!h2.ok) erros.push(h2.msg);
      erros = erros.concat(revalida(sel));
      if (sel.cupom) { var cv = FC.cupomValido(sel.cupom, sel, cli && cli.id); if (cv && cv.erro) erros.push("Cupom: " + cv.erro); }
      if (erros.length) { $("#r-err", view).innerHTML = '<div class="note note--bad" role="alert" style="margin-top:12px">' + icon("alert", 16) + "<span>" + erros.map(esc).join("<br>") + "</span></div>"; return; }
      cli.marketing = $("#r-mkt", view).checked;
      sel.aceite = { versao: FC.db.termosVersao, data: new Date().toISOString(), autor: cli.nome, precoAceito: FC.calcularPreco(sel, { clienteId: cli.id }).total };
      var eu = sel.condutorModo === "eu";
      var corpo = { veiculoId: sel.veiculoId, lojaRetirada: sel.lojaRetirada, lojaDevolucao: sel.lojaDevolucao || sel.lojaRetirada, inicio: new Date(sel.inicio).toISOString(), fim: new Date(sel.fim).toISOString(),
        motorista: sel.condutorModo === "motorista" ? sel.motorista : null, protecoes: sel.protecoes || [], acessorios: sel.acessorios || [], km: sel.km || null, cupom: sel.cupom || null, plano: sel.plano || null,
        condutorPrincipal: sel.condutorModo === "motorista" ? null : { proprio: eu, cnh: eu && cli.cnh ? cli.cnh : sel.condutorPrincipal },
        condutores: (sel.condutores || []).map(function (c) { return { nome: c.nome, cnh: c }; }), aceite: { versao: sel.aceite.versao } };
      var bt = this; bt.disabled = true;
      FC.api("POST", "/reservas", corpo).then(function (r) {
        bt.disabled = false;
        if (!r.ok) {
          if (r.status === 401) { FC.esquecerClienteServidor(); FC.toast("Sua sessão terminou. Entre de novo para concluir a reserva.", "bad"); FC.render(); return; }
          var msgs = [r.dados.erro || "Não foi possível criar a reserva."].concat(Object.keys(r.dados.campos || {}).map(function (k) { return r.dados.campos[k]; }));
          if (r.status === 409) { FC._ocupChave = null; msgs.push("Volte à lista de veículos para escolher outro."); }
          $("#r-err", view).innerHTML = '<div class="note note--bad" role="alert" style="margin-top:12px">' + icon("alert", 16) + "<span>" + msgs.map(esc).join("<br>") + "</span></div>";
          return;
        }
        var res = FC.guardarReservaServidor(r.dados.reserva);
        sel.codigoPendente = res.codigo; sel.step = 5; FC.save(); FC.render();
      });
    });
  }

  /* Etapa 5 — Pagamento (RF45, RF46, RF78, RF84, RF61, RNF07) */
  FC.pagamentoHtml = function (r, ctx) {
    var cfg = FC.cfg();
    var parc = cfg.parcelamento;
    var maxP = parc.habilitado ? Math.max(1, Math.min(parc.maxParcelas, Math.floor(FC.valorAgora(r) / parc.minParcela))) : 1;
    return '<section class="box"><h3>Pagamento' + rf("RF45", "RF78") + "</h3>" +
      (r.bloqueioExpira ? '<div class="note note--warn">' + icon("clock", 16) + '<span>Reservamos a unidade para você até <strong id="pg-exp">' + FC.horaBR(r.bloqueioExpira) + "</strong> (" + cfg.holdMin + " min, parâmetro DP02). Se o pagamento não for aprovado até lá, a unidade é liberada.</span></div>" : "") +
      '<p class="small muted" style="margin-top:12px">Total a pagar agora: <strong style="color:var(--c-text)">' + brl(FC.valorAgora(r)) + "</strong>" + (r.preco.semanal ? " (1ª de " + r.preco.semanal.semanas + " semanas; as demais são cobradas antes de cada semana)" : "") + ". Não aceitamos pagamento na retirada. Caução, se houver, é tratada à parte.</p>" +
      '<fieldset class="fld" style="margin-top:16px"><legend>Forma de pagamento</legend><div class="radio-cards">' +
      [["credito", "Cartão de crédito"], ["debito", "Cartão de débito"], ["pix", "Pix"]].map(function (m, i) { return '<label class="radio-card"><input type="radio" name="pg-met" value="' + m[0] + '"' + (i === 0 ? " checked" : "") + "><strong>" + m[1] + "</strong></label>"; }).join("") + "</div></fieldset>" +
      '<div id="pg-detalhe" style="margin-top:16px"></div>' +
      '<div class="box" style="margin-top:16px;background:#fff8e6"><h3 class="small" style="font-size:14px">Simulador de pagamento — ambiente de demonstração' + rf("RF84", "RNF04") + '</h3><p class="small muted">Nenhuma cobrança real é feita. Escolha o resultado que o “provedor” deve devolver:</p>' +
      '<select class="sel" id="pg-sim" style="margin-top:8px"><option value="aprovado">Aprovar</option><option value="recusado">Recusar</option><option value="pendente">Deixar pendente</option><option value="aprovado_tardio">Aprovar depois da expiração do bloqueio</option></select></div>' +
      '<div class="note" style="margin-top:16px">' + icon("shield", 16) + "<span>Pague somente nesta página ou no link enviado ao seu e-mail cadastrado. A Falls Car não pede senha, código por telefone nem depósito em conta de terceiros. Não armazenamos dados do cartão." + rf("RF61", "RNF07") + "</span></div>" +
      '<div id="pg-msg"></div><div class="row row--between" style="margin-top:24px">' + (ctx === "site" ? '<button class="btn btn--ghost" type="button" id="pg-cancel">Desistir e liberar a unidade</button>' : "<span></span>") + '<button class="btn btn--primary btn--large" type="button" id="pg-pagar">Pagar ' + brl(FC.valorAgora(r)) + "</button></div></section>" +
      '<template id="pg-tpl-credito"><div class="form-grid">' + FC.fld("Número do cartão", '<input class="inp" id="pg-num" inputmode="numeric" autocomplete="off" placeholder="4111 1111 1111 1111">') + FC.fld("Nome impresso", '<input class="inp" id="pg-nome" autocomplete="off">') + FC.fld("Validade", '<input class="inp" id="pg-val" placeholder="MM/AA" autocomplete="off">') + FC.fld("CVV", '<input class="inp" id="pg-cvv" inputmode="numeric" maxlength="4" autocomplete="off">') +
      (parc.habilitado ? FC.fld("Parcelamento" + rf("RF46"), '<select class="sel" id="pg-parc">' + Array.from({ length: maxP }, function (_, i) { var n = i + 1; var tot = FC.valorAgora(r) * (1 + (n > 1 ? parc.jurosPct / 100 : 0)); return '<option value="' + n + '">' + n + "x de " + brl(tot / n) + (parc.jurosPct && n > 1 ? " (total " + brl(tot) + ")" : " sem juros") + "</option>"; }).join("") + "</select>", "Parcela mínima " + brl(parc.minParcela) + ", juros " + parc.jurosPct + "% (política de demonstração, PM08).", "span-all") : "") +
      '</div></template><template id="pg-tpl-debito"><div class="form-grid">' + FC.fld("Número do cartão de débito", '<input class="inp" id="pg-num" inputmode="numeric" autocomplete="off">') + FC.fld("Validade", '<input class="inp" id="pg-val" placeholder="MM/AA" autocomplete="off">') + "</div><p class=\"small muted\" style=\"margin-top:8px\">Débito à vista, sem parcelamento.</p></template>" +
      '<template id="pg-tpl-pix"><div class="row" style="gap:16px"><div style="width:140px;height:140px;border-radius:8px;background:repeating-linear-gradient(45deg,#161616 0 6px,#fff 6px 12px);opacity:.85" role="img" aria-label="QR Code simulado"></div><p class="small">QR Code e código copia-e-cola simulados. À vista, sem desconto (desconto Pix não aprovado).<br><code>00020126-PIX-DEMO-' + esc(r.codigo) + "</code></p></div></template>";
  };
  FC.bindPagamento = function (view, r, onDone, ctx) {
    function det() {
      var m = $('input[name="pg-met"]:checked', view).value;
      $("#pg-detalhe", view).innerHTML = $("#pg-tpl-" + m, view).innerHTML;
    }
    $$('input[name="pg-met"]', view).forEach(function (x) { x.addEventListener("change", det); });
    det();
    var pagar = $("#pg-pagar", view);
    pagar.addEventListener("click", function () {
      var m = $('input[name="pg-met"]:checked', view).value;
      FC.limparErros(view);
      if (m !== "pix") {
        var num = ($("#pg-num", view).value || "").replace(/\D/g, ""), val = $("#pg-val", view).value || "";
        var ok = true;
        if (num.length < 13 || num.length > 19) { FC.erroCampo($("#pg-num", view), "Número de cartão inválido (13 a 19 dígitos)."); ok = false; }
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(val)) { FC.erroCampo($("#pg-val", view), "Use o formato MM/AA."); ok = false; }
        if (m === "credito" && !/^\d{3,4}$/.test($("#pg-cvv", view).value)) { FC.erroCampo($("#pg-cvv", view), "CVV inválido."); ok = false; }
        if (!ok) return;
      }
      pagar.disabled = true; // evita clique duplo (RF80)
      var parc = $("#pg-parc", view) ? +$("#pg-parc", view).value : 1;
      var resultadoSim = $("#pg-sim", view).value, nParc = m === "credito" ? parc : 1;
      // dados do cartão nunca são guardados nem enviados (RNF07)
      $$("#pg-num, #pg-cvv, #pg-val, #pg-nome", view).forEach(function (i) { i.value = ""; });
      processar(m, nParc, resultadoSim).then(function (res) {
        if (res.erro) { pagar.disabled = false; $("#pg-msg", view).innerHTML = '<div class="note note--bad" role="alert" style="margin-top:16px">' + icon("alert", 16) + "<span>" + esc(res.erro) + "</span></div>"; return; }
        var rr = res.reserva;
        if (rr.estado === "confirmada") { onDone(rr, res.msg); return; }
        var kind = rr.pagamento === "recusado" || rr.estado === "excecao" ? "note--bad" : "note--warn";
        $("#pg-msg", view).innerHTML = '<div class="note ' + kind + '" role="alert" style="margin-top:16px">' + icon("info", 16) + "<span>" + esc(res.msg) + (rr.pagamento === "pendente" ? ' <button class="btn btn--link small" type="button" id="pg-aprovar">Simular aprovação do provedor</button>' : "") + "</span></div>";
        pagar.disabled = rr.estado !== "aguardando_pagamento";
        var ap = $("#pg-aprovar", view);
        if (ap) ap.addEventListener("click", function () { ap.disabled = true; processar(m, nParc, "aprovado").then(function (r2) { if (r2.reserva && r2.reserva.estado === "confirmada") onDone(r2.reserva, r2.msg); else FC.render(); }); });
        if (rr.estado === "excecao") onDone(rr, res.msg);
      });
    });
    // reserva do site: pagamento na API (idempotente por idEvento); assistida na área da empresa: simulador local
    var tentativa = null;
    function processar(metodo, nParc, resultado) {
      if (!r.servidor) return Promise.resolve(FC.processarPagamento(r.codigo, metodo, nParc, resultado));
      // mesma tentativa reenviada (ex.: rede caiu) usa o mesmo idEvento: o servidor não cobra de novo
      var idEvento = tentativa && tentativa.resultado === resultado ? tentativa.id : FC.uid("PG");
      tentativa = { id: idEvento, resultado: resultado };
      return FC.api("POST", "/reservas/" + encodeURIComponent(r.codigo) + "/pagamento", { metodo: metodo, parcelas: nParc, resultado: resultado, idEvento: idEvento }).then(function (x) {
        if (x.status === 0) return { erro: x.dados.erro };
        tentativa = null;
        if (!x.ok) return { erro: x.dados.erro || "Não foi possível processar o pagamento." };
        return { reserva: FC.guardarReservaServidor(x.dados.reserva), msg: x.dados.msg };
      });
    }
    var cancel = $("#pg-cancel", view);
    if (cancel) cancel.addEventListener("click", function () {
      if (r.servidor) {
        cancel.disabled = true;
        FC.api("POST", "/reservas/" + encodeURIComponent(r.codigo) + "/cancelar", {}).then(function (x) {
          if (x.ok) FC.guardarReservaServidor(x.dados.reserva);
          FC.db.rascunho = null; FC.save();
          FC.toast(x.ok ? "Reserva descartada e veículo liberado." : (x.dados.erro || "Não foi possível cancelar agora."), x.ok ? "ok" : "bad"); FC.go("#/");
        });
        return;
      }
      r.estado = "cancelada"; FC.evento(r, "Cliente desistiu antes do pagamento; recursos liberados", FC.autorAtual()); FC.liberarRecursos(r);
      FC.db.rascunho = null; FC.save(); FC.toast("Reserva descartada e unidade liberada."); FC.go("#/");
    });
  };
  function stepPagamento(sel) {
    var r = FC.reservaByCodigo(sel.codigoPendente);
    if (!r || r.estado !== "aguardando_pagamento") {
      return '<div class="box"><h3>O bloqueio desta reserva expirou</h3><p>A unidade foi liberada. Volte à revisão para tentar novamente — vamos revalidar a disponibilidade.' + rf("RF78", "RF91") + '</p><button class="btn btn--primary" type="button" id="pg-volta" style="margin-top:12px">Voltar à revisão</button></div>';
    }
    return FC.pagamentoHtml(r, "site");
  }
  function bindPagamento(view, sel) {
    var v = $("#pg-volta", view);
    if (v) { v.addEventListener("click", function () { sel.codigoPendente = null; sel.step = 4; FC.save(); FC.render(); }); return; }
    var r = FC.reservaByCodigo(sel.codigoPendente);
    FC.bindPagamento(view, r, function (rr, msg) { FC.db.rascunho = null; FC.save(); FC.toast(msg, rr.estado === "confirmada" ? "ok" : "bad"); FC.go("#/confirmacao/" + rr.codigo); }, "site");
  }

  /* ---------- Confirmação e comprovantes (RF25, RF50, RF66, RF68) ---------- */
  FC.route("confirmacao", function (view, rt) {
    var r = FC.reservaByCodigo(rt.parts[1]);
    var cli = FC.clienteAtual();
    FC._buscadas = FC._buscadas || {};
    if (cli && cli.servidor && (!r || r.servidor) && !FC._buscadas[rt.parts[1]]) {
      FC._buscadas[rt.parts[1]] = true; // uma busca por código a cada carregamento da página
      view.innerHTML = '<div class="container page"><p class="muted" role="status">Carregando a reserva…</p></div>';
      FC.api("GET", "/reservas/" + encodeURIComponent(rt.parts[1] || "")).then(function (x) { if (x.ok) FC.guardarReservaServidor(x.dados.reserva); FC.render(); });
      return;
    }
    if (!r || !cli || r.clienteId !== cli.id) { view.innerHTML = '<div class="container page"><div class="note note--bad">' + icon("lock", 16) + '<span>Entre na conta do titular para ver esta reserva. Você também pode <a class="link" href="#/consultar">consultar pelo código</a>.' + rf("RNF32") + "</span></div></div>"; return; }
    var lr = FC.lojaById(r.lojaRetirada);
    var ok = r.estado === "confirmada";
    view.innerHTML = '<div class="container page"><div class="grid-2"><div class="stack">' +
      '<div class="box" style="text-align:center">' + (ok ? '<p class="status status--ok" style="margin:0 auto">Reserva confirmada</p>' : FC.badgeEstado(r.estado)) +
      '<p class="small muted" style="margin-top:12px">Código da reserva' + rf("RF50") + '</p><p class="code-big">' + esc(r.codigo) + "</p>" +
      '<p class="small muted">Guarde este código. Ele identifica a reserva, mas sozinho não dá acesso a ela.</p></div>' +
      (r.estado === "excecao" ? '<div class="note note--bad">' + icon("alert", 16) + "<span>O pagamento foi aprovado depois que a unidade deixou de estar disponível. Nenhum outro veículo foi reservado sem a sua escolha e o reembolso integral foi iniciado. Nossa equipe vai entrar em contato com alternativas." + rf("RF81") + "</span></div>" : "") +
      '<div class="box"><h3>Instruções de retirada' + rf("RF37") + "</h3><p><strong>" + esc(lr.nome) + "</strong><br>" + esc(lr.endereco) + "<br>" + esc(FC.horarioTexto(lr)) + "<br>" + esc(lr.telefone) + '</p><p class="small" style="margin-top:8px">' + esc(lr.instrucoes) + "</p></div>" +
      '<div class="box"><h3>Documentos' + rf("RF25", "RF66") + '</h3><div class="row"><button class="btn btn--ghost" type="button" data-doc="comprovante">' + icon("doc", 16) + 'Comprovante</button><button class="btn btn--ghost" type="button" data-doc="contrato">' + icon("doc", 16) + 'Contrato (simulado)</button><button class="btn btn--ghost" type="button" data-doc="recibo">' + icon("doc", 16) + "Recibo (sem validade fiscal)</button></div>" +
      '<p class="small muted" style="margin-top:12px">Enviamos a confirmação para ' + esc(cli.email) + " e agendamos lembretes de retirada e devolução (caixa de saída simulada)." + rf("RF68", "RF85") + "</p></div>" +
      '<a class="btn btn--primary" href="#/conta">Ver em Minhas reservas</a></div>' + FC.resumoReservaBox(r) + "</div></div>";
    FC.bindDocs(view, r);
  });
  FC.resumoReservaBox = function (r) {
    var v = FC.veiculoById(r.veiculoId);
    return '<aside class="box summary"><h3>Resumo</h3>' + FC.vehImg(v) + '<p class="t-h4" style="margin-top:8px">' + esc(v.modelo) + '</p><dl style="margin-top:12px"><dt>Retirada</dt><dd>' + esc(FC.lojaById(r.lojaRetirada).nome) + "<br>" + FC.dtBR(r.inicio) + "</dd><dt>Devolução</dt><dd>" + esc(FC.lojaById(r.lojaDevolucao).nome) + "<br>" + FC.dtBR(r.fim) + "</dd><dt>Pagamento</dt><dd>" + (FC.PAGAMENTOS[r.pagamento] || r.pagamento) + "</dd></dl>" +
      '<ul class="price-lines">' + r.preco.itens.map(function (i) { return '<li class="' + (i.valor < 0 ? "neg" : "") + '"><span>' + esc(i.rotulo) + "</span><span>" + brl(i.valor) + "</span></li>"; }).join("") + '</ul><div class="price-total"><span>Total</span><span>' + brl(r.preco.total) + "</span></div>" +
      (r.preco.caucao ? '<div class="price-sep"><span>Caução (separada)</span><span>' + brl(r.preco.caucao) + "</span></div>" : "") + "</aside>";
  };
  FC.bindDocs = function (view, r) {
    view.addEventListener("click", function (e) { var d = e.target.closest("[data-doc]"); if (d) FC.modal({ comprovante: "Comprovante de reserva", contrato: "Contrato de locação", recibo: "Recibo" }[d.dataset.doc], FC.documento(r, d.dataset.doc), { wide: true }); });
  };
  FC.documento = function (r, tipo) {
    var cli = FC.clienteById(r.clienteId), v = FC.veiculoById(r.veiculoId);
    var itens = '<ul class="price-lines">' + r.preco.itens.map(function (i) { return "<li><span>" + esc(i.rotulo) + "</span><span>" + brl(i.valor) + "</span></li>"; }).join("") + '</ul><div class="price-total"><span>Total</span><span>' + brl(r.preco.total) + "</span></div>";
    var base = '<div class="doc"><div class="watermark">DOCUMENTO SIMULADO — PROTÓTIPO ACADÊMICO — SEM VALIDADE FISCAL OU JURÍDICA</div>' +
      "<p><strong>Falls Car Locadora</strong> · CNPJ 00.000.000/0000-00</p><p>Reserva <strong>" + esc(r.codigo) + "</strong> · Emitido em " + FC.dtBR(new Date()) + "</p>" +
      "<h4>Cliente</h4><p>" + esc(cli.nome) + " · " + esc(cli.docTipo) + " " + esc(FC.mascaraDoc(cli.doc)) + "</p>" +
      "<h4>Veículo</h4><p>" + esc(v.modelo) + " · unidade " + v.id + " · placa " + esc(v.placa) + " · " + esc(FC.grupoById(v.grupo).nome) + "</p>" +
      "<h4>Período</h4><p>Retirada: " + esc(FC.lojaById(r.lojaRetirada).nome) + ", " + FC.dtBR(r.inicio) + "<br>Devolução: " + esc(FC.lojaById(r.lojaDevolucao).nome) + ", " + FC.dtBR(r.fim) + "</p>";
    if (tipo === "comprovante") return base + "<h4>Situação</h4><p>" + (FC.ESTADOS[r.estado] || r.estado) + " · pagamento " + (FC.PAGAMENTOS[r.pagamento] || r.pagamento) + "</p><h4>Valores</h4>" + itens + "<h4>Instruções de retirada</h4><p>" + esc(FC.lojaById(r.lojaRetirada).instrucoes) + "</p></div>";
    if (tipo === "contrato") return base + "<h4>Condições</h4><p>Tarifa versão " + r.tarifaVersao + " · parâmetros versão " + r.configVersao + " · termos " + esc((r.aceite || {}).versao || FC.db.termosVersao) + " aceitos em " + ((r.aceite && FC.dtBR(r.aceite.data)) || "—") + " por " + esc((r.aceite || {}).autor || cli.nome) + ".</p>" + itens +
      (r.preco.caucao ? "<p>Caução: " + brl(r.preco.caucao) + " (" + esc(FC.cfg().caucao.modalidade) + "), separada do preço.</p>" : "") + "<h4>Cláusulas resumidas</h4>" + FC.termosHtml() + "</div>";
    var pago = (r.pagamentos || []).filter(function (p) { return p.resultado.indexOf("aprovado") === 0; })[0];
    return base + "<h4>Pagamento</h4><p>" + (pago ? ({ credito: "Crédito", debito: "Débito", pix: "Pix" }[pago.metodo] + (pago.parcelas > 1 ? " em " + pago.parcelas + "x" : "") + " · " + FC.dtBR(pago.data) + " · " + brl(pago.valor)) : "Sem pagamento aprovado") + "</p>" + itens + "</div>";
  };
  FC.termosHtml = function () {
    return '<div class="doc"><p><strong>Versão ' + esc(FC.db.termosVersao) + "</strong> — texto de demonstração, sujeito a revisão jurídica.</p><ol style=\"margin-left:18px\">" +
      "<li>A reserva só é confirmada após o pagamento aprovado e a verificação de disponibilidade e elegibilidade.</li>" +
      "<li>Somente condutores com habilitação compatível e registrados na reserva podem dirigir. Motorista contratado não autoriza outra pessoa a conduzir.</li>" +
      "<li>O cliente reserva uma unidade específica. Substituição só ocorre com aceite, salvo indisponibilidade comprovada, quando oferecemos alternativas.</li>" +
      "<li>Proteções, acessórios e quilometragem seguem o que foi escolhido e discriminado no resumo.</li>" +
      "<li>Cancelamento e alteração seguem a política vigente exibida antes do aceite.</li>" +
      "<li>Despesas posteriores (combustível, avarias, infrações) são cobradas à parte, com evidências e direito de contestação.</li>" +
      "<li>Dados pessoais são tratados conforme a Política de Privacidade; marketing é opcional e separado.</li></ol></div>";
  };
})();
