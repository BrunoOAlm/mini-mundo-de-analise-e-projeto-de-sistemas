/* Falls Car — interface compartilhada: barra de vidro, rodapé, perguntas e movimento (usada pelo site e pela página inicial) */
(function () {
  "use strict";
  var FC = window.FC, $ = FC.$, $$ = FC.$$, esc = FC.esc, icon = FC.icon, rf = FC.rf;
  var SVG_OFF = ' style="fill:none" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
  var GLOBO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.8 3.9 6 3.9 9.5S14.6 18.7 12 21.5M12 2.5C9.4 5.3 8.1 8.5 8.1 12s1.3 6.7 3.9 9.5"/></svg>';
  var BURGER = '<svg viewBox="0 0 24 24" stroke-width="1.8"' + SVG_OFF + ' aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';

  /* ---------- Barra de vidro (escura na hero, clara nas páginas internas) ---------- */
  FC.NAV_LINKS = [["#/frota", "Frota"], ["#/lojas", "Lojas"], ["#/vantagens/retirada", "Serviços"], ["#/ajuda", "Ajuda"]];
  FC.heroNav = function (light, active) {
    var c = FC.clienteAtual();
    var lang = FC.i18n ? FC.i18n.lang() : "pt";
    var id = light ? "vnav-menu-l" : "vnav-menu";
    var cur = function (h) { return active && active !== "#/" && h.indexOf(active) === 0 ? ' aria-current="page"' : ""; };
    var menu = FC.NAV_LINKS.concat([[c ? "#/conta" : "#/consultar", "Minhas reservas"], ["#/produto/app", "Motoristas de app"]]);
    return '<div class="glass-wrap vnav-wrap' + (light ? " vnav-wrap--light" : "") + '"><div class="glass-halo" aria-hidden="true"></div><header class="glass vnav">' +
      '<a class="vnav__logo" href="#/" aria-label="Falls Car — página inicial"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-car"/></svg><span>Falls Car</span></a>' +
      '<nav class="vnav__links" aria-label="Seções do site">' + FC.NAV_LINKS.map(function (l) { return '<a href="' + l[0] + '"' + cur(l[0]) + ">" + l[1] + "</a>"; }).join("") + "</nav>" +
      '<div class="vnav__end">' +
      '<details class="vnav__lang"><summary aria-label="Idioma e moeda">' + GLOBO + '<span class="vs-lang-txt" data-notr>' + lang.toUpperCase() + ' | R$</span></summary><div class="glass vnav__lang-panel">' + (FC.langBtns ? FC.langBtns() : "") + "</div></details>" +
      '<a class="vnav__mine" href="' + (c ? "#/conta" : "#/consultar") + '">Minhas reservas</a>' +
      '<a class="vnav__cta" href="#/conta">' + (c ? esc(c.nome.split(" ")[0]) : "Entrar") + "</a>" +
      '<button type="button" class="vnav__burger" aria-expanded="false" aria-controls="' + id + '" aria-label="Abrir menu">' + BURGER + "</button>" +
      "</div></header>" +
      '<nav class="glass vnav__menu" id="' + id + '" aria-label="Menu" hidden>' + menu.map(function (l) { return '<a href="' + l[0] + '"' + cur(l[0]) + ">" + l[1] + "</a>"; }).join("") + "</nav></div>";
  };
  FC.siteNav = function (active) { return FC.heroNav(true, active); };

  /* ---------- Perguntas frequentes (usadas na página inicial e na Ajuda) ---------- */
  FC.FAQ = [
    ["Quais documentos preciso para retirar o veículo?", "Documento oficial com foto do titular, a CNH de cada condutor registrado na reserva e o código da reserva. Estrangeiros apresentam passaporte."],
    ["Posso alugar por qualquer período?", "Sim. Você escolhe data e hora de retirada e devolução livremente; não há pacotes fixos de 7, 15 ou 30 dias. O cálculo usa períodos de 24 horas (política de demonstração)."],
    ["Quando a reserva é confirmada?", "Somente depois do pagamento aprovado (crédito, débito ou Pix) e da verificação final de disponibilidade. Não aceitamos pagamento na retirada."],
    ["Não tenho CNH. Posso alugar?", "Sim, contratando um motorista da Falls Car com habilitação compatível com o veículo. Você não poderá dirigir."],
    ["Posso alugar moto com CNH categoria B?", "Não. Motos exigem categoria A (ou AB e combinações com A). Categorias C, D e E não autorizam moto automaticamente."],
    ["O carro escolhido estará na minha loja?", "Se a unidade estiver em outra loja da mesma cidade, planejamos a transferência quando há tempo hábil antes da retirada. Caso contrário, ela nem aparece como opção."],
    ["Posso devolver em outra loja?", "Sim, quando a política estiver habilitada. A taxa é calculada e exibida antes do pagamento."],
    ["Como cancelo ou altero?", "Em Minha conta > Reservas. Antes de confirmar, mostramos diferença de preço, multa e reembolso conforme a política vigente."],
    ["O que é a caução?", "Um valor de garantia separado do preço, tratado como pré-autorização no cartão e liberado após a devolução sem pendências."],
    ["Como sei que estou falando com a Falls Car?", "Use apenas os canais oficiais listados no rodapé. Nunca pedimos senha, código recebido por SMS ou pagamento em conta de pessoa física."],
    ["Como envio minha CNH antes da retirada?", "Em Minha conta > Documentos. A conferência é manual e não equivale a uma verificação oficial de autenticidade."],
    ["Como exerço meus direitos sobre meus dados?", "Em Privacidade e seus direitos você pode pedir acesso, correção ou exclusão, com verificação de identidade."]
  ];
  /* ---------- Perguntas frequentes (abre e fecha) ---------- */
  FC.bindFaq = function (root) {
    root.addEventListener("click", function (e) {
      var q = e.target.closest(".faq__q"); if (!q) return;
      var open = q.getAttribute("aria-expanded") === "true";
      q.setAttribute("aria-expanded", String(!open));
      document.getElementById(q.getAttribute("aria-controls")).hidden = open;
    });
  };

  /* ---------- Rodapé claro ---------- */
  var SOCIAL = {
    X: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg>',
    LinkedIn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zm7 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4z"/></svg>',
    Facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.2C16.7 2.1 15.6 2 14.4 2 11.8 2 10 3.6 10 6.5v2H7.3V12H10v10h4V12h2.8l.4-3.5z"/></svg>',
    Instagram: '<svg viewBox="0 0 24 24" stroke-width="1.9"' + SVG_OFF + ' aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1.1" style="fill:currentColor" stroke="none"/></svg>'
  };
  var CT_ICO = {
    pin: '<svg viewBox="0 0 24 24" stroke-width="1.7"' + SVG_OFF + ' aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    tel: '<svg viewBox="0 0 24 24" stroke-width="1.7"' + SVG_OFF + ' aria-hidden="true"><path d="M21 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.1 4.2 2 2 0 0 1 3.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L7.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.8 2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" stroke-width="1.7"' + SVG_OFF + ' aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>',
    chat: '<svg viewBox="0 0 24 24" stroke-width="1.7"' + SVG_OFF + ' aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z"/></svg>'
  };
  FC.rodape = function () {
    var cfg = FC.cfg(), h = location.hash || "#/";
    var nav = [["#/", "Início"], ["#/frota", "Frota"], ["#/lojas", "Lojas"], ["#/vantagens/retirada", "Serviços"], ["#/produto/app", "Motoristas de app"], ["#/ajuda", "Ajuda"]];
    var ativo = function (href) { return href === "#/" ? (h === "#/" || h === "#" || h === "") : h.indexOf(href.split("/").slice(0, 2).join("/")) === 0; };
    return '<footer class="ft"><div class="container">' +
      '<div class="ft-top"><a class="ft-logo" href="#/" aria-label="Falls Car — página inicial"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-car"/></svg><span>Falls Car</span></a>' +
      '<nav class="ft-nav" aria-label="Rodapé">' + nav.map(function (n) { return '<a href="' + n[0] + '"' + (ativo(n[0]) ? ' aria-current="page"' : "") + ">" + n[1] + "</a>"; }).join("") + "</nav></div>" +
      '<div class="ft-mid">' +
      (cfg.newsletter ? '<form class="ft-news" id="news-form" novalidate><h3 class="ft-h">Assine nossa newsletter' + rf("RF57") + '</h3><p class="ft-news__sub">Ofertas, novidades e dicas de viagem. Sem spam.</p>' +
        '<div class="ft-news__box"><label class="fld"><span class="visually-hidden">E-mail</span><input type="email" id="news-email" autocomplete="email" placeholder="Digite seu e-mail"></label><button class="ft-news__btn" type="submit">Assinar</button></div>' +
        '<button type="button" class="ft-news__cancel" id="news-cancel">Cancelar inscrição</button></form>' : "<div></div>") +
      '<ul class="ft-social" aria-label="Redes sociais">' + Object.keys(SOCIAL).map(function (s) { return '<li><button type="button" class="ft-soc" data-social="' + s + '" aria-label="' + s + '" title="' + s + '">' + SOCIAL[s] + "</button></li>"; }).join("") + "</ul>" +
      '<div class="ft-contact"><h3 class="ft-h">Contato' + rf("RF59", "RF61") + "</h3><ul>" +
      "<li>" + CT_ICO.pin + "<span>Av. Paulista, 1000 · Bela Vista, São Paulo/SP</span></li>" +
      '<li>' + CT_ICO.tel + '<a href="tel:+551140000000">(11) 4000-0000</a></li>' +
      "<li>" + CT_ICO.mail + "<span>contato@fallscar.com.br</span></li>" +
      '<li>' + CT_ICO.chat + '<button type="button" data-abrir-chat>Falar no chat</button></li></ul></div></div>' +
      '<div class="ft-bottom"><p>© 2026 Falls Car · protótipo acadêmico' + rf("RNF16") + "</p>" +
      '<p class="ft-scam">' + icon("shield", 15) + "<span>Nunca pedimos senha nem depósito em conta pessoal." + rf("RF61") + "</span></p>" +
      '<nav aria-label="Links legais"><a href="#/termos">Termos de uso</a><a href="#/privacidade">Privacidade</a><a href="#/admin">Área da empresa</a></nav></div>' +
      "</div></footer>";
  };

  /* ---------- Movimento: revelação ao rolar, cartões com profundidade, rolagem suave ---------- */
  FC.motion = (function () {
    var reduz = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    var fino = !!(window.matchMedia && matchMedia("(pointer: fine)").matches);
    var REVELA = [".sx-head", ".svc-card", ".car-card", ".car-more", ".how-step", ".how-media", ".city-card", ".faq__item",
      ".page-head", ".box", ".veh", ".card", ".fleet-card", ".tabs", ".chips", ".lj-item", ".lj-mapa", ".ft-top", ".ft-mid > *", ".ft-bottom"].join(",");
    var FORA = ".vhero, .modal, #modal, .chat, .demo-bar, .vnav-wrap, .header";
    var io = null, ultimo = null;
    function revela(lista) {
      lista.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
      lista.forEach(function (el, i) {
        var d = Math.min(i, 7) * 85;
        el.style.setProperty("--rv-d", d + "ms");
        el.classList.add("is-in");
        setTimeout(function () { el.classList.remove("rv", "is-in", "rv--clip"); el.style.removeProperty("--rv-d"); }, 1400 + d);
      });
    }
    function prepara(root) {
      if (reduz || !("IntersectionObserver" in window)) return;
      if (!io) io = new IntersectionObserver(function (es) {
        var entra = [];
        es.forEach(function (e) { if (e.isIntersecting) { entra.push(e.target); io.unobserve(e.target); } });
        if (entra.length) revela(entra);
      }, { rootMargin: "0px 0px -4% 0px", threshold: 0.06 });
      $$(REVELA, root).forEach(function (el) {
        if (el.closest(FORA) || (el.parentElement && el.parentElement.closest(".rv"))) return;
        el.classList.add("rv"); if (el.classList.contains("how-media")) el.classList.add("rv--clip");
        io.observe(el);
      });
    }
    /* cartões com inclinação 3D e brilho que segue o mouse */
    var TILT = ".svc-card, .how-step, .city-card, .car-card__img", tEl = null, tEv = null, tRaf = 0;
    function solta(el) { el.classList.remove("is-tilting"); el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); }
    function inclina() {
      tRaf = 0; var e = tEv; if (!e) return;
      var el = e.target && e.target.closest ? e.target.closest(TILT) : null;
      if (el !== tEl) { if (tEl) solta(tEl); tEl = el; }
      if (!el) return;
      var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.classList.add("is-tilting");
      el.style.setProperty("--rx", ((0.5 - y) * 6).toFixed(2) + "deg");
      el.style.setProperty("--ry", ((x - 0.5) * 8).toFixed(2) + "deg");
      el.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
      el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
    }
    if (!reduz && fino) {
      document.addEventListener("pointermove", function (e) { if (e.pointerType !== "mouse") return; tEv = e; if (!tRaf) tRaf = requestAnimationFrame(inclina); }, { passive: true });
      document.addEventListener("pointerout", function (e) { if (!e.relatedTarget && tEl) { solta(tEl); tEl = null; } }, { passive: true });
    }
    /* rolagem suave da roda do mouse (interpolação a cada quadro) */
    var sc = { cur: 0, tgt: 0, raf: 0, last: 0, t: 0 };
    function maxY() { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); }
    function rolaDentro(el, dy) {
      while (el && el.nodeType === 1 && el !== document.body && el !== document.documentElement) {
        var s = getComputedStyle(el);
        if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) {
          if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
        }
        el = el.parentElement;
      }
      return false;
    }
    function quadro(ts) {
      var dt = sc.t ? Math.min(250, ts - sc.t) : 16.7; sc.t = ts;
      if (Math.abs(window.scrollY - sc.last) > 4) { sc.raf = 0; sc.t = 0; return; } // usuário arrastou a barra: solta
      var d = sc.tgt - sc.cur;
      if (Math.abs(d) < 0.5) { sc.cur = sc.tgt; window.scrollTo(0, sc.cur); sc.raf = 0; sc.t = 0; return; }
      sc.cur += d * (1 - Math.pow(1 - 0.085, dt / 16.7));
      window.scrollTo(0, sc.cur); sc.last = window.scrollY;
      sc.raf = requestAnimationFrame(quadro);
    }
    function para() { if (sc.raf) cancelAnimationFrame(sc.raf); sc.raf = 0; sc.t = 0; }
    if (!reduz && fino) {
      document.documentElement.classList.add("has-smooth");
      window.addEventListener("wheel", function (e) {
        if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;
        var m = document.getElementById("modal"); if (m && !m.hidden) return;
        var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
        if (!dy || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        if (rolaDentro(e.target, dy) || (e.target.closest && e.target.closest("select, iframe, .chat, .vnav__menu"))) return;
        e.preventDefault();
        if (!sc.raf) { sc.cur = sc.tgt = window.scrollY; sc.last = window.scrollY; }
        sc.tgt = Math.max(0, Math.min(maxY(), sc.tgt + dy));
        if (!sc.raf) sc.raf = requestAnimationFrame(quadro);
      }, { passive: false });
    }
    /* parallax do vídeo da hero e barra clara que ganha corpo ao rolar */
    var pRaf = 0;
    function rolou() {
      pRaf = 0; var y = window.scrollY;
      var v = document.querySelector(".vhero__video"), p = document.querySelector(".vhero__poster");
      if (v && y < 1400) { var t = "0 " + (y * 0.28).toFixed(1) + "px"; v.style.translate = t; if (p) p.style.translate = t; }
      var n = document.querySelector(".vnav-wrap--light"); if (n) n.classList.toggle("is-scrolled", y > 8);
      if (io && y + window.innerHeight >= document.documentElement.scrollHeight - 4) { // fim da página: revela o que restou na tela
        var resto = $$(".rv:not(.is-in)").filter(function (el) { return el.getBoundingClientRect().top < window.innerHeight; });
        resto.forEach(function (el) { io.unobserve(el); });
        if (resto.length) revela(resto);
      }
    }
    window.addEventListener("scroll", function () { if (!pRaf) pRaf = requestAnimationFrame(rolou); }, { passive: true });
    /* menu do celular e idioma: fecham ao clicar fora */
    document.addEventListener("click", function (e) {
      var b = e.target.closest(".vnav__burger");
      if (b) { var menu = document.getElementById(b.getAttribute("aria-controls")); var abre = b.getAttribute("aria-expanded") !== "true"; b.setAttribute("aria-expanded", String(abre)); if (menu) menu.hidden = !abre; return; }
      $$(".vnav__burger[aria-expanded=true]").forEach(function (x) { var mm = document.getElementById(x.getAttribute("aria-controls")); if (mm && !mm.contains(e.target)) { x.setAttribute("aria-expanded", "false"); mm.hidden = true; } });
      $$(".vnav__lang[open]").forEach(function (l) { if (!l.contains(e.target)) l.open = false; });
    });
    var OLHO = { frota: "Nossa frota", lojas: "Nossas lojas", ajuda: "Central de ajuda", conta: "Minha conta", veiculos: "Resultados da busca", reserva: "Reserva em 5 etapas", vantagens: "Serviços", produto: "Para motoristas de app", consultar: "Minhas reservas", checkin: "Check-in online", termos: "Documentos", privacidade: "Documentos" };
    return {
      depois: function (admin) {
        var view = document.getElementById("view"), app = document.getElementById("app");
        var rota = (location.hash.replace(/^#\/?/, "").split(/[?\/]/)[0]) || "inicio";
        var tt = !admin && view ? view.querySelector(".page-head > div:first-child > :first-child, .page > h1") : null;
        if (tt && OLHO[rota] && !tt.parentElement.querySelector(".eyebrow")) tt.insertAdjacentHTML("beforebegin", '<span class="eyebrow">' + OLHO[rota] + "</span>");
        rolou();
        if (admin || location.hash === ultimo) return;
        ultimo = location.hash;
        para();
        if (view && !reduz) { view.classList.add("view-in"); setTimeout(function () { view.classList.remove("view-in"); }, 1800); }
        prepara(app);
      }
    };
  })();
})();
