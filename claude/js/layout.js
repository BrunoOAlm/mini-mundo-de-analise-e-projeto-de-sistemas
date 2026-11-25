/* Falls Car — interface base: roteador, layout, modal, avisos */
(function () {
  "use strict";
  var FC = window.FC, $ = FC.$, $$ = FC.$$, esc = FC.esc, icon = FC.icon, rf = FC.rf;

  FC.routes = {};
  FC.route = function (name, fn) { FC.routes[name] = fn; };
  FC.parseHash = function () {
    var h = (location.hash || "#/").slice(1);
    var q = h.indexOf("?");
    var path = (q >= 0 ? h.slice(0, q) : h) || "/";
    var params = {};
    if (q >= 0) h.slice(q + 1).split("&").forEach(function (kv) { if (!kv) return; var p = kv.split("="); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ""); });
    var parts = path.split("/").filter(Boolean);
    return { path: path, parts: parts, params: params };
  };
  FC.go = function (hash) { if (location.hash === hash) FC.render(); else location.hash = hash; };

  /* ---------- Duas pastas: figma/ (página inicial) e claude/ (resto do site) ---------- */
  FC.PAGINA = window.FC_PAGINA || "site";
  FC.URL_INICIO = FC.PAGINA === "inicio" ? "index.html" : "../figma/index.html";
  FC.URL_SITE = FC.PAGINA === "inicio" ? "../claude/index.html" : "index.html";
  FC.guardarEstado = function () {
    try { sessionStorage.setItem("fallscar-estado", JSON.stringify({ busca: FC.busca, ponto: FC.ponto, filtros: FC.filtros })); } catch (e) { }
  };
  FC.estadoSalvo = (function () {
    try { var s = JSON.parse(sessionStorage.getItem("fallscar-estado") || "null"); sessionStorage.removeItem("fallscar-estado"); return s; } catch (e) { return null; }
  })();
  FC.qs = function (o) { return Object.keys(o).filter(function (k) { return o[k] != null && o[k] !== ""; }).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(o[k]); }).join("&"); };

  /* ---------- Modal e avisos ---------- */
  var lastFocus = null;
  FC.modal = function (title, html, opts) {
    opts = opts || {};
    lastFocus = document.activeElement;
    $("#modal-title").textContent = title;
    $("#modal-body").innerHTML = html;
    $(".modal__box").classList.toggle("wide", !!opts.wide);
    $("#modal").hidden = false;
    var f = $("#modal-body [autofocus]") || $("[data-close-modal]", $("#modal"));
    if (f) f.focus();
    return $("#modal-body");
  };
  FC.closeModal = function () { $("#modal").hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  document.addEventListener("click", function (e) {
    if (e.target.id === "modal" || e.target.closest("[data-close-modal]")) FC.closeModal();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("#modal").hidden) FC.closeModal(); });
  FC.confirmar2 = function (title, html, okLabel, onOk, danger) {
    var b = FC.modal(title, html + '<div class="row" style="justify-content:flex-end;margin-top:20px"><button class="btn btn--ghost" type="button" data-close-modal>Voltar</button><button class="btn ' + (danger ? "btn--danger" : "btn--primary") + '" type="button" id="cf-ok">' + esc(okLabel) + "</button></div>");
    $("#cf-ok", b).addEventListener("click", function () { FC.closeModal(); onOk(); });
  };
  FC.toast = function (msg, kind) {
    var t = document.createElement("div");
    t.className = "toast" + (kind ? " toast--" + kind : "");
    t.setAttribute("role", kind === "bad" ? "alert" : "status");
    t.textContent = msg;
    $("#toasts").appendChild(t);
    setTimeout(function () { t.remove(); }, 5200);
  };

  /* ---------- Erros por campo (RF35) ---------- */
  FC.limparErros = function (root) { $$(".fld.has-error", root).forEach(function (f) { f.classList.remove("has-error"); var e = $(".err", f); if (e) e.remove(); }); };
  FC.erroCampo = function (el, msg) {
    var f = el.closest(".fld"); if (!f) return;
    f.classList.add("has-error");
    var e = document.createElement("span"); e.className = "err"; e.id = (el.id || el.name) + "-err"; e.textContent = msg;
    f.appendChild(e); el.setAttribute("aria-describedby", e.id); el.setAttribute("aria-invalid", "true");
  };
  FC.fld = function (label, inner, hint, cls) {
    return '<label class="fld ' + (cls || "") + '"><span>' + label + "</span>" + inner + (hint ? "<small>" + hint + "</small>" : "") + "</label>";
  };

  /* ---------- Layout ---------- */
  function demoBar() {
    return '<div class="demo-bar" role="note"><div class="container">' +
      "<span>Protótipo acadêmico" + rf("RNF05", "RNF36") +
      (FC.storageOk ? "" : " · <strong>armazenamento bloqueado: dados só nesta sessão</strong>") + "</span>" +
      '<details class="demo-menu"><summary>Demo</summary><div class="demo-menu__panel">' +
      '<label class="switch"><input type="checkbox" id="toggle-rf"' + (document.body.classList.contains("show-rf") ? " checked" : "") + "> Mostrar requisitos (RF/RNF)</label>" +
      '<button type="button" class="btn btn--link" id="reset-db">Restaurar base de demonstração</button>' +
      '<a class="link" href="#/admin">Área da empresa</a></div></details></div></div>';
  }
  var PRODUTOS = [["#/", "Aluguel de carros"], ["#/frota?grupo=MOT1", "Motos"], ["#/produto/app", "Para motoristas de app"]];
var US = '<svg viewBox="0 0 22 22" aria-hidden="true"><rect width="22" height="22" fill="#fff"/><g fill="#b22234"><rect y="0" width="22" height="1.7"/><rect y="3.4" width="22" height="1.7"/><rect y="6.8" width="22" height="1.7"/><rect y="10.2" width="22" height="1.7"/><rect y="13.6" width="22" height="1.7"/><rect y="17" width="22" height="1.7"/><rect y="20.4" width="22" height="1.6"/></g><rect width="10" height="11.9" fill="#3c3b6e"/><g fill="#fff"><circle cx="2.5" cy="2.5" r=".7"/><circle cx="5" cy="2.5" r=".7"/><circle cx="7.5" cy="2.5" r=".7"/><circle cx="3.75" cy="5" r=".7"/><circle cx="6.25" cy="5" r=".7"/><circle cx="2.5" cy="7.5" r=".7"/><circle cx="5" cy="7.5" r=".7"/><circle cx="7.5" cy="7.5" r=".7"/><circle cx="3.75" cy="10" r=".7"/><circle cx="6.25" cy="10" r=".7"/></g></svg>';
  var BR = '<svg viewBox="0 0 22 22" aria-hidden="true"><rect width="22" height="22" fill="#009c3b"/><path d="M11 3.5 19.5 11 11 18.5 2.5 11z" fill="#ffdf00"/><circle cx="11" cy="11" r="4.2" fill="#002776"/></svg>';
  var ES = '<svg viewBox="0 0 22 22" aria-hidden="true"><rect width="22" height="22" fill="#c60b1e"/><rect y="5.5" width="22" height="11" fill="#ffc400"/>' +
    '<g transform="translate(1.2 0)">' +
    '<rect x="3.4" y="8.6" width="1.1" height="5.2" fill="#b7b7b7"/><rect x="3.4" y="10.2" width="1.1" height=".6" fill="#ad1519"/><rect x="3.1" y="13.6" width="1.7" height=".5" fill="#8a6d00"/><rect x="3.1" y="8.2" width="1.7" height=".5" fill="#8a6d00"/>' +
    '<rect x="9.5" y="8.6" width="1.1" height="5.2" fill="#b7b7b7"/><rect x="9.5" y="10.2" width="1.1" height=".6" fill="#ad1519"/><rect x="9.2" y="13.6" width="1.7" height=".5" fill="#8a6d00"/><rect x="9.2" y="8.2" width="1.7" height=".5" fill="#8a6d00"/>' +
    '<path d="M5.2 8.6h3.6v3.2a1.8 1.8 0 0 1-3.6 0z" fill="#ad1519" stroke="#8a6d00" stroke-width=".25"/>' +
    '<path d="M7 8.6h1.8v1.7H7zM5.2 10.3H7v1.6l-.1.9a1.8 1.8 0 0 1-1.7-1.1z" fill="#e8c200"/>' +
    '<circle cx="7" cy="10.4" r=".45" fill="#2a3d8f"/>' +
    '<path d="M5.4 8.3h3.2l.3-1.3-.75.45-.55-.8-.6.65-.6-.65-.55.8-.75-.45z" fill="#e8c200" stroke="#8a6d00" stroke-width=".2"/>' +
    '</g></svg>';
  function langBtns() {
    var l = FC.i18n ? FC.i18n.lang() : "pt";
    return '<div class="lang" role="group" aria-label="Idioma" data-notr>' +
      [["pt", BR, "Português"], ["en", US, "English"], ["es", ES, "Español"]].map(function (f) {
        return '<button type="button" class="lang__btn" data-lang="' + f[0] + '" aria-pressed="' + (l === f[0]) + '" title="' + f[2] + '">' + f[1] + '<span class="visually-hidden">' + f[2] + "</span></button>";
      }).join("") + "</div>";
  }
  function topbar() {
    var h = location.hash || "#/";
    var ativo = h.indexOf("#/produto/") === 0 ? h : h.indexOf("grupo=MOT") >= 0 ? "#/frota?grupo=MOT1" : "#/";
    return '<div class="topbar"><div class="container"><nav aria-label="Produtos"><ul class="topbar__prods">' + PRODUTOS.map(function (p) {
      return '<li><a href="' + p[0] + '"' + (p[0] === ativo ? ' aria-current="page"' : "") + ">" + p[1] + "</a></li>";
    }).join("") + "</ul></nav>" +
      '<div class="topbar__end">' + langBtns() + "</div></div></div>";
  }
  FC.langBtns = langBtns;
  var TABS = [["#/", "Reservar"], ["#/frota", "Frota"], ["#/lojas", "Lojas"], ["#/vantagens/retirada", "Serviços"], ["#/ajuda", "Ajuda"]];
  function header(active, admin) {
    var c = FC.clienteAtual(), u = FC.adminAtual();
    var right = admin
      ? (u ? '<span class="user-chip small">' + icon("users", 16) + esc(u.nome) + " · " + FC.PERFIS[u.perfil] + '</span><button class="btn btn--secondary-on-dark btn--sm" id="admin-sair" type="button">' + icon("logout", 14) + "Sair</button>" : "") + '<a class="header__admin" href="#/">Ir para o site</a>'
      : '<a class="header__admin" href="' + (c ? "#/conta" : "#/consultar") + '">Minhas reservas</a>' +
        (c ? '<a class="btn btn--secondary-on-dark btn--sm" href="#/conta">' + icon("account", 16) + esc(c.nome.split(" ")[0]) + "</a>" : '<a class="btn login-btn btn--sm" href="#/conta">Entrar/Cadastrar</a>');
    return (admin ? "" : topbar()) + '<header class="header"><div class="container"><div class="header__top">' +
      '<a class="logo" href="#/" aria-label="Falls Car — página inicial"><svg class="logo__mark" viewBox="0 0 1362 375" aria-hidden="true"><use href="#i-logo"/></svg><span class="logo__text">Falls<b class="logo-car">Car</b></span></a>' +
      (admin ? "" : '<nav class="primary-nav" aria-label="Seções do site">' + TABS.map(function (t) {
        var is = t[0] === active;
        return '<a class="nav-tab' + (is ? " is-active" : "") + '" href="' + t[0] + '"' + (is ? ' aria-current="page"' : "") + "><span>" + t[1] + "</span></a>";
      }).join("") + "</nav>") +
      '<nav aria-label="Conta"><div class="header__right">' + right + "</div></nav></div>" +
      "</div></header>";
  }
  function footer() { return FC.rodape(); }

  /* ---------- Atendimento: chat simulado com respostas prontas ---------- */
  function chatResposta(k) {
    var cfg = FC.cfg();
    var faq = function (re) { var f = (FC.FAQ || []).filter(function (x) { return re.test(x[0]); })[0]; return f ? esc(f[1]) : ""; };
    return {
      reserva: ["Quero fazer uma reserva", 'Escolha loja e datas na busca. Você reserva o carro exato e paga antes. <a href="#/" data-fechar-chat>Ir para a busca</a>'],
      cancelar: ["Como cancelo?", "Em Minhas reservas › Detalhes › Cancelar. Sem multa até " + cfg.cancelamento.semMultaAteHoras + " h antes da retirada; depois, multa de " + cfg.cancelamento.multaPct + '%. <a href="#/conta" data-fechar-chat>Minhas reservas</a>'],
      documentos: ["Quais documentos levo?", faq(/documentos/i) || "CNH original e válida e documento com foto do titular."],
      whatsapp: ["Falar no WhatsApp", 'Atendimento humano pelo WhatsApp <a href="https://wa.me/5511900000000" target="_blank" rel="noopener">+55 11 90000-0000</a>.'],
      humano: ["Abrir chamado", 'Abra um chamado com protocolo na Ajuda. <a href="#/ajuda" data-fechar-chat>Ir para a Ajuda</a>']
    }[k];
  }
  FC.chatInit = function () {
    if ($("#chat")) return;
    var fab = document.createElement("button");
    fab.type = "button"; fab.className = "chat-fab"; fab.id = "chat-fab"; fab.setAttribute("aria-expanded", "false"); fab.setAttribute("aria-controls", "chat");
    fab.innerHTML = icon("chat", 20) + "<span>Atendimento</span>";
    var box = document.createElement("section");
    box.className = "chat"; box.id = "chat"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Atendimento Falls Car");
    box.innerHTML = '<div class="chat__head"><p>Atendimento Falls Car<small>Respostas automáticas · simulado</small></p><button type="button" class="chat__close" aria-label="Fechar atendimento">' + icon("close", 16) + "</button></div>" +
      '<div class="chat__log" id="chat-log" aria-live="polite"><p class="msg msg--bot">Olá. Escolha um assunto.</p></div>' +
      '<div class="chat__quick">' + [["reserva", "Reserva"], ["cancelar", "Cancelamento"], ["documentos", "Documentos"], ["whatsapp", "WhatsApp"], ["humano", "Abrir chamado"]].map(function (q) { return '<button type="button" data-q="' + q[0] + '">' + q[1] + "</button>"; }).join("") + "</div>";
    document.body.appendChild(box); document.body.appendChild(fab);
    function abrir(on) {
      box.classList.toggle("is-open", on); fab.setAttribute("aria-expanded", String(on));
      if (on) $(".chat__quick button", box).focus(); else fab.focus();
    }
    FC.abrirChat = function () { abrir(true); };
    fab.addEventListener("click", function () { abrir(!box.classList.contains("is-open")); });
    $(".chat__close", box).addEventListener("click", function () { abrir(false); });
    box.addEventListener("keydown", function (e) { if (e.key === "Escape") abrir(false); });
    box.addEventListener("click", function (e) {
      if (e.target.closest("[data-fechar-chat]")) { box.classList.remove("is-open"); fab.setAttribute("aria-expanded", "false"); return; }
      var q = e.target.closest("[data-q]"); if (!q) return;
      var r = chatResposta(q.dataset.q), log = $("#chat-log", box);
      log.insertAdjacentHTML("beforeend", '<p class="msg msg--me">' + esc(r[0]) + '</p><p class="msg msg--bot">' + r[1] + "</p>");
      log.scrollTop = log.scrollHeight;
    });
  };

  FC.render = function () {
    // Falls Club e pontos foram retirados do site
    if (FC.cfg().fidelidade) { FC.cfg().fidelidade = false; FC.save(); }
    FC.limparBloqueios();
    if (!$("#modal").hidden && FC._lastHash !== location.hash) $("#modal").hidden = true;
    FC._lastHash = location.hash;
    var r = FC.parseHash();
    var admin = r.parts[0] === "admin";
    var key = admin ? "admin" : (r.parts[0] || "inicio");
    // Página inicial fica em figma/; o resto do site fica em claude/. Troca de pasta levando a busca junto.
    if (FC.PAGINA === "inicio" ? key !== "inicio" : (key === "inicio" || !FC.routes[key])) {
      FC.guardarEstado();
      location.replace((FC.PAGINA === "inicio" ? FC.URL_SITE : FC.URL_INICIO) + (key === "inicio" ? "" : location.hash));
      return;
    }
    var fn = FC.routes[key];
    var app = $("#app");
    var activeTab = "#/" + (r.parts[0] === "veiculos" || r.parts[0] === "reserva" ? "" : (r.parts[0] || ""));
    if (r.parts[0] === "conta") activeTab = "";
    document.body.classList.toggle("is-admin", admin); FC.chatInit();
    var home = !admin && fn === FC.routes.inicio;
    document.body.classList.toggle("is-home", home);
    app.innerHTML = (admin ? demoBar() : "") + (home ? "" : admin ? header(activeTab, admin) : FC.siteNav(activeTab)) + '<main id="view" tabindex="-1"></main>' + (admin ? "" : footer());
    fn($("#view"), r);
    bindLayout();
    FC.motion.depois(admin);
    if (!FC._firstRender) { $("#view").focus({ preventScroll: true }); window.scrollTo(0, 0); }
    FC._firstRender = false;
  };
  FC._firstRender = true;
  document.addEventListener("click", function (e) {
    var m = document.querySelector(".demo-menu[open]");
    if (m && !m.contains(e.target)) m.open = false;
  });

  function bindLayout() {
    $$("[data-lang]").forEach(function (b) { b.addEventListener("click", function () { FC.i18n.set(b.dataset.lang); }); });
    var t = $("#toggle-rf");
    if (t) t.addEventListener("change", function () { document.body.classList.toggle("show-rf", t.checked); });
    var rs = $("#reset-db");
    if (rs) rs.addEventListener("click", function () {
      FC.confirmar2("Restaurar base de demonstração", "<p>Todas as reservas, cadastros e alterações feitos nesta demonstração serão substituídos pela base inicial.</p>", "Restaurar", function () { FC.resetDB(); FC.toast("Base de demonstração restaurada.", "ok"); FC.go("#/"); }, true);
    });
    var sair = $("#admin-sair");
    if (sair) sair.addEventListener("click", function () { FC.audit("Logout administrativo", "sessão", "", "ok"); FC.db.sessao.adminId = null; FC.save(); FC.go("#/admin"); });
    var pc = $("#pref-cookies");
    if (pc) pc.addEventListener("click", function (e) { e.preventDefault(); FC.db.cookies = null; FC.save(); cookieBanner(true); });
    $$("[data-loja-app]").forEach(function (b) { b.addEventListener("click", function () { FC.toast("App na " + b.dataset.lojaApp + " em breve."); }); });
    $$("[data-social]").forEach(function (b) { b.addEventListener("click", function () { FC.toast("Perfil da Falls Car no " + b.dataset.social + " em breve."); }); });
    $$("[data-abrir-chat]").forEach(function (b) { b.addEventListener("click", function () { FC.abrirChat(); }); });
    var nf = $("#news-form");
    if (nf) {
      nf.addEventListener("submit", function (e) {
        e.preventDefault(); FC.limparErros(nf);
        var em = $("#news-email").value.trim();
        if (!FC.emailValido(em)) { FC.erroCampo($("#news-email"), "Informe um e-mail válido."); return; }
        if (FC.db.newsletter.indexOf(em) < 0) FC.db.newsletter.push(em);
        FC.outbox(em, "e-mail", "newsletter", "Inscrição confirmada", "Você se inscreveu na newsletter Falls Car. Para cancelar, use o link do rodapé.");
        FC.audit("Inscrição em newsletter", FC.mascaraDoc(em), "consentimento próprio", "ok"); FC.save(); FC.toast("Inscrição feita. Você pode cancelar quando quiser.", "ok");
      });
      $("#news-cancel").addEventListener("click", function () {
        var em = $("#news-email").value.trim();
        FC.db.newsletter = FC.db.newsletter.filter(function (x) { return x !== em; });
        FC.save(); FC.toast("Inscrição cancelada para este e-mail.");
      });
    }
  }

  /* ---------- Cookies (RNF19) ---------- */
  function cookieBanner(force) {
    var old = $("#cookie-banner"); if (old) old.remove();
    if (FC.db.cookies && !force) return;
    var d = document.createElement("div");
    d.className = "cookie"; d.id = "cookie-banner"; d.setAttribute("role", "dialog"); d.setAttribute("aria-labelledby", "ck-t");
    d.innerHTML = '<h2 id="ck-t">Cookies' + rf("RNF19", "RNF08") + "</h2><p>Só o essencial até você escolher.</p>" +
      '<div class="cookie__actions"><button class="btn btn--primary btn--sm" type="button" data-ck="aceitar">Aceitar</button><button class="btn btn--ghost btn--sm" type="button" data-ck="essencial">Só o essencial</button><button class="btn btn--link small" type="button" data-ck="pref">Preferências</button></div>';
    document.body.appendChild(d);
    function salvar(an) {
      FC.db.cookies = { essencial: true, analiticos: an, data: new Date().toISOString() };
      FC.audit("Preferência de cookies registrada", "cookies", "", an ? "com medição" : "só essencial", "visitante"); FC.save(); d.remove();
    }
    d.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ck]"); if (!b) return;
      if (b.dataset.ck !== "pref") { salvar(b.dataset.ck === "aceitar"); return; }
      var pref = FC.db.cookies || { analiticos: false };
      var m = FC.modal("Preferências de cookies", '<p class="small">Essencial: mantém sua sessão e sua reserva. Sempre ativo.</p>' +
        '<label class="chk" style="margin-top:12px"><input type="checkbox" id="ck-an"' + (pref.analiticos ? " checked" : "") + "> Medição de uso anônima (opcional)</label>" +
        '<div class="row" style="justify-content:flex-end;margin-top:20px"><button class="btn btn--primary" type="button" id="ck-ok">Salvar</button></div>');
      $("#ck-ok", m).addEventListener("click", function () { var an = $("#ck-an", m).checked; FC.closeModal(); salvar(an); });
    });
  }

  /* ---------- Componentes ---------- */
  FC.priceBox = function (preco, opts) {
    opts = opts || {};
    return '<ul class="price-lines">' + preco.itens.map(function (i) {
      return '<li class="' + (i.valor < 0 ? "neg" : "") + '"><span>' + esc(i.rotulo) + "</span><span>" + FC.brl(i.valor) + "</span></li>";
    }).join("") + '</ul><div class="price-total"><span>' + (preco.semanal ? "Total do plano" : "Total a pagar") + "</span><span>" + FC.brl(preco.total) + "</span></div>" +
      (preco.semanal ? '<div class="price-sep"><span>Hoje: 1ª de ' + preco.semanal.semanas + " semanas (cobrança antecipada)</span><span>" + FC.brl(preco.agora) + '</span></div><p class="small muted" style="margin-top:4px">As demais semanas são cobradas antes de cada uma começar (simulado). Caução parcelada em 4x.</p>' : "") +
      (preco.caucao ? '<div class="price-sep"><span>Caução (separada, não cobrada no total)' + rf("RF30") + "</span><span>" + FC.brl(preco.caucao) + "</span></div>" : "") +
      (opts.nota === false ? "" : '<p class="small muted" style="margin-top:8px">Valores discriminados conforme tabela ' + (preco.tarifaVersao ? "v" + preco.tarifaVersao : "") + " vigente. Tabelas e políticas de demonstração aguardam aprovação após pesquisa." + rf("RF16", "RN07") + "</p>");
  };
  FC.vehImg = function (v, cls) {
    var src = v.foto ? FC.fotoSrc(v.foto) : null;
    return src ? '<img class="' + (cls || "veh__img") + '" src="' + src + '" alt="' + esc(v.modelo) + '" loading="lazy">'
      : '<div class="veh__ph" role="img" aria-label="' + esc(v.modelo) + '">' + icon(v.tipo === "moto" ? "moto" : "car", 56) + "</div>";
  };
  FC.fotoSrc = function (f) { return (FC.PAGINA === "inicio" ? "../claude/" : "") + "assets/carros/" + f + ".jpg"; };
  FC.badgesVeiculo = function (v) {
    var b = [];
    b.push('<span class="badge">' + icon("person", 14) + v.lugares + " lugares</span>");
    if (v.malas) b.push('<span class="badge">' + icon("bags", 14) + v.malas + (v.malas === 1 ? " mala" : " malas") + "</span>");
    b.push('<span class="badge">' + icon("gear", 14) + v.cambio + "</span>");
    if (v.ar) b.push('<span class="badge">' + icon("snow", 14) + "Ar-condicionado</span>");
    if (v.cilindrada) b.push('<span class="badge">' + icon("moto", 14) + v.cilindrada + " cc</span>");
    v.acessibilidade.filter(function (a) { return a !== "Câmbio automático"; }).forEach(function (a) { b.push('<span class="badge">' + icon("access", 14) + esc(a) + "</span>"); });
    return b.join("");
  };
  FC.horarioTexto = function (l) {
    var dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    var all24 = [0, 1, 2, 3, 4, 5, 6].every(function (d) { return l.horario[d] && l.horario[d][0] === "00:00" && l.horario[d][1] === "23:59"; });
    if (all24) return "Todos os dias, 24 horas";
    var same = [0, 1, 2, 3, 4, 5, 6].every(function (d) { return JSON.stringify(l.horario[d]) === JSON.stringify(l.horario[1]); });
    if (same) return "Todos os dias, " + l.horario[1][0] + "–" + l.horario[1][1];
    return [1, 2, 3, 4, 5, 6, 0].map(function (d) { return dias[d] + " " + (l.horario[d] ? l.horario[d][0] + "–" + l.horario[d][1] : "fechada"); }).join(" · ");
  };
  FC.lojaOptions = function (sel, filtro) {
    var porUF = {};
    FC.db.lojas.filter(function (l) { return l.ativa && (!filtro || filtro(l)); }).forEach(function (l) { (porUF[l.uf] = porUF[l.uf] || []).push(l); });
    return Object.keys(porUF).sort().map(function (uf) {
      return '<optgroup label="' + uf + '">' + porUF[uf].map(function (l) { return '<option value="' + l.id + '"' + (l.id === sel ? " selected" : "") + ">" + esc(l.nome) + "</option>"; }).join("") + "</optgroup>";
    }).join("");
  };

  window.addEventListener("hashchange", FC.render);
  document.addEventListener("DOMContentLoaded", FC.render);
  setInterval(function () { var before = JSON.stringify(FC.db.agenda.length); FC.limparBloqueios(); }, 30000);
})();
