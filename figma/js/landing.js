/* Falls Car — página inicial (composições vindas do Figma): hero com vídeo, busca, Serviços, Nossos veículos,
   Como funciona, Destinos e Perguntas frequentes. Usa o núcleo do site em ../claude/js. */
(function () {
  "use strict";
  var FC = window.FC, $ = FC.$, esc = FC.esc, icon = FC.icon, rf = FC.rf, brl = FC.brl;
  var SVG_OFF = ' style="fill:none" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
  var SETA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
  var SETA_E = '<svg viewBox="0 0 24 24" stroke-width="2"' + SVG_OFF + ' aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
  var SETA_D = '<svg viewBox="0 0 24 24" stroke-width="2"' + SVG_OFF + ' aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  // a página inicial sempre abre no topo: o hero (e o som do vídeo) é a primeira coisa que se vê
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  /* ---------- Abertura: a marca aparece e a tela sai sozinha; um clique/tecla nela entra na hora já com som ---------- */
  (function () {
    var tela = document.createElement("div");
    tela.className = "entrada"; tela.setAttribute("aria-hidden", "true"); // abertura decorativa
    tela.innerHTML = '<div class="entrada__in"><svg class="entrada__logo" viewBox="0 0 1362 375"><use href="#i-logo"/></svg>' +
      '<p class="entrada__marca">Falls<b>Car</b></p><p class="entrada__sub">Vá além do destino.</p>' +
      '<i class="entrada__barra"></i><p class="entrada__som">Toque para entrar com som</p></div>';
    document.body.appendChild(tela); document.documentElement.classList.add("com-entrada");
    var saiu = false, timer;
    function sair() {
      if (saiu) return; saiu = true; clearTimeout(timer);
      ["pointerdown", "keydown"].forEach(function (t) { document.removeEventListener(t, sair); });
      document.documentElement.classList.remove("com-entrada"); tela.classList.add("is-saindo");
      setTimeout(function () { tela.parentNode && tela.parentNode.removeChild(tela); }, 700);
    }
    // o mesmo pointerdown/keydown já libera o som do hero (bindHeroVideo, em captura)
    ["pointerdown", "keydown"].forEach(function (t) { document.addEventListener(t, sair); });
    timer = setTimeout(sair, matchMedia("(prefers-reduced-motion: reduce)").matches ? 1200 : 2600);
  })();

  /* ---------- Mídia da página inicial (pasta figma/) ---------- */
  FC.HERO_VIDEO = "media/lambo.mp4";
  FC.HERO_POSTER = "media/lambo-poster.jpg";
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
      "</section>";
  };
  FC.bindHeroVideo = function (view) {
    var vid = $(".vhero__video", view), hero = $(".vhero", view);
    if (!vid || !hero) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { vid.removeAttribute("autoplay"); vid.pause(); return; }
    // som só com o topo do hero na tela; o navegador exige uma interação antes de liberar o som
    var liberado = false;
    function noTopo() { return window.scrollY < hero.offsetHeight * 0.5; }
    function ajusta() {
      if (!vid.isConnected) { window.removeEventListener("scroll", ajusta); return; }
      var on = liberado && noTopo();
      if (vid.muted === !on) return;
      vid.muted = !on; vid.volume = 0.7;
      if (on) { var p = vid.play(); if (p && p.catch) p.catch(function () { vid.muted = true; }); }
    }
    function libera() {
      ["pointerdown", "keydown", "touchstart"].forEach(function (t) { document.removeEventListener(t, libera, true); });
      liberado = true; ajusta();
    }
    vid.muted = false; vid.volume = 0.7;
    var tenta = vid.play();
    if (tenta && tenta.then) tenta.then(function () { liberado = true; ajusta(); }, function () {
      vid.muted = true; var p2 = vid.play(); if (p2 && p2.catch) p2.catch(function () {});
      ["pointerdown", "keydown", "touchstart"].forEach(function (t) { document.addEventListener(t, libera, true); });
    });
    window.addEventListener("scroll", ajusta, { passive: true });
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

  /* ---------- Prévia interativa do app (no lugar do Como funciona) ---------- */
  var APP_PTS0 = 3150; // nível Estrada
  var APP_CONQ = [["viagem", "car", "Primeira viagem", true], ["explorador", "pin", "Explorador", true], ["relampago", "clock", "Check-in relâmpago"], ["critico", "heart", "Crítico"], ["embaixador", "users", "Embaixador"], ["moto", "moto", "Motociclista"]];
  function appRetirada() { var d = new Date(); d.setDate(d.getDate() + 1); return FC.pad(d.getDate()) + "/" + FC.pad(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function appPhoneHtml() {
    var v = FC.db.veiculos.filter(function (x) { return x.modelo === "BMW R 1250 GS"; })[0] || FC.db.veiculos.filter(function (x) { return x.foto; })[0];
    var carro = v && v.foto ? '<img class="fa-next__car" src="' + FC.fotoSrc(v.foto) + '" alt="">' : '<span class="fa-next__car">' + icon("car", 56) + "</span>";
    var pts = "<span data-pts>" + APP_PTS0.toLocaleString("pt-BR") + "</span>";
    var etapas = [["doc", "Documentos conferidos", 0, true], ["money", "Pagamento aprovado", 0, true], ["check", "Check-in online", 50, false, "Fazer check-in", "relampago"], ["edit", "Vistoria por fotos", 30, false, "Enviar fotos"]];
    var inicio = '<section class="fa-tela is-on" data-tela="inicio">' +
      '<header class="fa-top"><button type="button" class="fa-ico" data-toast="Menu da prévia: use as abas lá embaixo." aria-label="Menu">' + icon("list", 20) + "</button>" +
      '<div class="fa-logo"><b>Falls<span>Car</span></b><small>Locação de Carros e Motos</small></div>' +
      '<button type="button" class="fa-ico fa-bell" data-ir="ofertas" aria-label="Notificações">' + icon("inbox", 20) + "<i></i></button></header>" +
      '<div class="fa-hello"><button type="button" class="fa-avatar" data-perfil aria-label="Ampliar foto de perfil de Jensen Huang"><img src="img/perfil-jensen.jpg" alt="" width="52" height="52"></button><div><b>Olá, Jensen!</b><span>Que bom ter você por aqui.</span></div></div>' +
      '<div class="fa-sheet"><article class="fa-card"><p class="fa-card__t">' + icon("calendar", 16) + "Sua próxima locação</p>" +
      '<div class="fa-next__row">' + carro + '<div><p class="fa-muted">Retirada</p><b class="fa-next__dt">' + appRetirada() + " · 10h</b>" +
      '<p class="fa-next__loja">' + icon("pin", 14) + "<span>São Paulo — Paulista</span></p></div></div>" +
      '<button type="button" class="fa-btn" data-ir="locacoes">Ver detalhes' + icon("chevron-right", 14) + "</button></article>" +
      '<button type="button" class="fa-club" data-ir="conta"><span class="fa-club__star">' + icon("sparkle", 18) + "</span><span><small>Falls Club</small><b>" + pts + " <span>pontos</span></b></span>" +
      '<span class="fa-club__cta"><span>Troque por descontos e benefícios!</span>' + icon("chevron-right", 14) + "</span></button>" +
      '<div class="fa-atalhos">' + [["car", "Alugar carro", 'data-alugar="carro"'], ["moto", "Alugar moto", 'data-alugar="moto"'], ["gift", "Ofertas especiais", 'data-ir="ofertas"'], ["chat", "Suporte", "data-suporte"]].map(function (a) {
        return '<button type="button" ' + a[2] + ">" + icon(a[0], 24) + "<span>" + a[1] + "</span></button>";
      }).join("") + "</div>" +
      '<div class="fa-promo"><p><span>Até</span> <b>50%</b><br><span>de economia</span></p><small>no aluguel mensal</small><button type="button" class="fa-btn fa-btn--sm" data-alugar="carro">Reserve agora' + icon("chevron-right", 12) + "</button></div>" +
      "</div></section>";
    var locacoes = '<section class="fa-tela" data-tela="locacoes"><header class="fa-head">Minhas locações</header><div class="fa-sheet">' +
      '<article class="fa-card"><p class="fa-card__t">' + icon("car", 16) + "<span>" + esc(v ? v.modelo : "SUV") + "</span></p>" +
      '<p class="fa-muted"><span>Reserva</span> FC-7K2Q · ' + appRetirada() + " · 10h · <span>São Paulo — Paulista</span></p></article>" +
      '<article class="fa-card"><div class="fa-row"><p class="fa-card__t">' + icon("check", 16) + 'Check-in digital</p><b class="fa-prog__n" data-prog-n>2/4</b></div>' +
      '<div class="fa-prog"><span data-prog style="width:50%"></span></div><ol class="fa-steps">' + etapas.map(function (e) {
        return "<li" + (e[3] ? ' class="is-done"' : "") + '><span class="fa-steps__ic">' + icon(e[3] ? "check" : e[0], 16) + '</span><span class="fa-steps__t"><span>' + e[1] + "</span>" + (e[2] ? "<small>+" + e[2] + " pontos</small>" : "") + "</span>" +
          (e[3] ? "" : '<button type="button" class="fa-btn fa-btn--sm" data-ganho="' + e[2] + '"' + (e[5] ? ' data-conq="' + e[5] + '"' : "") + ">" + e[4] + "</button>") + "</li>";
      }).join("") + "</ol></article>" +
      '<article class="fa-card fa-qr" data-qr hidden><p class="fa-card__t">' + icon("sparkle", 16) + "Retirada liberada!</p>" + FC.qrSvg("FC-7K2Q") + '<p class="fa-muted">Mostre o QR no balcão. Sem fila.</p></article>' +
      "</div></section>";
    var ofertas = '<section class="fa-tela" data-tela="ofertas"><header class="fa-head">Ofertas</header><div class="fa-sheet">' +
      '<button type="button" class="fa-cupom" data-cupom><span class="fa-cupom__f">' + icon("gift", 28) + "<b>Cupom do dia</b><small>Toque para revelar</small></span>" +
      '<span class="fa-cupom__b"><small>20% OFF</small><b data-notr>BLACKFRIDAY</b><small>Toque para copiar</small></span></button>' +
      '<p class="fa-sec">Missões da semana</p><ul class="fa-missoes">' +
      '<li><span class="fa-m__ic">' + icon("calendar", 18) + '</span><span class="fa-m__t"><span>Reserve 3 diárias</span><small><span>2 de 3</span> · <span>+100 pontos</span></small><i class="fa-mini"><span style="width:66%"></span></i></span></li>' +
      '<li data-avaliar><span class="fa-m__ic">' + icon("heart", 18) + '</span><span class="fa-m__t"><span>Avalie sua última locação</span><small>+30 pontos</small><span class="fa-rate">' +
      [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-nota="' + n + '" aria-label="' + n + ' de 5">★</button>'; }).join("") + "</span></span></li>" +
      '<li><span class="fa-m__ic">' + icon("users", 18) + '</span><span class="fa-m__t"><span>Indique um amigo</span><small>+200 pontos</small></span><button type="button" class="fa-btn fa-btn--sm" data-ganho="200" data-conq="embaixador">Indicar</button></li>' +
      '<li><span class="fa-m__ic">' + icon("moto", 18) + '</span><span class="fa-m__t"><span>Experimente uma moto</span><small>+80 pontos</small></span><button type="button" class="fa-btn fa-btn--sm" data-ganho="80" data-conq="moto">Aceitar</button></li>' +
      "</ul></div></section>";
    var conta = '<section class="fa-tela" data-tela="conta"><header class="fa-head">Minha conta</header><div class="fa-sheet">' +
      '<article class="fa-card fa-lvl"><p class="fa-lvl__lbl">Falls Club · Nível Estrada</p><b class="fa-lvl__pts">' + pts + " <span>pontos</span></b>" +
      '<p class="fa-lvl__lbl">≈ <b data-brl>' + brl(APP_PTS0 * FC.CLUB.valorPonto) + "</b> <span>de desconto em reservas</span></p>" +
      '<div class="fa-lvlbar">' + FC.CLUB.niveis.map(function (n, i) { return "<span" + (i < 2 ? ' class="is-on"' : "") + ">" + icon(i < 2 ? "check" : "lock", 12) + n.nome + "</span>"; }).join("") + "</div></article>" +
      '<p class="fa-sec">Conquistas <span class="fa-muted" data-conq-n></span></p><div class="fa-conq">' + APP_CONQ.map(function (c) {
        return '<div data-conq-id="' + c[0] + '"' + (c[3] ? ' class="is-on"' : "") + "><i>" + icon(c[1], 18) + "</i><span>" + c[2] + "</span></div>";
      }).join("") + "</div>" +
      '<button type="button" class="fa-btn" data-alugar="carro">Usar pontos numa reserva</button></div></section>';
    return '<div class="fa-phone" role="region" aria-label="Prévia interativa do app Falls Car"><div class="fa-screen">' +
      '<div class="fa-status"><span>9:41</span><i class="fa-island"></i><span class="fa-status__r"><span>5G</span><i class="fa-batt"></i></span></div>' +
      '<div class="fa-body">' + inicio + locacoes + ofertas + conta + "</div>" +
      // pagamento simulado: Pix -> processando -> concluído -> tela inicial
      '<section class="fa-pay" data-pay="pix" aria-label="Pagamento da reserva"><div class="fa-pay__pix">' +
      '<header class="fa-head">Pagamento</header><div class="fa-sheet">' +
      '<article class="fa-card"><div class="fa-next__row">' + carro + '<div><p class="fa-muted">Reserva FC-7K2Q</p><b class="fa-next__dt">' + esc(v ? v.modelo : "Moto") + '</b><p class="fa-muted">3 diárias · retirada ' + appRetirada() + "</p></div></div>" +
      '<div class="fa-row fa-pay__tot"><span>Total</span><b>R$ 1.290,00</b></div></article>' +
      '<article class="fa-card fa-qr"><p class="fa-card__t">' + icon("money", 16) + "Pix · pagamento instantâneo</p>" + FC.qrSvg("PIX-FC-7K2Q") + '<p class="fa-muted">Copia e cola ou QR. Aprovação na hora.</p></article>' +
      '<button type="button" class="fa-btn fa-pay__go" data-pagar>Pagar com Pix · R$ 1.290,00</button></div></div>' +
      '<div class="fa-pay__wait" role="status"><i class="fa-spin" aria-hidden="true"></i><b>Processando pagamento…</b><span class="fa-muted">Confirmando o Pix com o banco</span></div>' +
      '<div class="fa-pay__ok" role="status"><svg class="fa-pay__check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>' +
      '<b>Pix concluído!</b><span>R$ 1.290,00 pagos</span><small>Reserva FC-7K2Q confirmada</small></div></section>' +
      '<div class="fa-zoom" data-zoom hidden><button type="button" class="fa-zoom__in" data-zoom-fechar aria-label="Fechar foto"><img src="img/perfil-jensen.jpg" alt="Foto de perfil de Jensen Huang"><b>Jensen Huang</b><span>Falls Club · Nível Estrada</span><small>Toque para fechar</small></button></div>' +
      '<nav class="fa-nav" aria-label="Abas do app">' + [["inicio", "store", "Início"], ["locacoes", "calendar", "Minhas locações"], ["ofertas", "tag", "Ofertas"], ["conta", "account", "Minha conta"]].map(function (t, i) {
        return '<button type="button" data-ir="' + t[0] + '"' + (i ? "" : ' class="is-on" aria-current="page"') + ">" + icon(t[1], 22) + "<span>" + t[2] + "</span></button>";
      }).join("") + '</nav><div class="fa-toast" role="status"></div></div></div>';
  }
  FC.secComoFunciona = function () {
    return '</div><section class="how" aria-labelledby="app-prev-t"><div class="container"><div class="app-prev" id="app-prev"><div class="app-prev__in"><div class="app-prev__txt">' +
      '<h2 class="t-h2" id="app-prev-t">Seu aluguel na <span>palma da mão</span></h2>' +
      "<p>Explore a prévia do app: faça o check-in, cumpra missões e veja seus pontos no Falls Club subirem.</p>" +
      '<ul class="app-prev__list">' + [["check", "Check-in digital em 4 passos, com QR para retirar sem fila."], ["gift", "Missões e cupom do dia para ganhar pontos."], ["sparkle", "Conquistas e níveis no Falls Club."]].map(function (x) {
        return "<li><i>" + icon(x[0], 16) + "</i><span>" + x[1] + "</span></li>";
      }).join("") + "</ul>" +
      '<div class="app-prev__stores"><button type="button" data-loja-app="App Store"><img src="img/app-store.png" alt="Baixar na App Store" width="164" height="55"></button>' +
      '<button type="button" data-loja-app="Google Play"><img src="img/google-play.png" alt="Disponível no Google Play" width="164" height="55"></button></div></div>' + appPhoneHtml() + '</div></div></div></section><div class="container">';
  };
  // "Cha-ching" de caixa registradora gerado com Web Audio (sem arquivo). Precisa ser criado dentro de um clique.
  function somDinheiro(atraso) {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var ctx = new AC(), t0 = ctx.currentTime + (atraso || 0), saida = ctx.createGain();
    saida.gain.value = 0.55; saida.connect(ctx.destination);
    function tom(freq, ini, dur, vol, tipo) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = tipo || "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ini); g.gain.exponentialRampToValueAtTime(vol, ini + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
      o.connect(g); g.connect(saida); o.start(ini); o.stop(ini + dur + 0.05);
    }
    function clique(ini) { // "ka": estalo mecânico da gaveta
      var n = Math.floor(ctx.sampleRate * 0.06), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "bandpass"; f.frequency.value = 1800; g.gain.value = 0.9; s.buffer = b; s.connect(f); f.connect(g); g.connect(saida); s.start(ini);
    }
    clique(t0);
    [[2093, 0.06], [2637, 0.06], [3136, 0.07], [4186, 0.08]].forEach(function (p, i) { tom(p[0], t0 + p[1] + i * 0.004, 1.1 - i * 0.15, 0.22 - i * 0.03, i ? "sine" : "triangle"); }); // "ching": sino
    for (var k = 0; k < 7; k++) tom(3200 + Math.random() * 2200, t0 + 0.32 + k * 0.045 + Math.random() * 0.02, 0.12, 0.06); // moedas
    setTimeout(function () { ctx.close(); }, (atraso || 0) * 1000 + 2000);
  }
  function bindAppPreview(root) {
    var ph = $(".fa-phone", root); if (!ph) return;
    var $$ = FC.$$, pts = APP_PTS0, conq = {}, raf = 0;
    APP_CONQ.forEach(function (c) { if (c[3]) conq[c[0]] = 1; });
    var contaConq = function () { $("[data-conq-n]", ph).textContent = Object.keys(conq).length + "/" + APP_CONQ.length; };
    var pop = function (e) { if (!e) return; e.classList.remove("is-pop"); void e.offsetWidth; e.classList.add("is-pop"); };
    function toast(html) { var t = $(".fa-toast", ph); t.innerHTML = html; t.classList.remove("is-on"); void t.offsetWidth; t.classList.add("is-on"); }
    function ir(t) {
      $$(".fa-tela", ph).forEach(function (s) { s.classList.toggle("is-on", s.dataset.tela === t); });
      $$(".fa-nav button", ph).forEach(function (b) { var on = b.dataset.ir === t; b.classList.toggle("is-on", on); if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
      $(".fa-body", ph).scrollTop = 0;
    }
    function ganhar(n, motivo) {
      var de = pts, t0 = performance.now(); pts += n; cancelAnimationFrame(raf);
      (function step(t) {
        var k = Math.min(1, (t - t0) / 700), val = Math.round(de + (pts - de) * (1 - Math.pow(1 - k, 3))).toLocaleString("pt-BR");
        $$("[data-pts]", ph).forEach(function (e) { e.textContent = val; });
        if (k < 1) raf = requestAnimationFrame(step);
      })(t0);
      $$("[data-brl]", ph).forEach(function (e) { e.textContent = brl(pts * FC.CLUB.valorPonto); });
      pop($(".fa-club", ph)); pop($(".fa-lvl", ph));
      toast("<b>+" + n + " pontos</b><span>" + motivo + "</span>");
    }
    function desbloquear(id) {
      if (!id || conq[id]) return; conq[id] = 1; contaConq();
      var c = $('[data-conq-id="' + id + '"]', ph); if (!c) return;
      c.classList.add("is-on"); pop(c);
      setTimeout(function () { toast("<b>" + icon("sparkle", 14) + "</b><span>Conquista desbloqueada</span><span>·</span><span>" + c.textContent + "</span>"); }, 1500);
    }
    function progresso() {
      var feitas = $$(".fa-steps li.is-done", ph).length, total = $$(".fa-steps li", ph).length;
      $("[data-prog]", ph).style.width = feitas / total * 100 + "%"; $("[data-prog-n]", ph).textContent = feitas + "/" + total;
      if (feitas === total) { var q = $("[data-qr]", ph); q.hidden = false; pop(q); }
    }
    contaConq();
    FC.$$("[data-loja-app]", root).forEach(function (b) { b.addEventListener("click", function () { FC.toast("App fictício: " + b.dataset.lojaApp + " não está disponível neste protótipo."); }); });
    // o celular sobe ao entrar na tela pela primeira vez
    if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); ph.classList.add("is-landing"); } }, { threshold: .3 });
      io.observe(ph);
    }
    ph.addEventListener("click", function (e) {
      var el = e.target.closest("button"); if (!el || !ph.contains(el)) return;
      if ("perfil" in el.dataset) { var z = $("[data-zoom]", ph); z.hidden = false; void z.offsetWidth; z.classList.add("is-on"); $("[data-zoom-fechar]", ph).focus(); return; }
      if ("zoomFechar" in el.dataset) { var zz = $("[data-zoom]", ph); zz.classList.remove("is-on"); setTimeout(function () { zz.hidden = true; }, 250); $("[data-perfil]", ph).focus(); return; }
      if ("pagar" in el.dataset) {
        var pay = $(".fa-pay", ph); pay.dataset.pay = "wait";
        somDinheiro(1.4); // agendado junto com a tela de Pix concluído
        setTimeout(function () { pay.dataset.pay = "ok"; }, 1400);
        setTimeout(function () { pay.classList.add("is-saindo"); }, 3200);
        setTimeout(function () { pay.hidden = true; ir("inicio"); toast("<b>" + icon("check", 14) + "</b><span>Reserva confirmada. Boa viagem!</span>"); }, 3650);
        return;
      }
      if (el.dataset.ir) { ir(el.dataset.ir); return; }
      if (el.dataset.toast) { toast("<span>" + el.dataset.toast + "</span>"); return; }
      if ("suporte" in el.dataset) { if (FC.abrirChat) FC.abrirChat(); return; }
      if (el.dataset.alugar) {
        var r = document.querySelector('input[name="b-tipo"][value="' + el.dataset.alugar + '"]');
        if (r) { r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); }
        var l = document.getElementById("b-loja"); if (l) { l.scrollIntoView({ block: "center", behavior: "smooth" }); l.focus({ preventScroll: true }); }
        return;
      }
      if (el.dataset.ganho) {
        var li = el.closest("li"), nome = li.querySelector(".fa-m__t > span, .fa-steps__t > span").textContent;
        li.classList.add("is-done"); var ic = li.querySelector(".fa-steps__ic, .fa-m__ic"); if (ic) ic.innerHTML = icon("check", 16);
        el.remove(); ganhar(+el.dataset.ganho, nome); desbloquear(el.dataset.conq);
        if (li.closest(".fa-steps")) progresso();
        return;
      }
      if ("cupom" in el.dataset) {
        if (!el.classList.contains("is-flip")) { el.classList.add("is-flip"); return; }
        try { navigator.clipboard.writeText("BLACKFRIDAY"); } catch (x) {}
        toast("<span>Cupom BLACKFRIDAY copiado. Use na revisão da reserva.</span>"); return;
      }
      if (el.dataset.nota) {
        var av = el.closest("[data-avaliar]"), n = +el.dataset.nota;
        $$("[data-nota]", av).forEach(function (b) { b.classList.toggle("is-on", +b.dataset.nota <= n); });
        if (!av.classList.contains("is-done")) { av.classList.add("is-done"); av.querySelector(".fa-m__ic").innerHTML = icon("check", 16); ganhar(30, "Avalie sua última locação"); desbloquear("critico"); }
      }
    });
  }
  FC.bindSecoes = function (view) {
    view.addEventListener("click", function (e) {
      var b = e.target.closest("[data-reservar-grupo]");
      if (b) { var g = FC.grupoById(b.dataset.reservarGrupo); FC.filtros.grupo = g.id; FC.busca.tipo = g.tipo; FC.busca.plano = null; FC.go("#/veiculos"); }
    });
    bindAppPreview(view);
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

  /* ---------- Menus de vidro da busca: trocam as listas e o calendário nativos (que não aceitam estilo) ---------- */
  // Os select/input nativos continuam como fonte da verdade: o menu só grava o valor e dispara "change".
  var gp = { pop: null, el: null };
  function gpFechar(foco) {
    if (gp.pop) gp.pop.remove();
    if (gp.el) { gp.el.setAttribute("aria-expanded", "false"); if (foco) gp.el.focus({ preventScroll: true }); }
    gp.pop = gp.el = null;
  }
  function gpPosicionar() {
    if (!gp.pop) return;
    if (!gp.el.isConnected) { gpFechar(); return; }
    var r = gp.el.closest(".field, .age-select").getBoundingClientRect(), p = gp.pop, m = 10;
    p.style.minWidth = Math.max(220, r.width) + "px";
    var h = p.offsetHeight, w = p.offsetWidth, baixo = innerHeight - r.bottom - m, cima = r.top - m;
    var up = baixo < h && cima > baixo;
    p.classList.toggle("is-up", up);
    p.style.maxHeight = Math.max(160, Math.min(360, (up ? cima : baixo) - 8)) + "px";
    p.style.top = (up ? r.top - m - p.offsetHeight : r.bottom + m) + "px";
    p.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + "px";
  }
  function gpLista(sel) {
    var h = "", add = function (o) {
      h += '<button type="button" class="gpop__opt' + (o.value === sel.value ? " is-on" : "") + '" data-v="' + esc(o.value) + '"' + (o.disabled ? " disabled" : "") + ' role="option" aria-selected="' + (o.value === sel.value) + '">' + esc(o.textContent) + "</button>";
    };
    Array.prototype.forEach.call(sel.children, function (c) {
      if (c.tagName === "OPTGROUP") { h += '<div role="group" aria-label="' + esc(c.label) + '"><p class="gpop__grp">' + esc(c.label) + "</p>"; Array.prototype.forEach.call(c.children, add); h += "</div>"; } else add(c);
    });
    return '<div class="gpop__list" role="listbox">' + h + "</div>";
  }
  function gpCal(inp, ano, mes) {
    var lang = document.documentElement.lang || "pt-BR", iso = function (d) { return ano + "-" + FC.pad(mes + 1) + "-" + FC.pad(d); };
    var ini = ($("#b-dIni") || {}).value, fim = ($("#b-dFim") || {}).value, hoje = FC.isoDate(new Date());
    var fimMesAnt = new Date(ano, mes, 0), antOff = inp.min && FC.isoDate(fimMesAnt) < inp.min;
    var h = '<div class="gcal" data-ano="' + ano + '" data-mes="' + mes + '"><div class="gcal__head">' +
      '<button type="button" class="gcal__nav" data-nav="-1" aria-label="Mês anterior"' + (antOff ? " disabled" : "") + ">" + icon("chevron-left", 16) + "</button>" +
      "<b>" + esc(new Date(ano, mes, 1).toLocaleDateString(lang, { month: "long", year: "numeric" }).replace(/^./, function (c) { return c.toUpperCase(); })) + "</b>" +
      '<button type="button" class="gcal__nav" data-nav="1" aria-label="Próximo mês">' + icon("chevron-right", 16) + '</button></div><div class="gcal__grid">';
    for (var w = 0; w < 7; w++) h += '<span class="gcal__dow">' + new Date(2024, 0, 7 + w).toLocaleDateString(lang, { weekday: "narrow" }) + "</span>";
    for (var i = 0, p = new Date(ano, mes, 1).getDay(); i < p; i++) h += "<span></span>";
    var faixa = ini && fim && ini < fim;
    for (var d = 1, n = new Date(ano, mes + 1, 0).getDate(); d <= n; d++) {
      var v = iso(d), cls = "gcal__d" + (v === inp.value ? " is-on" : "") + (v === hoje ? " is-hoje" : "") +
        (faixa && v > ini && v < fim ? " is-range" + (d === 1 ? " is-vem" : d === n ? " is-vai" : "") : "") + (faixa && v === ini ? " is-ini" : "") + (faixa && v === fim ? " is-fim" : "");
      h += '<button type="button" class="' + cls + '" data-v="' + v + '"' + (inp.min && v < inp.min ? " disabled" : "") + "><span>" + d + "</span></button>";
    }
    return h + "</div></div>";
  }
  function gpAbrir(el) {
    if (gp.el === el) { gpFechar(true); return; }
    gpFechar();
    var data = el.type === "date", base = data ? new Date((el.value || FC.isoDate(new Date())) + "T12:00") : null;
    gp.el = el; el.setAttribute("aria-expanded", "true");
    gp.pop = document.createElement("div");
    gp.pop.className = "gpop" + (data ? " gpop--cal" : /^b-h/.test(el.id) ? " gpop--horas" : "");
    gp.pop.innerHTML = data ? gpCal(el, base.getFullYear(), base.getMonth()) : gpLista(el);
    document.body.appendChild(gp.pop);
    gpPosicionar();
    var on = $(".is-on:not([disabled])", gp.pop) || $("button:not([disabled])[data-v]", gp.pop);
    if (on) { on.focus({ preventScroll: true }); if (!data) on.scrollIntoView({ block: "center" }); }
    gp.pop.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b || b.disabled) return;
      if (b.dataset.nav) {
        var c = $(".gcal", gp.pop), dt = new Date(+c.dataset.ano, +c.dataset.mes + +b.dataset.nav, 1);
        gp.pop.innerHTML = gpCal(gp.el, dt.getFullYear(), dt.getMonth()); gpPosicionar();
        var nb = $('[data-nav="' + b.dataset.nav + '"]', gp.pop); if (nb && !nb.disabled) nb.focus();
        return;
      }
      var alvo = gp.el;
      if (alvo.value !== b.dataset.v) { alvo.value = b.dataset.v; alvo.dispatchEvent(new Event("input", { bubbles: true })); alvo.dispatchEvent(new Event("change", { bubbles: true })); }
      gpFechar(true);
    });
    gp.pop.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); gpFechar(true); return; }
      if (e.key === "Tab") { gpFechar(true); return; }
      var bs = FC.$$("button[data-v]:not([disabled])", gp.pop), i = bs.indexOf(document.activeElement);
      var passo = { ArrowDown: data ? 7 : 1, ArrowUp: data ? -7 : -1, ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (passo && bs.length) { e.preventDefault(); bs[Math.max(0, Math.min(bs.length - 1, i < 0 ? 0 : i + passo))].focus(); }
    });
  }
  FC.bindGlassPickers = function (root) {
    var ctrls = FC.$$(".vsearch select, .vsearch input[type=date], #b-dev", root);
    ctrls.forEach(function (el) {
      el.classList.add("gp-ctrl"); el.setAttribute("aria-haspopup", el.type === "date" ? "dialog" : "listbox"); el.setAttribute("aria-expanded", "false");
      el.addEventListener("click", function (e) { e.preventDefault(); }); // nunca abre o seletor nativo
      if (el.showPicker) el.showPicker = function () {};
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || (e.altKey && e.key === "ArrowDown") || (el.tagName === "SELECT" && (e.key === "ArrowDown" || e.key === "ArrowUp"))) { e.preventDefault(); gpAbrir(el); }
      });
    });
    // os controles nativos ignoram o ponteiro (CSS .gp-ctrl); o clique no campo abre o menu do controle mais próximo
    ctrls.map(function (el) { return el.closest(".field, .age-select"); }).filter(function (c, i, a) { return c && a.indexOf(c) === i; }).forEach(function (box) {
      // sem seleção de texto nem foco nativo ao clicar no campo
      box.addEventListener("mousedown", function (e) { if (!e.target.closest("button, a, input[type=radio], input[type=checkbox]")) e.preventDefault(); });
      box.addEventListener("click", function (e) {
        if (e.target.closest("button, a, input[type=radio], input[type=checkbox]")) return;
        if (e.target.closest("label")) e.preventDefault(); // o label repassaria o clique e abriria a lista nativa
        var cs = ctrls.filter(function (el) { return box.contains(el); }), x = e.clientX;
        var dist = function (el) { var r = el.getBoundingClientRect(); return x < r.left ? r.left - x : x > r.right ? x - r.right : 0; };
        gpAbrir(cs.sort(function (a, b) { return dist(a) - dist(b); })[0]);
      });
    });
  };
  document.addEventListener("mousedown", function (e) { if (gp.pop && !gp.pop.contains(e.target) && !gp.el.closest(".field, .age-select").contains(e.target)) gpFechar(); });
  window.addEventListener("resize", gpPosicionar);
  window.addEventListener("scroll", gpPosicionar, true);

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
    FC.bindGlassPickers(view);
    FC.bindFaq(view);
    FC.bindHeroVideo(view);
    var ct = $("#ct-track", view);
    if (ct) { $("#ct-prev", view).addEventListener("click", function () { ct.scrollBy({ left: -ct.clientWidth, behavior: "smooth" }); }); $("#ct-next", view).addEventListener("click", function () { ct.scrollBy({ left: ct.clientWidth, behavior: "smooth" }); }); }
    FC.bindSecoes(view);
  });
})();
