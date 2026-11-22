/* Falls Car — página inicial (composições vindas do Figma): hero com vídeo, busca, Serviços, Nossos veículos,
   Como funciona, Destinos e Perguntas frequentes. Usa o núcleo do site em ../claude/js. */
(function () {
  "use strict";
  var FC = window.FC, $ = FC.$, esc = FC.esc, icon = FC.icon, rf = FC.rf, brl = FC.brl;
  var SVG_OFF = ' style="fill:none" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
  var SETA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
  var SETA_E = '<svg viewBox="0 0 24 24" stroke-width="2"' + SVG_OFF + ' aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
  var SETA_D = '<svg viewBox="0 0 24 24" stroke-width="2"' + SVG_OFF + ' aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  /* ---------- Mídia da página inicial (pasta figma/) ---------- */
  FC.HERO_VIDEO = "media/hero-carro.mp4";
  FC.HERO_POSTER = "media/hero-poster.jpg";
  FC.COMO_VIDEO = "media/como-funciona.mp4";
  FC.COMO_POSTER = "media/como-funciona-poster.jpg";
  FC.cidadeFoto = function (nome) {
    var s = String(nome).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return "img/cidades/" + s + ".jpg";
  };

  /* ---------- Hero com vídeo e barras de vidro ---------- */
  FC.heroSearch = function (b) {
    var cfg = FC.cfg();
    var hoje = FC.isoDate(new Date());
    if (b.tipo !== "carro" && b.tipo !== "moto") b.tipo = "carro";
    return '<div class="glass-wrap vsearch-wrap"><div class="glass-halo" aria-hidden="true"></div>' +
      '<form class="glass vsearch" id="busca-form" novalidate autocomplete="off" role="search" aria-label="Buscar veículos">' +
      '<div class="field vsearch__tipo"><div class="vs-body"><span class="field__label" id="vs-tipo-l">Veículo</span><div class="vs-pills" role="radiogroup" aria-labelledby="vs-tipo-l">' +
      [["carro", "Carro", "car"], ["moto", "Moto", "moto"]].map(function (t) {
        return '<label class="vs-pill"><input type="radio" name="b-tipo" value="' + t[0] + '"' + (b.tipo === t[0] ? " checked" : "") + "><span>" + icon(t[2], 16) + t[1] + "</span></label>";
      }).join("") + "</div></div></div>" +
      '<div class="field vsearch__loja">' + icon("pin", 26).replace("<svg", '<svg class="vs-ico"') + '<div class="vs-body"><label class="field__label" for="b-loja">Loja de retirada' + rf("RF12", "RF09") + '</label>' +
      '<div class="vs-row"><select id="b-loja">' + FC.lojaOptions(b.loja) + '<optgroup label="Outras opções"><option value="__cidade">Informar cidade manualmente</option></optgroup></select></div></div>' +
      '<button type="button" class="field__icon" id="b-geo" aria-label="Usar minha localização" title="Usar minha localização"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="fill:none"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" style="fill:currentColor"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/></svg></button></div>' +
      '<div class="field vs-data">' + icon("calendar", 26).replace("<svg", '<svg class="vs-ico"') + '<div class="vs-body"><label class="field__label" for="b-dIni">Retirada</label>' +
      '<div class="vs-row"><input type="date" id="b-dIni" min="' + hoje + '" value="' + b.dIni + '" required><span class="vs-sep" aria-hidden="true">·</span><select id="b-hIni" aria-label="Hora de retirada">' + FC.slotOptions(b.loja, b.dIni, b.hIni) + "</select></div></div></div>" +
      '<div class="field vs-data">' + icon("calendar", 26).replace("<svg", '<svg class="vs-ico"') + '<div class="vs-body"><label class="field__label" for="b-dFim">Devolução</label>' +
      '<div class="vs-row"><input type="date" id="b-dFim" min="' + hoje + '" value="' + b.dFim + '" required><span class="vs-sep" aria-hidden="true">·</span><select id="b-hFim" aria-label="Hora de devolução">' + FC.slotOptions(b.dev || b.loja, b.dFim, b.hFim) + "</select></div></div></div>" +
      '<button class="vsearch__go" type="submit" aria-label="Buscar veículos">' + icon("search", 28) + '<span class="vs-go-txt">Buscar</span></button>' +
      "</form></div>" +
      '<div class="vsearch__opts">' +
      (cfg.devolucaoOutraLoja.habilitada ? '<label class="checkbox"><input type="checkbox" id="b-outra"' + (b.dev && b.dev !== b.loja ? " checked" : "") + "><span>Devolver em outra loja" + rf("RF13") + "</span></label>" : "") +
      '<span id="b-dev-wrap"' + (b.dev && b.dev !== b.loja ? "" : " hidden") + ' class="age-select"><select id="b-dev" aria-label="Loja de devolução">' + FC.lojaOptions(b.dev || b.loja) + '</select><span class="small" id="b-dev-taxa"></span></span>' +
      '<span class="small search__hours" id="b-loja-hint" aria-live="polite"></span></div>' +
      '<div class="hero-errors" id="busca-erros" role="alert" hidden></div>';
  };
  FC.heroVideo = function (b, extra) {
    return '<section class="vhero" aria-labelledby="vhero-t">' +
      '<img class="vhero__poster" src="' + FC.HERO_POSTER + '" alt="" aria-hidden="true">' +
      '<video class="vhero__video" autoplay muted loop playsinline preload="auto" poster="' + FC.HERO_POSTER + '" aria-hidden="true" tabindex="-1"><source src="' + FC.HERO_VIDEO + '" type="video/mp4"></video>' +
      '<div class="vhero__shade" aria-hidden="true"></div>' +
      FC.heroNav() +
      '<div class="vhero__content"><h1 class="vhero__title" id="vhero-t">Vá além do destino.</h1>' +
      '<p class="vhero__sub">Carros selecionados para tornar cada viagem <br class="br-desk">mais confortável, segura e inesquecível.</p>' +
      FC.heroSearch(b) + (extra || "") + "</div>" +
      '<button type="button" class="vhero__pause" id="vhero-pause" aria-label="Pausar vídeo de fundo" aria-pressed="false"><svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4 2h3v12H4zm5 0h3v12H9z"/></svg></button>' +
      "</section>";
  };
  FC.bindHeroVideo = function (view) {
    var vid = $(".vhero__video", view), pb = $("#vhero-pause", view);
    if (!vid || !pb) return;
    var PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4 2.5v11l9-5.5z"/></svg>', PAUSE = pb.innerHTML;
    function estado(pausado) { pb.setAttribute("aria-pressed", String(pausado)); pb.setAttribute("aria-label", pausado ? "Reproduzir vídeo de fundo" : "Pausar vídeo de fundo"); pb.innerHTML = pausado ? PLAY : PAUSE; }
    if (FC._heroPausado || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) { vid.removeAttribute("autoplay"); vid.pause(); estado(true); }
    pb.addEventListener("click", function () {
      if (vid.paused) { FC._heroPausado = false; vid.style.display = "block"; var p = vid.play(); if (p && p.catch) p.catch(function () {}); estado(false); }
      else { FC._heroPausado = true; vid.pause(); estado(true); }
    });
  };

  /* ---------- Serviços ---------- */
  FC.secServicos = function () {
    var itens = [
      ["Retirada digital em minutos", "Check-in online e QR code no balcão.", "#/vantagens/retirada"],
      ["Escolha o carro exato", "Placa e fotos da unidade que você reserva.", "#/vantagens/exato"],
      ["Adicionais e proteções", "Cadeirinha, condutor extra e proteções.", "#/vantagens/adicionais"],
      ["Lojas abertas 24 horas", "Retire e devolva a qualquer hora nos aeroportos com loja 24h.", "#/lojas"]
    ];
    return '<section class="sx" aria-labelledby="svc-t"><div class="sx-head"><div class="sx-head__txt"><span class="eyebrow">Serviços</span>' +
      '<h2 class="sx-title" id="svc-t">Alugar um carro nunca foi tão fácil.</h2>' +
      '<p class="sx-sub">Escolha entre diversos veículos, reserve em poucos passos e aproveite sua viagem com liberdade e tranquilidade.</p></div>' +
      '<a class="sx-btn" href="#/vantagens/retirada">Ver todos</a></div>' +
      '<div class="svc-grid">' + itens.map(function (s, i) {
        return '<a class="svc-card' + (i === 0 ? " is-on" : "") + '" href="' + s[2] + '"><div class="svc-card__top"><h3 class="svc-card__title">' + s[0] + '</h3><span class="svc-card__arrow" aria-hidden="true">' + SETA + '</span></div><p class="svc-card__desc">' + s[1] + "</p></a>";
      }).join("") + "</div></section>";
  };

  /* ---------- Nossos veículos ---------- */
  var VITRINE = [["ECO", "renault-kwid"], ["SEDM", "toyota-corolla"], ["SUV", "jeep-renegade"], ["LUX", "porsche-911"]];
  FC.secVeiculos = function (tarifa) {
    var itens = VITRINE.map(function (x) {
      var g = FC.grupoById(x[0]); if (!g) return null;
      var doGrupo = FC.db.veiculos.filter(function (v) { return v.grupo === g.id && v.ativo; });
      var v = doGrupo.filter(function (u) { return u.foto === x[1]; })[0] || doGrupo[0];
      return v ? { g: g, v: v } : null;
    }).filter(Boolean);
    return '<section class="sx" aria-labelledby="car-t"><div class="sx-head"><div class="sx-head__txt"><span class="eyebrow">Nossos veículos</span>' +
      '<h2 class="sx-title" id="car-t">Encontre o carro ideal para você.' + rf("RF55") + "</h2>" +
      '<p class="sx-sub">Explore nossa seleção de veículos, dos modelos econômicos aos mais sofisticados, e encontre a opção perfeita para cada ocasião.</p></div></div>' +
      '<div class="car-grid">' + itens.map(function (x) {
        var g = x.g, v = x.v;
        return '<article class="car-card"><a class="car-card__img" href="#/frota?grupo=' + g.id + '" aria-label="Ver o grupo ' + esc(g.nome) + '">' + FC.vehImg(v, "veh__img") + "</a>" +
          '<h3 class="car-card__name">' + esc(g.nome) + '</h3><p class="car-card__ex">Ex.: ' + esc(v.modelo) + "</p>" +
          '<div class="car-card__specs"><span title="Lugares">' + icon("person", 15) + v.lugares + '</span><span title="Malas">' + icon("bags", 15) + v.malas + '</span><span title="Câmbio">' + icon("gear", 15) + esc(v.cambio === "Automático" ? "Auto" : v.cambio) + "</span>" + (v.ar ? '<span title="Ar-condicionado">' + icon("snow", 15) + "A/C</span>" : "") + "</div>" +
          '<div class="car-card__foot"><button type="button" class="sx-btn sx-btn--dark" data-reservar-grupo="' + g.id + '">Reservar</button><p class="car-card__price">' + brl(tarifa.diarias[g.id]).replace(",00", "") + "<small>/dia</small></p></div></article>";
      }).join("") + '</div><a class="sx-btn car-more" href="#/frota">Ver todos</a></section>';
  };

  /* ---------- Como funciona ---------- */
  FC.secComoFunciona = function () {
    var passos = [["1. Busque", "Escolha loja e datas."], ["2. Escolha a unidade", "Reserve o veículo exato, com fotos."], ["3. Informe quem dirige", "Confirmamos a CNH. Sem CNH? Contrate motorista."], ["4. Pague e pronto", "Pagou, confirmou. Você recebe o código."]];
    return '</div><section class="how" aria-labelledby="how-t"><div class="container"><div class="sx-head"><div class="sx-head__txt"><span class="eyebrow">Como funciona</span>' +
      '<h2 class="sx-title" id="how-t">Alugue um carro em 4 passos simples.</h2>' +
      '<p class="sx-sub">Sem burocracia: escolha, reserve, pague e retire. Rápido, simples e seguro.</p></div></div>' +
      '<div class="how-steps">' + passos.map(function (p) { return '<div class="how-step"><h3 class="how-step__t">' + p[0] + '</h3><p class="how-step__d">' + p[1] + "</p></div>"; }).join("") + "</div>" +
      '<div class="how-media"><video preload="none" muted loop playsinline poster="' + FC.COMO_POSTER + '" aria-label="Vídeo: dirigindo na estrada"><source src="' + FC.COMO_VIDEO + '" type="video/mp4"></video>' +
      '<button type="button" class="how-play" aria-label="Reproduzir vídeo"><svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4 2.5v11l9-5.5z"/></svg></button></div>' +
      '</div></section><div class="container">';
  };
  FC.bindSecoes = function (view) {
    view.addEventListener("click", function (e) {
      var b = e.target.closest("[data-reservar-grupo]");
      if (b) { var g = FC.grupoById(b.dataset.reservarGrupo); FC.filtros.grupo = g.id; FC.busca.tipo = g.tipo; FC.busca.plano = null; FC.go("#/veiculos"); }
    });
    var box = $(".how-media", view);
    if (box) {
      var v = $("video", box), p = $(".how-play", box);
      p.addEventListener("click", function () { var r = v.play(); if (r && r.catch) r.catch(function () {}); box.classList.add("is-playing"); v.setAttribute("controls", ""); v.focus(); });
      v.addEventListener("pause", function () { if (!v.seeking) { box.classList.remove("is-playing"); v.removeAttribute("controls"); } });
    }
  };

  /* ---------- Destinos ---------- */
  FC.secDestinos = function () {
    var cid = {}, lojas = FC.db.lojas.filter(function (l) { return l.ativa; });
    lojas.forEach(function (l) { var k = l.cidade + "|" + l.uf; (cid[k] = cid[k] || { cidade: l.cidade, uf: l.uf, n: 0, aero: 0 }).n++; if (l.tipo === "aeroporto") cid[k].aero++; });
    var lista = Object.keys(cid).map(function (k) { return cid[k]; }).sort(function (a, b) { return b.n - a.n || a.cidade.localeCompare(b.cidade); });
    var h24 = lojas.filter(function (l) { return FC.horarioTexto(l).indexOf("24") >= 0; }).length;
    return '<section class="sx" aria-labelledby="dst-t"><div class="sx-head"><div class="sx-head__txt"><span class="eyebrow">Destinos</span>' +
      '<h2 class="sx-title" id="dst-t">Retire seu carro onde a viagem começa.' + rf("RF54") + "</h2>" +
      '<p class="sx-sub">' + lojas.length + " lojas em " + lista.length + " cidades · " + h24 + " abertas 24 horas.</p></div>" +
      '<div class="sx-actions"><button type="button" class="sx-round" id="ct-prev" aria-label="Cidades anteriores">' + SETA_E + '</button><button type="button" class="sx-round sx-round--next" id="ct-next" aria-label="Próximas cidades">' + SETA_D + '</button><a class="sx-btn" href="#/lojas">Ver todas no mapa</a></div></div>' +
      '<div class="city-track" id="ct-track">' + lista.map(function (c) {
        return '<a class="city-card" href="#/lojas?cidade=' + encodeURIComponent(c.cidade) + '"><img class="city-card__img" src="' + FC.cidadeFoto(c.cidade) + '" alt="' + esc(c.cidade) + '" loading="lazy" width="800" height="500">' +
          '<div class="city-card__body"><p class="city-card__name">' + esc(c.cidade) + '</p><p class="city-card__meta">' + c.uf + " · " + c.n + (c.n > 1 ? " lojas" : " loja") + (c.aero ? " · aeroporto" : "") + "</p></div></a>";
      }).join("") + "</div></section>";
  };

  /* ---------- Perguntas frequentes ---------- */
  FC.secFaq = function () {
    return '<section class="sx" aria-labelledby="faq-t"><div class="sx-head"><div class="sx-head__txt"><span class="eyebrow">Dúvidas</span>' +
      '<h2 class="sx-title" id="faq-t">Perguntas frequentes</h2><p class="sx-sub">Tudo o que você precisa saber antes de reservar.</p></div>' +
      '<a class="sx-btn sx-btn--line" href="#/ajuda">Ver todas na Ajuda</a></div><div class="faq">' +
      FC.FAQ.slice(0, 6).map(function (f, i) { return '<div class="faq__item"><h3 style="margin:0"><button class="faq__q" type="button" aria-expanded="false" aria-controls="hfa' + i + '"><span>' + esc(f[0]) + "</span>" + icon("chevron-down") + '</button></h3><div class="faq__a" id="hfa' + i + '" hidden><p>' + esc(f[1]) + "</p></div></div>"; }).join("") +
      "</div></section>";
  };

  /* ---------- Página inicial ---------- */
  FC.route("inicio", function (view) {
    FC.busca.plano = null; // a busca da home é sempre a locação diária
    var tarifa = FC.tarifaVigente();
    var rec = FC.ponto ? FC.lojasPorDistancia(FC.ponto).slice(0, 3) : null;
    var draft = FC.db.rascunho;
    view.innerHTML =
      FC.heroVideo(FC.busca,
        (draft && draft.veiculoId && FC.veiculoById(draft.veiculoId) ? '<div class="note vhero__note">' + icon("info", 16) + '<span>Reserva em andamento (' + esc(FC.veiculoById(draft.veiculoId).modelo) + "). <a class=\"link\" href=\"#/reserva\">Continuar</a>" + rf("RF91") + "</span></div>" : "") +
        (rec ? '<div class="note vhero__note">' + icon("pin", 16) + "<span>Mais perto de " + esc(FC.ponto.nome) + " (linha reta): " + rec.map(function (x, i) { return (i ? " · " : "") + "<strong>" + esc(x.loja.nome) + "</strong> " + x.km.toFixed(1) + " km"; }).join("") + "." + rf("RF09", "RN04") + "</span></div>" : "")) +
      '<div class="container">' + FC.secServicos() + FC.secVeiculos(tarifa) + FC.secComoFunciona() +
      FC.secDestinos() + FC.secFaq() + "</div>";
    FC.bindSearchForm(view);
    FC.bindFaq(view);
    FC.bindHeroVideo(view);
    var ct = $("#ct-track", view);
    if (ct) { $("#ct-prev", view).addEventListener("click", function () { ct.scrollBy({ left: -ct.clientWidth, behavior: "smooth" }); }); $("#ct-next", view).addEventListener("click", function () { ct.scrollBy({ left: ct.clientWidth, behavior: "smooth" }); }); }
    FC.bindSecoes(view);
  });
})();
