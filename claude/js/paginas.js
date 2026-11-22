/* Falls Car — cliente: lojas, frota, consulta, conta, ajuda */
(function () {
  "use strict";
  var FC = window.FC, $ = FC.$, $$ = FC.$$, esc = FC.esc, icon = FC.icon, rf = FC.rf, brl = FC.brl;


  /* ---------- Lojas (RF12, RF54): lista compacta + Google Maps ---------- */
  var lojaFiltro = { q: "", uf: "", cidade: "", sel: "" };
  var IC_AVIAO = '<svg viewBox="0 0 24 24" style="fill:none" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>';
  var IC_PREDIO = '<svg viewBox="0 0 24 24" style="fill:none" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M3 21h18M8 7h4M8 11h4M8 15h4"/></svg>';
  var IC_ROTA = '<svg viewBox="0 0 24 24" style="fill:none" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 21 3l-8 18-2-8z"/></svg>';
  FC.mapaUrl = function (l) { return "https://maps.google.com/maps?q=" + encodeURIComponent(l.mapa || (l.endereco + ", " + l.cidade + " - " + l.uf)) + "&hl=pt-BR&z=15&output=embed"; };
  FC.rotaUrl = function (l) { return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(l.mapa || (l.endereco + ", " + l.cidade + " - " + l.uf)); };
  // horário agrupando dias seguidos iguais: "Seg–Sex 08:00–20:00 · Sáb 08:00–14:00 · Dom fechada"
  function horaCurta(l) {
    var t = FC.horarioTexto(l);
    if (t === "Todos os dias, 24 horas") return "24 horas";
    if (t.indexOf("Todos os dias, ") === 0) return t.replace("Todos os dias, ", "");
    var nomes = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"], ordem = [1, 2, 3, 4, 5, 6, 0], grupos = [];
    ordem.forEach(function (d) {
      var h = l.horario[d] ? l.horario[d][0] + "–" + l.horario[d][1] : "fechada", g = grupos[grupos.length - 1];
      if (g && g.h === h) g.fim = d; else grupos.push({ ini: d, fim: d, h: h });
    });
    return grupos.map(function (g) { return nomes[g.ini] + (g.fim !== g.ini ? "–" + nomes[g.fim] : "") + " " + g.h; }).join(" · ");
  }
  function abertaAgora(l) { return FC.validaHorario(l, new Date()).ok; }
  function infoLoja(l, km) {
    var exc = (l.excecoes || []).map(function (e) { return FC.dataBR(e.data + "T12:00:00") + ": " + (e.fechado ? "fechada" : "horário especial") + " (" + e.motivo + ")"; }).join("; ");
    var wa = "https://wa.me/" + l.whatsapp.replace(/\D/g, "");
    return '<div class="lj-info__top"><span class="lj-ico">' + (l.tipo === "aeroporto" ? IC_AVIAO : IC_PREDIO) + "</span><div><h2 class=\"lj-info__nome\">" + esc(l.nome) + "</h2>" +
      '<p class="lj-info__end">' + esc(l.endereco) + " · " + esc(l.cidade) + "/" + l.uf + (km != null ? " · " + km.toFixed(1) + " km" : "") + "</p></div></div>" +
      '<ul class="lj-info__dados">' +
      "<li>" + icon("clock", 16) + "<span>" + esc(horaCurta(l) === "24 horas" ? "Aberta 24 horas, todos os dias" : horaCurta(l)) + (exc ? '<small class="muted"> · ' + esc(exc) + "</small>" : "") + "</span></li>" +
      '<li>' + icon("phone", 16) + '<a href="tel:+55' + l.telefone.replace(/\D/g, "") + '">' + esc(l.telefone) + "</a></li>" +
      '<li>' + icon("chat", 16) + '<a href="' + wa + '" target="_blank" rel="noopener">WhatsApp ' + esc(l.whatsapp) + "</a></li>" +
      "<li>" + icon("info", 16) + "<span>" + esc(l.instrucoes) + "</span></li></ul>" +
      '<div class="lj-info__acoes"><button class="btn btn--primary" type="button" data-res="' + l.id + '">Reservar nesta loja</button><a class="btn btn--ghost" href="' + FC.rotaUrl(l) + '" target="_blank" rel="noopener">' + IC_ROTA + "Como chegar</a></div>";
  }
  FC.route("lojas", function (view, rt) {
    var f = lojaFiltro;
    if (rt && rt.params.cidade) { f.cidade = rt.params.cidade; f.uf = ""; f.q = ""; f.sel = ""; }
    desenha();
    function desenha() {
    var ativas = FC.db.lojas.filter(function (l) { return l.ativa; });
    var ufs = Object.keys(ativas.reduce(function (o, l) { o[l.uf] = 1; return o; }, {})).sort();
    var cidades = Object.keys(ativas.reduce(function (o, l) { o[l.cidade] = 1; return o; }, {}));
    var norm = function (s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); };
    var lista = ativas.filter(function (l) {
      if (f.uf && l.uf !== f.uf) return false;
      if (f.cidade && l.cidade !== f.cidade) return false;
      if (f.q) { var q = norm(f.q); return [l.nome, l.cidade, l.uf, l.endereco, l.id, l.tipo === "aeroporto" ? "aeroporto" : "cidade"].some(function (x) { return norm(x).indexOf(q) >= 0; }); }
      return true;
    }).map(function (l) { return { loja: l, km: FC.ponto ? FC.distKm(FC.ponto, l) : null }; });
    if (FC.ponto) lista.sort(function (a, b) { return a.km - b.km; });
    if (!lista.some(function (x) { return x.loja.id === f.sel; })) f.sel = lista.length ? lista[0].loja.id : "";
    var sel = lista.filter(function (x) { return x.loja.id === f.sel; })[0];
    view.innerHTML = '<div class="container page lj-page"><div class="page-head"><div><span class="eyebrow">Nossas lojas</span><h1 class="t-h2">Lojas' + rf("RF12", "RF54") + "</h1><p>" + ativas.length + " lojas em " + cidades.length + " cidades. Escolha uma para ver no mapa.</p></div></div>" +
      '<div class="lj-bar"><label class="lj-busca">' + icon("search", 18) + '<span class="visually-hidden">Buscar loja</span><input id="lj-q" type="search" value="' + esc(f.q) + '" placeholder="Cidade, aeroporto ou endereço"></label>' +
      '<div class="lj-ufs" role="group" aria-label="Estado"><button type="button" class="lj-uf" data-uf=""' + (!f.uf && !f.cidade ? ' aria-pressed="true"' : "") + ">Todas</button>" +
      ufs.map(function (u) { return '<button type="button" class="lj-uf" data-uf="' + u + '"' + (f.uf === u ? ' aria-pressed="true"' : "") + ">" + u + "</button>"; }).join("") +
      (f.cidade ? '<button type="button" class="lj-uf lj-uf--cidade" data-limpa-cidade aria-pressed="true">' + esc(f.cidade) + " ✕</button>" : "") + "</div>" +
      '<button class="btn btn--ghost lj-perto" type="button" id="lj-geo">' + icon("pin", 16) + "Perto de mim</button></div>" +
      (FC.ponto ? '<p class="small muted lj-nota">Ordenado pela distância em linha reta até ' + esc(FC.ponto.nome) + "." + rf("RN04") + "</p>" : "") +
      (lista.length ? '<div class="lj-grid"><ul class="lj-lista" aria-label="Lojas encontradas" aria-live="polite">' + lista.map(function (x, i) {
        var l = x.loja, ab = abertaAgora(l);
        return '<li class="lj-item' + (l.id === f.sel ? " is-sel" : "") + '"><button type="button" class="lj-item__btn" data-loja="' + l.id + '" aria-pressed="' + (l.id === f.sel) + '">' +
          '<span class="lj-ico">' + (l.tipo === "aeroporto" ? IC_AVIAO : IC_PREDIO) + "</span>" +
          '<span class="lj-item__txt"><strong>' + esc(l.nome) + (FC.ponto && i === 0 ? ' <em class="lj-tag">Mais próxima</em>' : "") + "</strong>" +
          "<small>" + esc(l.endereco) + " · " + esc(l.cidade) + "/" + l.uf + "</small>" +
          '<span class="lj-item__meta"><span class="lj-status' + (ab ? " is-on" : "") + '">' + (ab ? "Aberta agora" : "Fechada agora") + "</span><span>" + esc(horaCurta(l)) + "</span>" + (x.km != null ? "<span>" + x.km.toFixed(1) + " km</span>" : "") + "</span></span>" +
          '<span class="lj-item__seta" aria-hidden="true">' + icon("chevron-right", 16) + "</span></button></li>";
      }).join("") + "</ul>" +
      '<div class="lj-mapa"><div class="lj-mapa__frame"><iframe id="lj-iframe" title="Mapa: ' + esc(sel.loja.nome) + '" src="' + FC.mapaUrl(sel.loja) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>' +
      '<div class="lj-info" id="lj-info">' + infoLoja(sel.loja, sel.km) + "</div></div></div>"
        : '<div class="box lj-vazio"><h3>Nenhuma loja encontrada</h3><p>Tente outra cidade ou limpe a busca.</p><button class="btn btn--ghost" type="button" data-uf="">Ver todas</button></div>') +
      "</div>";
    var raiz = view.firstElementChild;
    var q = $("#lj-q", raiz), t = 0;
    q.addEventListener("input", function () { clearTimeout(t); t = setTimeout(function () { f.q = q.value; f.cidade = ""; desenha(); var n = $("#lj-q", view); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 300); });
    $("#lj-geo", raiz).addEventListener("click", function () { FC.pedirLocalizacao(desenha); });
    raiz.addEventListener("click", function (e) {
      var u = e.target.closest("[data-uf]"); if (u) { f.uf = u.dataset.uf; f.cidade = ""; f.q = ""; f.sel = ""; desenha(); return; }
      if (e.target.closest("[data-limpa-cidade]")) { f.cidade = ""; f.sel = ""; desenha(); return; }
      var r = e.target.closest("[data-res]"); if (r) { FC.busca.loja = r.dataset.res; FC.busca.lojaEscolhida = true; FC.go("#/"); return; }
      var p = e.target.closest("[data-loja]");
      if (p) {
        var x = lista.filter(function (y) { return y.loja.id === p.dataset.loja; })[0]; if (!x) return;
        f.sel = x.loja.id;
        $$(".lj-item", raiz).forEach(function (li) { var b = $(".lj-item__btn", li), on = b.dataset.loja === f.sel; li.classList.toggle("is-sel", on); b.setAttribute("aria-pressed", String(on)); });
        var ifr = $("#lj-iframe", raiz); ifr.src = FC.mapaUrl(x.loja); ifr.title = "Mapa: " + x.loja.nome;
        var info = $("#lj-info", raiz); info.innerHTML = infoLoja(x.loja, x.km); info.classList.remove("is-novo"); void info.offsetWidth; info.classList.add("is-novo");
        if (window.matchMedia("(max-width: 900px)").matches) $(".lj-mapa", raiz).scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    }
  });

  /* ---------- Frota / catálogo (RF55) ---------- */
  FC.route("frota", function (view, rt) {
    var t = FC.tarifaVigente();
    var gsel = rt.params.grupo || "";
    view.innerHTML = '<div class="container page"><div class="page-head"><div><h1 class="t-h2">Frota e preços de referência' + rf("RF55") + "</h1><p>Diárias de referência da tabela vigente (v" + t.versao + "). O total depende das datas, da unidade escolhida, das proteções, acessórios e taxas.</p></div></div>" +
      FC.db.grupos.map(function (g) {
        var units = FC.db.veiculos.filter(function (v) { return v.grupo === g.id && v.ativo; });
        var modelos = {}; units.forEach(function (u) { modelos[u.modelo] = u; });
        return '<section class="box" id="g-' + g.id + '"' + (gsel === g.id ? ' style="box-shadow:0 0 0 2px var(--c-primary)"' : "") + '><div class="row row--between"><div><h2 class="t-h3">' + esc(g.nome) + '</h2><p class="small muted">' + esc(g.descricao) + " · " + units.length + " unidades na frota</p></div><div style=\"text-align:right\"><span class=\"small muted\">A partir de</span><br><strong class=\"t-h3\">" + brl(t.diarias[g.id]) + '</strong><span class="small">/dia</span></div></div>' +
          '<div class="grid-3" style="margin-top:16px">' + Object.keys(modelos).map(function (m) { var u = modelos[m]; return '<div class="group-card">' + FC.vehImg(u) + "<strong>" + esc(m) + '</strong><div class="veh__meta">' + FC.badgesVeiculo(u) + "</div></div>"; }).join("") + "</div></section>";
      }).join("") + "</div>";
    if (gsel) setTimeout(function () { var el = document.getElementById("g-" + gsel); if (el) el.scrollIntoView({ block: "start" }); }, 50);
  });

  /* ---------- Falls Club (RF33; regras de demonstração) ---------- */
  FC.CLUB = {
    ptsDiaria: 10, valorPonto: 0.1, maxPct: 0.5,
    niveis: [
      { nome: "Asfalto", min: 0, vantagens: ["10 pontos por diária", "Pontos viram desconto"] },
      { nome: "Estrada", min: 300, vantagens: ["Tudo do Asfalto", "Atendimento prioritário no balcão"] },
      { nome: "Rodovia", min: 900, vantagens: ["Tudo do Estrada", "Suporte dedicado no chat"] }
    ]
  };
  var VALIDAS = ["confirmada", "em_andamento", "encerrada"];
  FC.clubSaldo = function (clienteId) {
    var hist = FC.db.reservas.filter(function (r) { return r.clienteId === clienteId && VALIDAS.indexOf(r.estado) >= 0; }).map(function (r) {
      return { r: r, ganhos: FC.duracao(r.inicio, r.fim).periodos * FC.CLUB.ptsDiaria, usados: r.pontosUsados || 0 };
    });
    var ganhos = hist.reduce(function (s, h) { return s + h.ganhos; }, 0), usados = hist.reduce(function (s, h) { return s + h.usados; }, 0);
    var nv = FC.CLUB.niveis.filter(function (n) { return ganhos >= n.min; }).length - 1;
    return { hist: hist, ganhos: ganhos, usados: usados, saldo: Math.max(0, ganhos - usados), nivel: nv, prox: FC.CLUB.niveis[nv + 1] || null };
  };
  FC.pontosUsaveis = function (sel, clienteId) {
    var base = FC.calcularPreco(Object.assign({}, sel, { pontos: 0, cupom: sel.cupom }), { clienteId: clienteId }).itens.filter(function (i) { return i.tipo === "locacao"; }).reduce(function (s, i) { return s + i.valor; }, 0);
    var max = Math.floor(base * FC.CLUB.maxPct / FC.CLUB.valorPonto);
    return Math.min(FC.clubSaldo(clienteId).saldo, max);
  };
  FC.clubNiveisHtml = function (atual) {
    return '<div class="club-levels">' + FC.CLUB.niveis.map(function (n, i) {
      return '<article class="club-level club-level--' + (i + 1) + (atual === i ? " is-current" : "") + '"><span class="club-level__tag">' + (i === 0 ? "Ao entrar" : "A partir de " + n.min + " pontos") + '</span><h3 class="club-level__name">' + n.nome + "</h3><ul>" + n.vantagens.map(function (v) { return "<li>" + v + "</li>"; }).join("") + "</ul></article>";
    }).join("") + "</div>";
  };
  FC.clubSaldoHtml = function (s) {
    var nv = FC.CLUB.niveis[s.nivel];
    var pct = s.prox ? Math.min(100, Math.round((s.ganhos - nv.min) / (s.prox.min - nv.min) * 100)) : 100;
    return '<div class="club-balance"><div><p class="small" style="opacity:.72">Seu saldo · nível ' + nv.nome + '</p><p class="club-balance__pts">' + s.saldo.toLocaleString("pt-BR") + " <span>pontos ≈ " + brl(s.saldo * FC.CLUB.valorPonto) + "</span></p></div>" +
      '<div class="club-progress"><p class="small" style="opacity:.72">' + (s.prox ? "Faltam " + (s.prox.min - s.ganhos) + " pontos para " + s.prox.nome : "Nível máximo") + '</p><div class="club-progress__bar"><span style="width:' + pct + '%"></span></div></div></div>';
  };
  FC.route("fidelidade", function (view) {
    location.replace("#/"); return; // Falls Club retirado
    var c = FC.clienteAtual(), on = FC.cfg().fidelidade;
    view.innerHTML = '<div class="container page"><div class="page-head"><div><h1 class="t-h2">Falls Club' + rf("RF33") + "</h1><p>" + FC.CLUB.ptsDiaria + " pontos por diária. 100 pontos = " + brl(100 * FC.CLUB.valorPonto) + " de desconto. Regras de demonstração.</p></div></div>" +
      (!on ? '<div class="note" style="margin-bottom:16px">' + icon("info", 16) + "<span>Programa pausado pela empresa (DP01).</span></div>" : "") +
      (on && c ? FC.clubSaldoHtml(FC.clubSaldo(c.id)) : on ? '<div class="box row row--between" style="margin-bottom:16px"><span>Entre para ver seu saldo.</span><a class="btn btn--primary" href="#/conta">Entrar/Cadastrar</a></div>' : "") +
      FC.clubNiveisHtml(on && c ? FC.clubSaldo(c.id).nivel : -1) +
      '<section class="box" style="margin-top:16px"><h3>Como funciona</h3><ol class="checklist"><li>Cada diária paga gera ' + FC.CLUB.ptsDiaria + " pontos.</li><li>Use os pontos na revisão da reserva, até metade da locação.</li><li>Reserva cancelada devolve os pontos usados.</li></ol></section></div>";
  });

  /* ---------- Motoristas de app: planos semanais ---------- */
  FC.PLANOS_APP = [
    { id: "APP1", nome: "Rota Básica", nivel: "Básica", grupos: ["ECO", "COM"], semana: 590 },
    { id: "APP2", nome: "Rota Conforto", nivel: "Conforto", grupos: ["SED"], semana: 760 },
    { id: "APP3", nome: "Rota Premium", nivel: "Premium", grupos: ["SEDM", "SUVG"], semana: 990 }
  ];
  FC.planoApp = function (id) { return FC.PLANOS_APP.filter(function (p) { return p.id === id; })[0] || null; };
  FC.planoAppCard = function (p, comBotao) {
    var vs = FC.db.veiculos.filter(function (v) { return v.ativo && p.grupos.indexOf(v.grupo) >= 0; });
    var foto = vs.filter(function (v) { return v.foto; })[0] || vs[0];
    var modelos = Object.keys(vs.reduce(function (o, v) { o[v.modelo] = 1; return o; }, {})).slice(0, 3);
    return '<article class="plan-card">' + (foto ? FC.vehImg(foto, "veh__img") : "") + '<span class="plan-card__tier">Categoria ' + p.nivel + '</span><h3 class="plan-card__name">' + esc(p.nome) + '</h3><p class="plan-card__models">Ex.: ' + modelos.map(esc).join(", ") + "</p>" +
      '<p class="plan-card__from">A partir de</p><p class="plan-card__price">' + brl(p.semana) + "<span>/semana</span></p>" +
      (comBotao ? '<button class="btn btn--primary" type="button" data-plano="' + p.id + '">Reservar</button>' : "") + "</article>";
  };
  function paginaApp(view) {
    view.innerHTML = '<div class="container page"><div class="page-head"><div><h1 class="t-h2">Carros para motoristas de app</h1><p>Plano semanal. Você reserva a unidade exata.</p></div></div>' +
      '<div class="note" style="margin-top:16px">' + icon("info", 16) + "<span><strong>Exige CNH com EAR</strong> (exerce atividade remunerada). Conferimos no balcão.</span></div>" +
      '<div class="grid-3" style="margin-top:24px">' + FC.PLANOS_APP.map(function (p) { return FC.planoAppCard(p, true); }).join("") + "</div>" +
      '<section class="box" style="margin-top:24px"><h3>Como funciona a cobrança</h3><ol class="checklist"><li>Você paga a 1ª semana para confirmar.</li><li>As outras semanas são cobradas antes de cada uma começar.</li><li>Mínimo de 7 dias. Pagamento simulado.</li></ol></section></div>';
    view.addEventListener("click", function (e) {
      var b = e.target.closest("[data-plano]"); if (!b) return;
      var busca = FC.busca;
      busca.plano = b.dataset.plano; busca.tipo = "carro";
      var ini = FC.combina(busca.dIni, busca.hIni), fim = FC.combina(busca.dFim, busca.hFim);
      if (fim - ini < 7 * 864e5) { var f = new Date(ini.getTime() + 28 * 864e5); busca.dFim = FC.isoDate(f); busca.hFim = busca.hIni; }
      FC.toast("Plano " + FC.planoApp(busca.plano).nome + ": 4 semanas sugeridas. Ajuste loja e datas.");
      FC.go("#/veiculos");
    });
  }

  FC.route("produto", function (view, rt) {
    if (rt.parts[1] === "app") { paginaApp(view); return; }
    view.innerHTML = '<div class="container page" style="max-width:720px"><h1 class="t-h2">Página não encontrada</h1><p class="muted" style="margin:8px 0 24px">Veja as opções na barra acima.</p>' +
      '<div class="row" style="margin-top:24px"><a class="btn btn--primary" href="#/">Reservar agora</a><a class="btn btn--ghost" href="#/ajuda">Falar com a gente</a></div></div>';
  });

  /* ---------- Diferenciais: páginas "Saiba mais" ---------- */
  FC.route("vantagens", function (view, rt) {
    var k = rt.parts[1], h = "";
    var amostra = ["COM", "SUV", "MOT1"].map(function (g) { return FC.db.veiculos.filter(function (v) { return v.grupo === g && v.foto && v.ativo; })[0] || FC.db.veiculos.filter(function (v) { return v.grupo === g && v.ativo; })[0]; }).filter(Boolean);
    if (k === "retirada") {
      h = '<h1 class="t-h2">Retirada digital em minutos</h1><p class="muted" style="margin:8px 0 24px">Faça o check-in antes e pegue a chave mais rápido.</p>' +
        '<ol class="checklist box"><li>Confirme seus dados e os condutores.</li><li>Envie a CNH, se ainda não enviou.</li><li>Receba o QR code de retirada.</li><li>Mostre o QR no balcão da loja.</li></ol>' +
        '<p class="small muted" style="margin-top:12px">Disponível para reservas confirmadas, até o horário da retirada. A CNH original é conferida no balcão.</p>' +
        '<div class="row" style="margin-top:24px"><a class="btn btn--primary" href="#/checkin">Fazer check-in</a><a class="btn btn--ghost" href="#/">Reservar</a></div>';
    } else if (k === "exato") {
      h = '<h1 class="t-h2">Escolha o carro exato' + rf("RF15") + '</h1><p class="muted" style="margin:8px 0 8px">Você reserva a unidade, não um "similar".</p><p class="small muted">Antes da reserva mostramos o final da placa. A placa completa aparece no contrato.</p>' +
        '<div class="units">' + amostra.map(function (v) {
          return '<article class="unit">' + FC.vehImg(v) + "<strong>" + esc(v.modelo) + " " + v.ano + '</strong><span class="small muted">' + esc(v.cor) + " · " + esc(FC.grupoById(v.grupo).nome) + " · unidade " + v.id + '</span><span class="plate" aria-label="Placa final ' + v.placa.slice(-2) + '">•••' + v.placa.slice(-4, -2).replace(/./g, "•") + v.placa.slice(-2) + "</span></article>";
        }).join("") + "</div>" +
        '<div class="row" style="margin-top:24px"><a class="btn btn--primary" href="#/">Buscar unidades</a><a class="btn btn--ghost" href="#/frota">Ver frota</a></div>';
    } else if (k === "adicionais") {
      var cfg = FC.cfg();
      h = '<h1 class="t-h2">Adicionais e proteções' + rf("RF18", "RF19", "RF63") + '</h1><p class="muted" style="margin:8px 0 24px">Tudo opcional. Nada vem marcado.' + rf("RNF20") + "</p>" +
        '<div class="grid-2"><section class="box"><h3>Acessórios</h3><ul class="price-lines">' + FC.db.acessorios.map(function (a) { return "<li><span>" + esc(a.nome) + ' <span class="small muted">(' + a.tipos.join(" e ") + ")</span></span><span>" + brl(a.diaria) + "/dia</span></li>"; }).join("") + "</ul></section>" +
        '<section class="box"><h3>Proteções</h3><ul class="price-lines">' + FC.db.protecoes.map(function (p) { return "<li><span>" + esc(p.nome) + "</span><span>" + brl(p.diaria) + "/dia</span></li>"; }).join("") + "</ul></section>" +
        '<section class="box"><h3>Condutor adicional</h3><p class="small">Até ' + cfg.maxCondutoresAdicionais + " por reserva. Cada um tem a CNH conferida.</p></section>" +
        '<section class="box"><h3>Motorista contratado</h3><p class="small">Para quem não dirige. ' + brl(cfg.motoristaDiaria) + "/dia. Não conta como condutor adicional.</p></section></div>" +
        '<p class="small muted" style="margin-top:12px">Valores de referência. Você escolhe na etapa 2 da reserva.</p>' +
        '<div class="row" style="margin-top:24px"><a class="btn btn--primary" href="#/">Reservar</a></div>';
    } else h = '<h1 class="t-h2">Página não encontrada</h1><p style="margin-top:12px"><a class="link" href="#/">Voltar ao início</a></p>';
    var SV = [["retirada", "Retirada digital"], ["exato", "Carro exato"], ["adicionais", "Adicionais e proteções"]];
    view.innerHTML = '<div class="container page" style="max-width:960px"><nav class="svc-pills" aria-label="Serviços">' + SV.map(function (s) { return '<a href="#/vantagens/' + s[0] + '"' + (s[0] === k ? ' aria-current="page"' : "") + ">" + s[1] + "</a>"; }).join("") + '<a href="#/lojas">Lojas 24 horas</a></nav>' + h + "</div>";
  });

  /* ---------- Check-in online (simulado) ---------- */
  FC.podeCheckin = function (r) { return r.estado === "confirmada" && r.pagamento === "aprovado" && new Date(r.inicio) > new Date(); };
  // QR de demonstração: padrão determinístico a partir do token, não é um QR legível
  FC.qrSvg = function (token) {
    var n = 25, s = 0, cells = "";
    for (var i = 0; i < token.length; i++) s = (s * 31 + token.charCodeAt(i)) >>> 0;
    var rnd = function () { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 16) & 1; };
    var finder = function (x, y) {
      var fs = [[0, 0], [n - 7, 0], [0, n - 7]];
      for (var k = 0; k < fs.length; k++) {
        var dx = x - fs[k][0], dy = y - fs[k][1];
        if (dx >= 0 && dy >= 0 && dx <= 6 && dy <= 6) return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
      }
      return false;
    };
    var inFinder = function (x, y) { return [[0, 0], [n - 8, 0], [0, n - 8]].some(function (f) { return x >= f[0] && x < f[0] + 8 && y >= f[1] && y < f[1] + 8; }); };
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var on = inFinder(x, y) ? finder(x, y) : rnd();
      if (on) cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
    return '<svg class="qr" viewBox="0 0 ' + n + " " + n + '" role="img" aria-label="QR code de retirada (demonstração)" shape-rendering="crispEdges"><g fill="#10213F">' + cells + "</g></svg>";
  };
  var ckState = { codigo: null, passo: 1 };
  FC.route("checkin", function (view, rt) {
    var c = FC.clienteAtual();
    var wrap = function (h) { view.innerHTML = '<div class="container page" style="max-width:720px">' + h + "</div>"; };
    if (!c) { wrap('<h1 class="t-h2">Check-in online</h1><p class="muted" style="margin:8px 0 24px">Entre na conta do titular da reserva.</p><div class="box" id="auth"></div>'); FC.authWidget($("#auth", view), FC.render); return; }
    var cod = rt.parts[1];
    if (!cod) {
      var elegiveis = FC.db.reservas.filter(function (r) { return r.clienteId === c.id && FC.podeCheckin(r); });
      wrap('<h1 class="t-h2">Check-in online</h1><p class="muted" style="margin:8px 0 24px">Escolha a reserva.</p>' +
        (elegiveis.length ? '<div class="stack">' + elegiveis.map(function (r) { var v = FC.veiculoById(r.veiculoId); return '<a class="box row row--between" style="text-decoration:none;color:inherit" href="#/checkin/' + r.codigo + '"><span><strong>' + esc(v.modelo) + '</strong><br><span class="small muted">' + esc(FC.lojaById(r.lojaRetirada).nome) + " · " + FC.dtBR(r.inicio) + '</span></span><span class="btn btn--primary btn--sm">' + (r.checkin ? "Ver QR" : "Fazer check-in") + "</span></a>"; }).join("") + "</div>"
          : '<div class="box"><p>Nenhuma reserva confirmada para check-in.</p><a class="btn btn--primary" href="#/" style="margin-top:12px">Reservar</a></div>'));
      return;
    }
    var r = FC.reservaByCodigo(cod);
    if (!r || r.clienteId !== c.id) { wrap('<div class="note note--bad">' + icon("lock", 16) + "<span>Reserva não encontrada nesta conta.</span></div>"); return; }
    if (!r.checkin && !FC.podeCheckin(r)) { wrap('<h1 class="t-h2">Check-in online</h1><div class="note note--warn" style="margin-top:16px">' + icon("info", 16) + "<span>Check-in disponível só para reservas confirmadas e pagas, antes da retirada. Situação: " + FC.badgeEstado(r.estado) + "</span></div>"); return; }
    if (ckState.codigo !== cod) ckState = { codigo: cod, passo: r.checkin ? 4 : 1 };
    var v = FC.veiculoById(r.veiculoId), lr = FC.lojaById(r.lojaRetirada);
    var passos = ["Seus dados", "CNH", "QR code", "Pronto"];
    var stepper = '<ol class="steps">' + passos.map(function (p, i) { var n = i + 1; return '<li class="' + (n < ckState.passo ? "done" : n === ckState.passo ? "current" : "") + '"' + (n === ckState.passo ? ' aria-current="step"' : "") + "><b>Passo " + n + "</b>" + p + "</li>"; }).join("") + "</ol>";
    var head = '<h1 class="t-h2" style="margin-bottom:4px">Check-in online</h1><p class="muted" style="margin-bottom:24px">Reserva ' + esc(r.codigo) + " · " + esc(v.modelo) + " · " + esc(lr.nome) + " · " + FC.dtBR(r.inicio) + "</p>" + stepper;
    var cnh = c.cnh;
    if (ckState.passo === 1) {
      wrap(head + '<section class="box"><h3>Confirme seus dados</h3><dl class="summary" style="display:grid;grid-template-columns:160px 1fr;gap:6px 12px;font-size:14px">' +
        '<dt class="muted">Titular</dt><dd style="margin:0;text-align:left">' + esc(c.nome) + '</dd><dt class="muted">Documento</dt><dd style="margin:0;text-align:left">' + esc(c.docTipo) + " " + esc(FC.mascaraDoc(c.doc)) + '</dd><dt class="muted">E-mail</dt><dd style="margin:0;text-align:left">' + esc(c.email) + '</dd><dt class="muted">Telefone</dt><dd style="margin:0;text-align:left">' + esc(c.telefone) + "</dd>" +
        '<dt class="muted">Condutores adicionais</dt><dd style="margin:0;text-align:left">' + ((r.condutores || []).length ? r.condutores.map(function (x) { return esc(x.nome || x); }).join(", ") : "nenhum") + "</dd>" +
        '<dt class="muted">Motorista contratado</dt><dd style="margin:0;text-align:left">' + (r.motorista ? "sim" : "não") + "</dd></dl>" +
        '<label class="chk" style="margin-top:16px"><input type="checkbox" id="ck-ok"> Os dados estão corretos</label>' +
        '<p class="small muted" style="margin-top:8px">Algo errado? <a class="link" href="#/conta">Corrija na sua conta</a>.</p>' +
        '<div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn--primary" type="button" id="ck-next" disabled>Continuar</button></div></section>');
      var okb = $("#ck-ok", view), nx = $("#ck-next", view);
      okb.addEventListener("change", function () { nx.disabled = !okb.checked; });
      nx.addEventListener("click", function () { ckState.passo = 2; FC.render(); });
      return;
    }
    if (ckState.passo === 2) {
      var temCnh = cnh && cnh.arquivo;
      wrap(head + '<section class="box"><h3>CNH do titular' + rf("RF60", "RF74") + "</h3>" +
        (cnh ? '<p class="small">Categoria ' + esc(cnh.categoria) + " · validade " + FC.dataBR(cnh.validade) + " · " + FC.statusDoc(cnh.status) + "</p>" : '<p class="small muted">Nenhuma CNH cadastrada.</p>') +
        (cnh && cnh.status === "conferida" ? "" :
          '<form id="ck-cnh" class="stack" style="margin-top:16px" novalidate>' + FC.fld("Arquivo (PDF, JPG ou PNG, até 5 MB)", '<input class="inp" type="file" id="ck-arq" accept=".pdf,.jpg,.jpeg,.png" style="padding:8px">', "Envio simulado.") +
          (cnh ? "" : FC.fld("Categoria", '<select class="sel" id="ck-cat"><option>B</option><option>A</option><option>AB</option></select>') + FC.fld("Validade", '<input class="inp" type="date" id="ck-val">')) +
          '<button class="btn btn--ghost" type="submit">Enviar CNH</button></form>') +
        '<div class="row row--between" style="margin-top:16px"><button class="btn btn--link" type="button" id="ck-back">Voltar</button><button class="btn btn--primary" type="button" id="ck-next"' + (temCnh || (cnh && cnh.status === "conferida") ? "" : " disabled") + ">Gerar QR code</button></div>" +
        (cnh && cnh.status !== "conferida" ? '<p class="small muted" style="margin-top:8px">Se a CNH ainda estiver em conferência, o atendente confere no balcão.</p>' : "") + "</section>");
      $("#ck-back", view).addEventListener("click", function () { ckState.passo = 1; FC.render(); });
      $("#ck-next", view).addEventListener("click", function () {
        r.checkin = { data: new Date().toISOString(), token: "CK-" + r.codigo.slice(3) + "-" + Date.now().toString(36).slice(-4).toUpperCase() };
        (r.eventos = r.eventos || []).push({ data: r.checkin.data, autor: c.nome, evento: "Check-in online concluído" });
        FC.audit("Check-in online", r.codigo, "", "ok", c.nome); FC.save(); ckState.passo = 3; FC.render();
      });
      var form = $("#ck-cnh", view);
      if (form) form.addEventListener("submit", function (e) {
        e.preventDefault(); FC.limparErros(view);
        var f = $("#ck-arq", view).files[0], ok = true;
        if (!f) { FC.erroCampo($("#ck-arq", view), "Selecione o arquivo."); ok = false; }
        else {
          var ext = f.name.split(".").pop().toLowerCase();
          var tiposOk = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
          if (!tiposOk[ext] || (f.type && f.type !== tiposOk[ext])) { FC.erroCampo($("#ck-arq", view), "Tipo de arquivo não aceito."); ok = false; }
          else if (f.size > 5 * 1024 * 1024) { FC.erroCampo($("#ck-arq", view), "Arquivo maior que 5 MB."); ok = false; }
        }
        var val = cnh ? null : $("#ck-val", view).value;
        if (!cnh && !val) { FC.erroCampo($("#ck-val", view), "Informe a validade."); ok = false; }
        if (!ok) return;
        var arq = { nome: f.name, tipo: f.type, tamanho: f.size, enviadoEm: new Date().toISOString(), armazenamento: "privado (simulado)" };
        if (cnh) { cnh.arquivo = arq; cnh.status = "pendente"; }
        else c.cnh = { numero: "", categoria: $("#ck-cat", view).value, validade: new Date(val + "T12:00:00").toISOString(), restricoes: [], status: "pendente", arquivo: arq, analisadoPor: null, analisadoEm: null, metodo: null };
        FC.audit("Envio de CNH (check-in)", c.id, "aguardando conferência", "ok"); FC.save(); FC.toast("CNH enviada. Aguardando conferência.", "ok"); FC.render();
      });
      return;
    }
    var qr = '<section class="box ck-done">' + FC.qrSvg(r.checkin.token) + '<p class="small muted" style="margin-top:8px">QR de demonstração · token ' + esc(r.checkin.token) + "</p>";
    if (ckState.passo === 3) {
      wrap(head + qr + '<h3 style="margin-top:16px">Seu QR code está pronto</h3><p class="small">Mostre no balcão de ' + esc(lr.nome) + " com a CNH original.</p>" +
        '<div class="row" style="justify-content:center;margin-top:16px"><button class="btn btn--primary" type="button" id="ck-next">Concluir</button></div></section>');
      $("#ck-next", view).addEventListener("click", function () { ckState.passo = 4; FC.render(); });
      return;
    }
    wrap(head + '<div class="note note--ok" style="margin-bottom:16px">' + icon("check", 16) + "<span>Check-in concluído em " + FC.dtBR(r.checkin.data) + ".</span></div>" + qr +
      "<h3 style=\"margin-top:16px\">" + esc(v.modelo) + "</h3><span class=\"plate\">" + esc(v.placa) + "</span>" +
      '<p class="small">Retirada: ' + esc(lr.nome) + " · " + FC.dtBR(r.inicio) + '</p><p class="small muted">' + esc(lr.instrucoes || "") + "</p>" +
      '<div class="row" style="justify-content:center;margin-top:16px"><a class="btn btn--ghost" href="#/conta">Minhas reservas</a></div></section>');
  });

  /* ---------- Consulta de reserva por código (RF23, RNF09) ---------- */
  var consultaTent = { n: 0, ate: 0 };
  FC.route("consultar", function (view) {
    view.innerHTML = '<div class="container page" style="max-width:720px"><h1 class="t-h2">Consultar reserva' + rf("RF23") + '</h1><p class="muted" style="margin:8px 0 24px">Informe o código e confirme sua identidade. Por segurança, mostramos só um resumo; para alterar ou cancelar, entre na sua conta.</p>' +
      '<form class="box form-grid" id="cq-form" novalidate>' + FC.fld("Código da reserva", '<input class="inp" id="cq-cod" placeholder="FC-XXXXXX" autocomplete="off">') + FC.fld("E-mail do titular", '<input class="inp" id="cq-email" type="email" autocomplete="email">') +
      FC.fld("Últimos 4 caracteres do documento", '<input class="inp" id="cq-doc" maxlength="4" autocomplete="off">', "CPF ou passaporte do titular.") + '<div class="fld" style="justify-content:flex-end"><button class="btn btn--primary" type="submit">Consultar</button></div></form><div id="cq-res" aria-live="polite" style="margin-top:16px"></div></div>';
    $("#cq-form", view).addEventListener("submit", function (e) {
      e.preventDefault(); FC.limparErros(view);
      var cod = $("#cq-cod", view).value.trim().toUpperCase(), em = $("#cq-email", view).value.trim().toLowerCase(), d4 = $("#cq-doc", view).value.trim().toUpperCase();
      var ok = true;
      if (!/^FC-[A-Z0-9]{6}$/.test(cod)) { FC.erroCampo($("#cq-cod", view), "Formato esperado: FC-XXXXXX."); ok = false; }
      if (!FC.emailValido(em)) { FC.erroCampo($("#cq-email", view), "Informe um e-mail válido."); ok = false; }
      if (d4.length !== 4) { FC.erroCampo($("#cq-doc", view), "Informe 4 caracteres."); ok = false; }
      if (!ok) return;
      var out = $("#cq-res", view);
      if (consultaTent.ate > Date.now()) { out.innerHTML = '<div class="note note--bad">Muitas tentativas. Aguarde alguns minutos.' + rf("RNF09") + "</div>"; return; }
      var r = FC.reservaByCodigo(cod), c = r && FC.clienteById(r.clienteId);
      var docLimpo = c ? c.doc.replace(/[^0-9A-Za-z]/g, "").toUpperCase() : "";
      if (!r || !c || c.email.toLowerCase() !== em || docLimpo.slice(-4) !== d4) {
        consultaTent.n++; if (consultaTent.n >= 5) { consultaTent.ate = Date.now() + 5 * 60000; consultaTent.n = 0; }
        FC.audit("Consulta de reserva negada", cod, "dados não conferem", "negado", "visitante"); FC.save();
        out.innerHTML = '<div class="note note--bad">' + icon("alert", 16) + "<span>Não encontramos uma reserva com esses dados. Por segurança, não informamos qual dado está incorreto.</span></div>"; return;
      }
      consultaTent.n = 0;
      FC.audit("Consulta de reserva por código", cod, "identidade conferida", "ok", "visitante"); FC.save();
      out.innerHTML = '<div class="box"><div class="row row--between"><h3>Reserva ' + esc(r.codigo) + "</h3>" + FC.badgeEstado(r.estado) + '</div><dl class="summary" style="display:grid;grid-template-columns:160px 1fr;gap:6px 12px;font-size:14px;margin-top:12px">' +
        '<dt class="muted">Titular</dt><dd style="margin:0">' + esc(c.nome.split(" ")[0]) + " " + esc((c.nome.split(" ")[1] || "").charAt(0)) + '.</dd><dt class="muted">Grupo</dt><dd style="margin:0">' + esc(FC.grupoById(r.grupo).nome) + '</dd><dt class="muted">Retirada</dt><dd style="margin:0">' + esc(FC.lojaById(r.lojaRetirada).nome) + " · " + FC.dtBR(r.inicio) + '</dd><dt class="muted">Devolução</dt><dd style="margin:0">' + esc(FC.lojaById(r.lojaDevolucao).nome) + " · " + FC.dtBR(r.fim) + "</dd></dl>" +
        '<p class="small muted" style="margin-top:12px">Para ver valores, documentos ou alterar, <a class="link" href="#/conta">entre na sua conta</a>.</p></div>';
    });
  });

  /* ---------- Autenticação e cadastro (RF20, RF22, RF51) ---------- */
  FC.authWidget = function (root, onOk) {
    var cfg = FC.cfg();
    root.innerHTML = '<div class="tabs" role="tablist"><button type="button" role="tab" aria-selected="true" data-t="login">Entrar</button><button type="button" role="tab" aria-selected="false" data-t="cad">Criar conta</button><button type="button" role="tab" aria-selected="false" data-t="rec">Esqueci a senha</button></div><div id="auth-body"></div>';
    function show(t) {
      $$("[data-t]", root).forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.t === t)); });
      var b = $("#auth-body", root);
      if (t === "login") {
        b.innerHTML = '<form class="stack" id="lg-form" novalidate>' + FC.fld("E-mail ou CPF", '<input class="inp" id="lg-id" autocomplete="username">') + FC.fld("Senha", '<input class="inp" id="lg-pw" type="password" autocomplete="current-password">') +
          '<div class="row"><button class="btn btn--primary" type="submit">Entrar</button><button class="btn btn--ghost" type="button" id="lg-demo">Usar conta de demonstração (Ana)</button>' + (cfg.loginGoogle ? '<button class="btn btn--ghost" type="button" id="lg-g">Entrar com Google (simulado)' + rf("RF51") + "</button>" : "") + "</div>" +
          '<p class="small muted">Após ' + cfg.loginMaxTentativas + " tentativas erradas, o acesso fica bloqueado por " + cfg.loginBloqueioMin + " min (parâmetros de demonstração)." + rf("RF22", "RNF06", "RNF09") + "</p></form>";
        $("#lg-form", b).addEventListener("submit", function (e) {
          e.preventDefault(); FC.limparErros(b);
          var r = FC.login($("#lg-id", b).value, $("#lg-pw", b).value);
          if (r.erro) { FC.erroCampo($("#lg-pw", b), r.erro); return; }
          FC.audit("Login de cliente", r.cliente.id, "", "ok", r.cliente.nome); FC.save(); FC.toast("Olá, " + r.cliente.nome.split(" ")[0] + "!", "ok"); onOk();
        });
        $("#lg-demo", b).addEventListener("click", function () { FC.db.sessao.clienteId = "C1"; FC.save(); FC.toast("Conta de demonstração: Ana Souza.", "ok"); onOk(); });
        var g = $("#lg-g", b); if (g) g.addEventListener("click", function () { FC.toast("Login social simulado — vincule à conta existente pelo e-mail. Alternativa: e-mail/CPF e senha."); });
      } else if (t === "cad") {
        b.innerHTML = '<form class="form-grid" id="cd-form" novalidate>' + FC.fld("Nome completo", '<input class="inp" id="cd-nome" autocomplete="name">') + FC.fld("E-mail", '<input class="inp" id="cd-email" type="email" autocomplete="email">') +
          FC.fld("Tipo de documento" + rf("RF20"), '<select class="sel" id="cd-tipo"><option>CPF</option><option>Passaporte</option><option>RNE/CRNM</option></select>') + FC.fld("Número do documento", '<input class="inp" id="cd-doc" autocomplete="off">') +
          FC.fld("Data de nascimento", '<input class="inp" type="date" id="cd-nasc">') + FC.fld("Celular", '<input class="inp" id="cd-tel" autocomplete="tel" placeholder="(11) 90000-0000">') +
          FC.fld("Senha", '<input class="inp" type="password" id="cd-pw" autocomplete="new-password">', "Mínimo de " + cfg.senhaMin + " caracteres, com letras e números (política de demonstração).") + FC.fld("Confirme a senha", '<input class="inp" type="password" id="cd-pw2" autocomplete="new-password">') +
          '<div class="span-all stack"><label class="chk"><input type="checkbox" id="cd-priv"> Li a <a class="link" href="#/privacidade" target="_blank">Política de Privacidade</a> (obrigatório para criar a conta).</label><label class="chk"><input type="checkbox" id="cd-mkt"> Quero receber ofertas (opcional, separado).</label><button class="btn btn--primary" type="submit">Criar conta</button></div></form>';
        $("#cd-doc", b).addEventListener("input", function () { if ($("#cd-tipo", b).value === "CPF") this.value = FC.mascaraCPF(this.value); });
        $("#cd-form", b).addEventListener("submit", function (e) {
          e.preventDefault(); FC.limparErros(b);
          var v = function (id) { return $("#" + id, b).value.trim(); };
          var ok = true;
          function err(id, m) { FC.erroCampo($("#" + id, b), m); ok = false; }
          if (v("cd-nome").split(" ").length < 2) err("cd-nome", "Informe nome e sobrenome.");
          if (!FC.emailValido(v("cd-email"))) err("cd-email", "E-mail inválido.");
          else if (FC.db.clientes.some(function (c) { return c.email.toLowerCase() === v("cd-email").toLowerCase(); })) err("cd-email", "Já existe conta com este e-mail. Entre ou recupere a senha.");
          if ($("#cd-tipo", b).value === "CPF") { if (!FC.cpfValido(v("cd-doc"))) err("cd-doc", "CPF inválido."); else if (FC.db.clientes.some(function (c) { return c.doc.replace(/\D/g, "") === v("cd-doc").replace(/\D/g, ""); })) err("cd-doc", "CPF já cadastrado."); }
          else if (v("cd-doc").length < 5) err("cd-doc", "Documento inválido.");
          if (!v("cd-nasc")) err("cd-nasc", "Informe a data de nascimento.");
          else if ((Date.now() - new Date(v("cd-nasc"))) / 31557600000 < 18) err("cd-nasc", "É preciso ter 18 anos ou mais.");
          if (v("cd-tel").replace(/\D/g, "").length < 10) err("cd-tel", "Celular inválido.");
          var pw = $("#cd-pw", b).value;
          if (pw.length < cfg.senhaMin || !/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) err("cd-pw", "A senha não atende à política.");
          if (pw !== $("#cd-pw2", b).value) err("cd-pw2", "As senhas não conferem.");
          if (!$("#cd-priv", b).checked) err("cd-priv", "Necessário para criar a conta.");
          if (!ok) { var f = $(".has-error input, .has-error select", b); if (f) f.focus(); return; }
          var c = { id: FC.uid("C"), nome: v("cd-nome"), email: v("cd-email").toLowerCase(), senhaHash: FC.hash(pw), docTipo: $("#cd-tipo", b).value, doc: v("cd-doc"), nascimento: v("cd-nasc"), telefone: v("cd-tel"), cnh: null, marketing: $("#cd-mkt", b).checked, newsletter: false, bloqueado: null, criadoEm: new Date().toISOString(), consentimentos: [{ tipo: "privacidade", data: new Date().toISOString() }].concat($("#cd-mkt", b).checked ? [{ tipo: "marketing", data: new Date().toISOString() }] : []) };
          FC.db.clientes.push(c); FC.db.sessao.clienteId = c.id;
          FC.outbox(c.email, "e-mail", "boas-vindas", "Bem-vindo(a) à Falls Car", "Sua conta foi criada. Envie sua CNH em Minha conta > Documentos para agilizar a retirada.");
          FC.audit("Cadastro de cliente", c.id, "site", "ok", c.nome); FC.save(); FC.toast("Conta criada", "ok"); onOk();
        });
      } else {
        b.innerHTML = '<form class="stack" id="rc-form" novalidate>' + FC.fld("E-mail cadastrado", '<input class="inp" id="rc-email" type="email" autocomplete="email">') + '<button class="btn btn--primary" type="submit">Enviar código</button></form><div id="rc-step2"></div>';
        $("#rc-form", b).addEventListener("submit", function (e) {
          e.preventDefault(); FC.limparErros(b);
          var em = $("#rc-email", b).value.trim().toLowerCase();
          if (!FC.emailValido(em)) { FC.erroCampo($("#rc-email", b), "E-mail inválido."); return; }
          var c = FC.db.clientes.filter(function (x) { return x.email === em; })[0];
          if (c) {
            var cod = String(Math.floor(100000 + Math.random() * 900000));
            FC.db.sessao.recuperacao = { clienteId: c.id, hash: FC.hash(cod), expira: Date.now() + cfg.codigoValidadeMin * 60000, tentativas: 0, usado: false };
            FC.outbox(c.email, "e-mail", "recuperação de senha", "Seu código de recuperação", "Código de uso único: " + cod + ". Válido por " + cfg.codigoValidadeMin + " minutos. Se não foi você, ignore.");
            FC.save();
          }
          $("#rc-step2", b).innerHTML = '<div class="note" style="margin:12px 0">' + icon("inbox", 16) + "<span>Se o e-mail estiver cadastrado, enviamos um código de uso único válido por " + cfg.codigoValidadeMin + " min. Neste protótipo, veja-o em <button class=\"btn btn--link small\" type=\"button\" id=\"rc-inbox\">caixa de saída simulada</button>." + rf("RF22", "RF85") + "</span></div>" +
            '<form class="stack" id="rc-form2" novalidate>' + FC.fld("Código recebido", '<input class="inp" id="rc-cod" inputmode="numeric" maxlength="6">') + FC.fld("Nova senha", '<input class="inp" id="rc-pw" type="password" autocomplete="new-password">') + '<button class="btn btn--primary" type="submit">Redefinir senha</button></form>';
          $("#rc-inbox", b).addEventListener("click", function () { var m = FC.db.saida.filter(function (x) { return x.para === em && x.evento === "recuperação de senha"; })[0]; FC.modal("Caixa de saída (simulada)", m ? "<p><strong>Para:</strong> " + esc(m.para) + "</p><p>" + esc(m.corpo) + "</p>" : "<p>Nenhuma mensagem para este endereço (e-mail não cadastrado).</p>"); });
          $("#rc-form2", b).addEventListener("submit", function (ev) {
            ev.preventDefault(); FC.limparErros(b);
            var rec = FC.db.sessao.recuperacao;
            if (!rec || rec.usado || rec.expira < Date.now()) { FC.erroCampo($("#rc-cod", b), "Código expirado ou já usado. Peça outro."); return; }
            if (rec.tentativas >= 5) { FC.erroCampo($("#rc-cod", b), "Limite de tentativas atingido. Peça um novo código."); return; }
            if (FC.hash($("#rc-cod", b).value.trim()) !== rec.hash) { rec.tentativas++; FC.save(); FC.erroCampo($("#rc-cod", b), "Código incorreto (" + (5 - rec.tentativas) + " tentativa(s) restante(s))."); return; }
            var pw = $("#rc-pw", b).value;
            if (pw.length < cfg.senhaMin || !/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) { FC.erroCampo($("#rc-pw", b), "A senha não atende à política."); return; }
            var c = FC.clienteById(rec.clienteId); c.senhaHash = FC.hash(pw); rec.usado = true;
            FC.audit("Senha redefinida por código", c.id, "recuperação", "ok", c.nome); FC.save();
            FC.toast("Senha redefinida. Entre com a nova senha.", "ok"); show("login");
          });
        });
      }
    }
    $$("[data-t]", root).forEach(function (b) { b.addEventListener("click", function () { show(b.dataset.t); }); });
    show("login");
  };

  /* ---------- Minha conta (RF53 e relacionados) ---------- */
  var contaTab = "reservas";
  function tabClub(body, c) {
    if (!FC.cfg().fidelidade) { body.innerHTML = '<div class="note">' + icon("info", 16) + "<span>Falls Club pausado (DP01).</span></div>"; return; }
    var s = FC.clubSaldo(c.id);
    body.innerHTML = FC.clubSaldoHtml(s) + '<p class="small muted" style="margin-bottom:12px">Saldo simulado a partir das suas reservas.' + rf("RF33") + "</p>" +
      (s.hist.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Reserva</th><th>Retirada</th><th class="num">Ganhos</th><th class="num">Usados</th></tr></thead><tbody>' +
        s.hist.map(function (h) { return "<tr><td>" + esc(h.r.codigo) + "</td><td>" + FC.dataBR(h.r.inicio) + '</td><td class="num">+' + h.ganhos + '</td><td class="num">' + (h.usados ? "−" + h.usados : "—") + "</td></tr>"; }).join("") + "</tbody></table></div>"
        : '<p class="small">Nenhuma reserva válida ainda. <a class="link" href="#/">Reservar</a></p>') +
      '<p style="margin-top:12px"><a class="link" href="#/fidelidade">Ver níveis e regras</a></p>';
  }
  FC.route("conta", function (view) {
    var c = FC.clienteAtual();
    if (!c) {
      view.innerHTML = '<div class="container page" style="max-width:720px"><h1 class="t-h2" style="margin-bottom:16px">Minha conta</h1><div class="box" id="auth"></div></div>';
      FC.authWidget($("#auth", view), function () { FC.render(); });
      return;
    }
    var TABS = [["reservas", "Reservas"], ["pagamentos", "Pagamentos e despesas"], ["documentos", "Documentos"], ["dados", "Dados e preferências"], ["seguranca", "Segurança"], ["privacidade", "Privacidade"], ["mensagens", "Mensagens"]];
    view.innerHTML = '<div class="container page"><div class="page-head"><div><h1 class="t-h2">Olá, ' + esc(c.nome.split(" ")[0]) + "</h1><p>Você vê somente as suas reservas, pagamentos e documentos." + rf("RF53", "RNF32") + '</p></div><button class="btn btn--ghost" type="button" id="ct-sair">' + icon("logout", 16) + "Sair</button></div>" +
      (c.bloqueado ? '<div class="note note--bad" style="margin-bottom:16px">' + icon("alert", 16) + "<span>Cadastro em revisão: " + esc(c.bloqueado.motivo) + ". Reservas pagas não foram canceladas; nossa equipe entrará em contato." + rf("RF67") + "</span></div>" : "") +
      '<div class="tabs" role="tablist">' + TABS.map(function (t) { return '<button type="button" role="tab" aria-selected="' + (t[0] === contaTab) + '" data-tab="' + t[0] + '">' + t[1] + "</button>"; }).join("") + '</div><div id="ct-body"></div></div>';
    $("#ct-sair", view).addEventListener("click", function () { FC.audit("Logout de cliente", c.id, "", "ok"); FC.db.sessao.clienteId = null; FC.save(); FC.go("#/"); });
    $$("[data-tab]", view).forEach(function (b) { b.addEventListener("click", function () { contaTab = b.dataset.tab; FC.render(); }); });
    var body = $("#ct-body", view);
    ({ reservas: tabReservas, pagamentos: tabPagamentos, documentos: tabDocumentos, dados: tabDados, seguranca: tabSeguranca, privacidade: tabPrivacidade, mensagens: tabMensagens, club: tabClub })[contaTab](body, c);
  });

  function minhas(c) { return FC.db.reservas.filter(function (r) { return r.clienteId === c.id; }).sort(function (a, b) { return new Date(b.inicio) - new Date(a.inicio); }); }

  function tabReservas(body, c) {
    var rs = minhas(c);
    body.innerHTML = rs.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Código</th><th>Veículo</th><th>Retirada</th><th>Devolução</th><th>Situação</th><th class="num">Total</th><th></th></tr></thead><tbody>' + rs.map(function (r) {
      var v = FC.veiculoById(r.veiculoId);
      return "<tr><td><strong>" + esc(r.codigo) + "</strong><br><span class=\"small muted\">" + (FC.CANAIS[r.canal] || r.canal) + "</span></td><td>" + esc(v.modelo) + "</td><td>" + esc(FC.lojaById(r.lojaRetirada).nome) + "<br>" + FC.dtBR(r.inicio) + "</td><td>" + esc(FC.lojaById(r.lojaDevolucao).nome) + "<br>" + FC.dtBR(r.fim) + "</td><td>" + FC.badgeEstado(r.estado) + '</td><td class="num">' + brl(r.preco.total) + '</td><td class="actions">' + (FC.podeCheckin(r) ? '<a class="btn btn--primary btn--sm" href="#/checkin/' + r.codigo + '">' + (r.checkin ? "Ver QR" : "Check-in") + "</a> " : "") + '<button class="btn btn--ghost btn--sm" type="button" data-ver="' + r.codigo + '">Detalhes</button></td></tr>';
    }).join("") + "</tbody></table></div>" : '<div class="box empty">Você ainda não tem reservas. <a class="link" href="#/">Faça sua primeira busca</a>.</div>';
    body.addEventListener("click", function (e) { var b = e.target.closest("[data-ver]"); if (b) FC.detalheReservaCliente(FC.reservaByCodigo(b.dataset.ver)); });
  }

  FC.detalheReservaCliente = function (r) {
    var c = FC.clienteAtual();
    if (!c || r.clienteId !== c.id) return;
    var pode = r.estado === "confirmada" && new Date(r.inicio) > new Date();
    var podeProrrogar = r.estado === "confirmada" || r.estado === "em_andamento";
    var b = FC.modal("Reserva " + r.codigo, '<div class="row" style="margin-bottom:12px">' + FC.badgeEstado(r.estado) + ' <span class="status status--muted">Pagamento: ' + (FC.PAGAMENTOS[r.pagamento] || r.pagamento) + "</span>" + rf("RF79") + "</div>" +
      '<div class="grid-2"><div>' + FC.resumoReservaBox(r) + "</div><div class=\"stack\">" +
      '<div class="row"><button class="btn btn--ghost btn--sm" type="button" data-doc="comprovante">Comprovante</button><button class="btn btn--ghost btn--sm" type="button" data-doc="contrato">Contrato</button><button class="btn btn--ghost btn--sm" type="button" data-doc="recibo">Recibo</button></div>' +
      (r.estado === "aguardando_pagamento" ? '<a class="btn btn--primary" href="#/pagar/' + r.codigo + '">Concluir pagamento</a>' : "") +
      (pode ? '<button class="btn btn--ghost" type="button" id="dr-alt">' + icon("edit", 16) + "Alterar datas ou extras</button>" : "") +
      (podeProrrogar ? '<button class="btn btn--ghost" type="button" id="dr-pro">' + icon("clock", 16) + "Prorrogar devolução</button>" : "") +
      (pode ? '<button class="btn btn--danger" type="button" id="dr-can">Cancelar reserva</button>' : "") +
      (r.estado === "encerrada" && !r.avaliacao ? '<button class="btn btn--primary" type="button" id="dr-av">Avaliar locação' + rf("RF69") + "</button>" : r.avaliacao ? '<p class="small">Sua avaliação: ' + "★".repeat(r.avaliacao.nota) + "</p>" : "") +
      '<details><summary class="small"><strong>Histórico de eventos</strong></summary><ul class="events">' + r.eventos.map(function (ev) { return "<li><time>" + FC.dtBR(ev.data) + "</time>" + esc(ev.evento) + "</li>"; }).join("") + "</ul></details></div></div>", { wide: true });
    FC.bindDocs(b, r);
    var can = $("#dr-can", b);
    if (can) can.addEventListener("click", function () {
      var p = FC.politicaCancelamento(r);
      FC.confirmar2("Cancelar reserva " + r.codigo, '<p>' + esc(p.regra) + rf("RF24") + '</p><ul class="price-lines" style="margin-top:12px"><li><span>Valor pago</span><span>' + brl(r.pagamento === "aprovado" ? r.preco.total : 0) + "</span></li><li><span>Multa</span><span>" + brl(p.multa) + '</span></li><li><span>Reembolso</span><span>' + brl(p.reembolso) + "</span></li></ul>", "Confirmar cancelamento", function () {
        r.estado = "cancelada"; FC.liberarRecursos(r);
        FC.evento(r, "Cancelada pelo cliente; multa " + brl(p.multa));
        if (p.reembolso > 0) FC.reembolsar(r, p.reembolso, "Cancelamento pelo cliente", c.nome);
        FC.outbox(c.email, "e-mail", "cancelamento", "Reserva " + r.codigo + " cancelada", "Cancelamento registrado. Reembolso: " + brl(p.reembolso) + ".", { ref: r.codigo });
        FC.audit("Cancelamento de reserva", r.codigo, "cliente", "ok"); FC.save(); FC.toast("Reserva cancelada.", "ok"); FC.render();
      }, true);
    });
    var alt = $("#dr-alt", b);
    if (alt) alt.addEventListener("click", function () { FC.alterarReserva(r); });
    var pro = $("#dr-pro", b);
    if (pro) pro.addEventListener("click", function () { FC.prorrogar(r); });
    var av = $("#dr-av", b);
    if (av) av.addEventListener("click", function () {
      var m = FC.modal("Avaliar locação " + r.codigo, '<fieldset class="fld"><legend>Nota</legend><div class="row">' + [1, 2, 3, 4, 5].map(function (n) { return '<label class="chk"><input type="radio" name="av-n" value="' + n + '"' + (n === 5 ? " checked" : "") + "> " + n + "★</label>"; }).join("") + "</div></fieldset>" + FC.fld("Comentário (opcional)", '<textarea class="txt" id="av-c" maxlength="500"></textarea>') + '<button class="btn btn--primary" type="button" id="av-ok" style="margin-top:12px">Enviar avaliação</button><p class="small muted" style="margin-top:8px">Uma avaliação por locação.</p>');
      $("#av-ok", m).addEventListener("click", function () {
        if (r.avaliacao) return;
        r.avaliacao = { nota: +$('input[name="av-n"]:checked', m).value, comentario: $("#av-c", m).value.trim(), data: new Date().toISOString() };
        FC.save(); FC.closeModal(); FC.toast("Avaliação enviada. Obrigado", "ok"); FC.render();
      });
    });
  };

  // Alteração (RF24) — mostra diferença antes do aceite
  FC.alterarReserva = function (r) {
    var c = FC.clienteAtual();
    var sel = { veiculoId: r.veiculoId, lojaRetirada: r.lojaRetirada, lojaDevolucao: r.lojaDevolucao, inicio: r.inicio, fim: r.fim, motorista: r.motorista, protecoes: r.protecoes.slice(), acessorios: r.acessorios.map(function (a) { return { id: a.id, qtd: a.qtd }; }), km: r.km, cupom: r.cupom };
    var b = FC.modal("Alterar reserva " + r.codigo, '<p class="small muted">A unidade continua a mesma. Mudanças são revalidadas e a diferença é mostrada antes da confirmação.' + rf("RF24", "RF16") + '</p><div class="form-grid" style="margin-top:12px">' +
      FC.fld("Nova data de devolução", '<input class="inp" type="date" id="al-d" value="' + FC.isoDate(r.fim) + '">') + FC.fld("Hora", '<input class="inp" type="time" id="al-h" step="1800" value="' + FC.horaBR(r.fim) + '">') +
      '<fieldset class="fld span-all"><legend>Proteções</legend>' + FC.db.protecoes.map(function (p) { return '<label class="chk"><input type="checkbox" class="al-p" value="' + p.id + '"' + (sel.protecoes.indexOf(p.id) >= 0 ? " checked" : "") + "> " + esc(p.nome) + " (" + brl(p.diaria) + "/dia)</label>"; }).join("") + "</fieldset></div>" +
      '<div id="al-res" style="margin-top:12px"></div><div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn--ghost" type="button" id="al-calc">Calcular diferença</button><button class="btn btn--primary" type="button" id="al-ok" disabled>Aceitar e pagar diferença</button></div>', { wide: true });
    var calc = null;
    $("#al-calc", b).addEventListener("click", function () {
      var nf = FC.combina($("#al-d", b).value, $("#al-h", b).value);
      var s2 = Object.assign({}, sel, { fim: nf.toISOString(), protecoes: $$(".al-p:checked", b).map(function (x) { return x.value; }), tarifaVersao: r.tarifaVersao });
      var erros = [];
      if (nf <= new Date(r.inicio)) erros.push("A devolução precisa ser depois da retirada.");
      var vh = FC.validaHorario(FC.lojaById(r.lojaDevolucao), nf); if (!vh.ok) erros.push(vh.msg);
      if (FC.conflitos(r.veiculoId, r.inicio, nf, r.codigo).length) erros.push("A unidade não está disponível para o novo período.");
      if (r.motorista && !FC.motoristaLivre(FC.motoristaById(r.motorista), r.inicio, nf, r.codigo)) erros.push("O motorista não está disponível para o novo período.");
      var pAntes = r.preco.total, pNovo = FC.calcularPreco(s2, { clienteId: c.id }).total;
      var dif = Math.round((pNovo - pAntes) * 100) / 100;
      calc = erros.length ? null : { s2: s2, dif: dif, novo: FC.calcularPreco(s2, { clienteId: c.id }) };
      $("#al-res", b).innerHTML = erros.length ? '<div class="note note--bad">' + erros.map(esc).join("<br>") + "</div>" : '<ul class="price-lines"><li><span>Total atual (tabela v' + r.tarifaVersao + " preservada)</span><span>" + brl(pAntes) + "</span></li><li><span>Novo total</span><span>" + brl(pNovo) + "</span></li><li><span><strong>Diferença</strong></span><span>" + brl(dif) + "</span></li></ul><p class=\"small muted\">" + (dif < 0 ? "A diferença negativa será reembolsada." : "A diferença será cobrada pelo simulador antes de aplicar a alteração.") + " Sem multa para alterações antes do prazo de cancelamento.</p>";
      $("#al-ok", b).disabled = !calc;
    });
    $("#al-ok", b).addEventListener("click", function () {
      if (!calc) return;
      var novo = calc.novo;
      FC.db.agenda.forEach(function (a) { if (a.ref === r.codigo) a.fim = calc.s2.fim; });
      FC.db.reservasAcessorios.forEach(function (a) { if (a.ref === r.codigo) a.fim = calc.s2.fim; });
      r.fim = calc.s2.fim; r.protecoes = calc.s2.protecoes;
      r.preco = { total: novo.total, itens: novo.itens.map(function (i) { return { rotulo: i.rotulo, valor: Math.round(i.valor * 100) / 100 }; }), caucao: novo.caucao };
      if (calc.dif > 0) { r.pagamentos.push({ idEvento: FC.uid("PG"), data: new Date().toISOString(), metodo: r.metodo || "credito", parcelas: 1, valor: calc.dif, resultado: "aprovado", ambiente: "DEMONSTRAÇÃO" }); FC.evento(r, "Alteração aceita; diferença de " + brl(calc.dif) + " paga (simulador)"); }
      else if (calc.dif < 0) { FC.evento(r, "Alteração aceita"); FC.reembolsar(r, -calc.dif, "Diferença de alteração", c.nome); }
      else FC.evento(r, "Alteração aceita sem diferença de preço");
      FC.audit("Alteração de reserva", r.codigo, "cliente", "ok"); FC.save(); FC.closeModal(); FC.toast("Reserva alterada.", "ok"); FC.render();
    });
  };

  // Prorrogação (RF29)
  FC.prorrogar = function (r) {
    var c = FC.clienteById(r.clienteId);
    var b = FC.modal("Prorrogar " + r.codigo, '<p class="small muted">Verificamos a disponibilidade da unidade, do motorista e dos acessórios. A diferença é paga antes de valer.' + rf("RF29") + '</p><div class="form-grid" style="margin-top:12px">' + FC.fld("Nova devolução", '<input class="inp" type="date" id="pr-d" value="' + FC.isoDate(new Date(new Date(r.fim).getTime() + 864e5)) + '">') + FC.fld("Hora", '<input class="inp" type="time" id="pr-h" step="1800" value="' + FC.horaBR(r.fim) + '">') + '</div><div id="pr-res" style="margin-top:12px"></div><label class="chk" style="margin-top:12px"><input type="checkbox" id="pr-ac"> Aceito o novo período e a diferença de preço.</label><div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn--ghost" type="button" id="pr-calc">Verificar</button><button class="btn btn--primary" type="button" id="pr-ok" disabled>Pagar diferença e prorrogar</button></div>');
    var ok = null;
    $("#pr-calc", b).addEventListener("click", function () {
      var nf = FC.combina($("#pr-d", b).value, $("#pr-h", b).value);
      var erros = [];
      if (nf <= new Date(r.fim)) erros.push("A nova devolução precisa ser depois da atual.");
      var vh = FC.validaHorario(FC.lojaById(r.lojaDevolucao), nf); if (!vh.ok) erros.push(vh.msg);
      if (FC.conflitos(r.veiculoId, r.fim, nf, r.codigo).length) erros.push("A unidade já tem outro compromisso nesse período.");
      if (r.motorista && !FC.motoristaLivre(FC.motoristaById(r.motorista), r.fim, nf, r.codigo)) erros.push("O motorista não está livre no período adicional.");
      (r.acessorios || []).forEach(function (a) { var ac = FC.db.acessorios.filter(function (x) { return x.id === a.id; })[0]; if (FC.acessorioLivre(ac, r.lojaRetirada, r.fim, nf, r.codigo) < a.qtd) erros.push("Sem estoque de " + ac.nome + " no período adicional."); });
      var s2 = { veiculoId: r.veiculoId, lojaRetirada: r.lojaRetirada, lojaDevolucao: r.lojaDevolucao, inicio: r.inicio, fim: nf.toISOString(), motorista: r.motorista, protecoes: r.protecoes, acessorios: r.acessorios, km: r.km, cupom: r.cupom, tarifaVersao: r.tarifaVersao };
      var novo = FC.calcularPreco(s2, { clienteId: r.clienteId });
      var dif = Math.round((novo.total - r.preco.total) * 100) / 100;
      ok = erros.length ? null : { nf: nf, novo: novo, dif: dif };
      $("#pr-res", b).innerHTML = erros.length ? '<div class="note note--bad">' + erros.map(esc).join("<br>") + "</div>" : '<div class="note note--ok">Disponível. Diferença a pagar: <strong>' + brl(dif) + "</strong> (regra de preço da tabela contratada; política final depende de PM02).</div>";
      $("#pr-ok", b).disabled = !ok;
    });
    $("#pr-ok", b).addEventListener("click", function () {
      if (!ok) return;
      if (!$("#pr-ac", b).checked) { FC.toast("Marque o aceite para continuar.", "bad"); return; }
      r.pagamentos = r.pagamentos || [];
      r.pagamentos.push({ idEvento: FC.uid("PG"), data: new Date().toISOString(), metodo: r.metodo || "credito", parcelas: 1, valor: ok.dif, resultado: "aprovado", ambiente: "DEMONSTRAÇÃO" });
      FC.db.agenda.forEach(function (a) { if (a.ref === r.codigo) a.fim = ok.nf.toISOString(); });
      FC.db.reservasAcessorios.forEach(function (a) { if (a.ref === r.codigo) a.fim = ok.nf.toISOString(); });
      r.fim = ok.nf.toISOString();
      r.preco = { total: ok.novo.total, itens: ok.novo.itens.map(function (i) { return { rotulo: i.rotulo, valor: Math.round(i.valor * 100) / 100 }; }), caucao: ok.novo.caucao };
      FC.evento(r, "Prorrogação aceita até " + FC.dtBR(r.fim) + "; diferença " + brl(ok.dif) + " aprovada (simulador)");
      FC.outbox(c.email, "e-mail", "prorrogação", "Prorrogação confirmada " + r.codigo, "Nova devolução: " + FC.dtBR(r.fim) + ".", { ref: r.codigo });
      FC.audit("Prorrogação", r.codigo, "", "ok"); FC.save(); FC.closeModal(); FC.toast("Prorrogação confirmada.", "ok"); FC.render();
    });
  };

  // Pagar reserva pendente (link de pagamento — RF06)
  FC.route("pagar", function (view, rt) {
    var r = FC.reservaByCodigo(rt.parts[1]); var c = FC.clienteAtual();
    if (!r || !c || r.clienteId !== c.id) { view.innerHTML = '<div class="container page"><div class="box"><h2 class="t-h3">Link de pagamento</h2><p style="margin-top:8px">Entre na conta do titular para pagar esta reserva.</p><div id="auth" style="margin-top:16px"></div></div></div>'; FC.authWidget($("#auth", view), FC.render); return; }
    if (r.estado !== "aguardando_pagamento") { view.innerHTML = '<div class="container page"><div class="box">Esta reserva não está aguardando pagamento (' + FC.badgeEstado(r.estado) + '). <a class="link" href="#/conta">Voltar</a></div></div>'; return; }
    view.innerHTML = '<div class="container page"><h1 class="t-h2" style="margin-bottom:16px">Pagamento da reserva ' + esc(r.codigo) + '</h1><div class="layout-side"><div>' + FC.pagamentoHtml(r, "link") + "</div>" + FC.resumoReservaBox(r) + "</div></div>";
    FC.bindPagamento(view, r, function (rr, msg) { FC.toast(msg, "ok"); FC.go("#/confirmacao/" + rr.codigo); }, "link");
  });

  function tabPagamentos(body, c) {
    var rs = minhas(c);
    var linhas = [];
    rs.forEach(function (r) {
      (r.pagamentos || []).forEach(function (p) { linhas.push({ data: p.data, cod: r.codigo, tipo: "Pagamento", desc: ({ credito: "Crédito", debito: "Débito", pix: "Pix" }[p.metodo] || p.metodo) + (p.parcelas > 1 ? " " + p.parcelas + "x" : ""), valor: p.valor, status: p.resultado }); });
      (r.reembolsos || []).forEach(function (x) { linhas.push({ data: x.data, cod: r.codigo, tipo: "Reembolso", desc: x.motivo, valor: -x.valor, status: x.status }); });
    });
    var despesas = [];
    rs.forEach(function (r) { (r.despesas || []).forEach(function (d, i) { despesas.push({ r: r, d: d, i: i }); }); });
    linhas.sort(function (a, b) { return new Date(b.data) - new Date(a.data); });
    body.innerHTML = '<h2 class="t-h3" style="margin-bottom:12px">Pagamentos e reembolsos' + rf("RF53", "RF82") + "</h2>" +
      (linhas.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Reserva</th><th>Tipo</th><th>Descrição</th><th>Situação</th><th class="num">Valor</th></tr></thead><tbody>' + linhas.map(function (l) { return "<tr><td>" + FC.dtBR(l.data) + "</td><td>" + esc(l.cod) + "</td><td>" + l.tipo + "</td><td>" + esc(l.desc) + "</td><td>" + esc(l.status) + '</td><td class="num">' + brl(l.valor) + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<div class="box empty">Nenhum pagamento registrado nesta demonstração. Locações antigas de exemplo não têm detalhe de pagamento.</div>') +
      '<h2 class="t-h3" style="margin:32px 0 12px">Despesas posteriores' + rf("RF28", "RF88") + '</h2><p class="small muted" style="margin-bottom:12px">Cobranças após a devolução aparecem separadas do valor original, com evidências e opção de contestação.</p>' +
      (despesas.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Reserva</th><th>Despesa</th><th>Evidência</th><th>Situação</th><th class="num">Valor</th><th></th></tr></thead><tbody>' + despesas.map(function (x) {
        return "<tr><td>" + esc(x.r.codigo) + "</td><td>" + esc(x.d.descricao) + "</td><td>" + esc(x.d.evidencia || "—") + "</td><td>" + esc(x.d.status) + (x.d.contestacao ? "<br><span class=\"small\">Contestação: " + esc(x.d.contestacao.texto) + "</span>" : "") + '</td><td class="num">' + brl(x.d.valor) + '</td><td>' + (x.d.status === "pendente" ? '<button class="btn btn--ghost btn--sm" type="button" data-cont="' + x.r.codigo + "|" + x.i + '">Contestar</button>' : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" : '<div class="box empty">Nenhuma despesa pendente.</div>');
    body.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cont]"); if (!b) return;
      var p = b.dataset.cont.split("|"), r = FC.reservaByCodigo(p[0]), d = r.despesas[+p[1]];
      var m = FC.modal("Contestar despesa", "<p>" + esc(d.descricao) + " — " + brl(d.valor) + "</p>" + FC.fld("Motivo da contestação", '<textarea class="txt" id="ct-t" autofocus></textarea>') + '<button class="btn btn--primary" type="button" id="ct-ok" style="margin-top:12px">Enviar contestação</button>');
      $("#ct-ok", m).addEventListener("click", function () {
        var t = $("#ct-t", m).value.trim(); if (t.length < 10) { FC.toast("Descreva o motivo (mín. 10 caracteres).", "bad"); return; }
        d.contestacao = { texto: t, data: new Date().toISOString() }; d.status = "em contestação";
        FC.evento(r, "Cliente contestou despesa: " + d.descricao); FC.audit("Contestação de despesa", r.codigo, d.descricao, "aberta"); FC.save(); FC.closeModal(); FC.toast("Contestação registrada.", "ok"); FC.render();
      });
    });
  }

  function tabDocumentos(body, c) {
    var cnh = c.cnh;
    body.innerHTML = '<div class="grid-2"><section class="box"><h3>CNH do titular' + rf("RF60", "RF74", "RF75") + "</h3>" +
      (cnh ? '<dl class="summary" style="display:grid;grid-template-columns:150px 1fr;gap:6px 12px;font-size:14px"><dt class="muted">Categoria</dt><dd style="margin:0">' + esc(cnh.categoria) + '</dd><dt class="muted">Validade</dt><dd style="margin:0">' + FC.dataBR(cnh.validade) + '</dd><dt class="muted">Restrições</dt><dd style="margin:0">' + esc((cnh.restricoes || []).join(", ") || "nenhuma") + '</dd><dt class="muted">Situação</dt><dd style="margin:0">' + FC.statusDoc(cnh.status) + "</dd>" + (cnh.arquivo ? '<dt class="muted">Arquivo</dt><dd style="margin:0">' + esc(cnh.arquivo.nome) + " (" + Math.round(cnh.arquivo.tamanho / 1024) + " KB)</dd>" : "") + (cnh.motivoRejeicao ? '<dt class="muted">Motivo</dt><dd style="margin:0">' + esc(cnh.motivoRejeicao) + "</dd>" : "") + "</dl>" : '<p class="small muted">Nenhuma CNH cadastrada.</p>') +
      '<div class="note" style="margin-top:12px">' + icon("info", 16) + "<span>A conferência é feita manualmente por um atendente a partir da imagem. Ela não equivale à verificação oficial de autenticidade do Senatran. Nunca pedimos sua senha gov.br." + rf("RN08") + "</span></div></section>" +
      '<form class="box" id="doc-form" novalidate><h3>' + (cnh ? "Substituir documento" : "Enviar CNH") + "</h3>" + '<div class="form-grid">' +
      FC.fld("Categoria", '<select class="sel" id="dc-cat">' + ["A", "B", "AB", "C", "D", "E", "AC", "AD", "AE"].map(function (x) { return "<option" + (cnh && cnh.categoria === x ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select>") +
      FC.fld("Validade", '<input class="inp" type="date" id="dc-val" value="' + (cnh ? FC.isoDate(cnh.validade) : "") + '">') +
      '<fieldset class="fld span-all"><legend>Restrições</legend>' + FC.RESTRICOES.map(function (r) { return '<label class="chk"><input type="checkbox" class="dc-res" value="' + esc(r) + '"' + (cnh && (cnh.restricoes || []).indexOf(r) >= 0 ? " checked" : "") + "> " + esc(r) + "</label>"; }).join("") + "</fieldset>" +
      FC.fld("Arquivo (CNH digital em PDF ou imagem legível)", '<input class="inp" type="file" id="dc-arq" accept=".pdf,.jpg,.jpeg,.png" style="padding:8px">', "Tipos aceitos: PDF, JPG, PNG. Tamanho máximo: 5 MB." + rf("RNF33"), "span-all") +
      '</div><button class="btn btn--primary" type="submit" style="margin-top:16px">Enviar para conferência</button></form></div>';
    $("#doc-form", body).addEventListener("submit", function (e) {
      e.preventDefault(); FC.limparErros(body);
      var f = $("#dc-arq", body).files[0], val = $("#dc-val", body).value;
      var ok = true;
      if (!val) { FC.erroCampo($("#dc-val", body), "Informe a validade."); ok = false; }
      if (!f) { FC.erroCampo($("#dc-arq", body), "Selecione o arquivo."); ok = false; }
      else {
        var ext = f.name.split(".").pop().toLowerCase();
        var tiposOk = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
        if (!tiposOk[ext] || (f.type && f.type !== tiposOk[ext])) { FC.erroCampo($("#dc-arq", body), "Tipo de arquivo não aceito."); ok = false; }
        else if (f.size > 5 * 1024 * 1024) { FC.erroCampo($("#dc-arq", body), "Arquivo maior que 5 MB."); ok = false; }
      }
      if (!ok) return;
      c.cnh = { numero: (c.cnh && c.cnh.numero) || "", categoria: $("#dc-cat", body).value, validade: new Date(val + "T12:00:00").toISOString(), restricoes: $$(".dc-res:checked", body).map(function (x) { return x.value; }), status: "pendente", arquivo: { nome: f.name, tipo: f.type, tamanho: f.size, enviadoEm: new Date().toISOString(), armazenamento: "privado (simulado)" }, analisadoPor: null, analisadoEm: null, metodo: null };
      FC.audit("Envio de CNH", c.id, "aguardando conferência", "ok"); FC.save(); FC.toast("Documento enviado. Status: aguardando conferência.", "ok"); FC.render();
    });
  }
  FC.statusDoc = function (s) { return '<span class="status status--' + ({ conferida: "ok", pendente: "warn", rejeitada: "bad", informada: "muted" }[s] || "muted") + '">' + ({ conferida: "Conferida manualmente", pendente: "Aguardando conferência", rejeitada: "Rejeitada — envie novamente", informada: "Dados informados (sem imagem)" }[s] || s) + "</span>"; };

  function tabDados(body, c) {
    body.innerHTML = '<form class="box form-grid" id="dd-form" novalidate>' + FC.fld("Nome", '<input class="inp" id="dd-nome" value="' + esc(c.nome) + '">') + FC.fld("E-mail", '<input class="inp" id="dd-email" value="' + esc(c.email) + '">') +
      FC.fld("Documento", '<input class="inp" value="' + esc(c.docTipo + " " + FC.mascaraDoc(c.doc)) + '" disabled>', "Para corrigir o documento, faça um pedido em Privacidade.") + FC.fld("Celular", '<input class="inp" id="dd-tel" value="' + esc(c.telefone) + '">') +
      '<fieldset class="fld span-all"><legend>Comunicações (opcionais e independentes da reserva)' + rf("RF20", "RF57") + '</legend><label class="chk"><input type="checkbox" id="dd-mkt"' + (c.marketing ? " checked" : "") + '> Ofertas e novidades por e-mail</label><label class="chk"><input type="checkbox" id="dd-news"' + (c.newsletter ? " checked" : "") + "> Newsletter mensal</label></fieldset>" +
      '<div class="span-all"><button class="btn btn--primary" type="submit">Salvar</button></div></form>';
    $("#dd-form", body).addEventListener("submit", function (e) {
      e.preventDefault(); FC.limparErros(body);
      var em = $("#dd-email", body).value.trim().toLowerCase();
      if (!FC.emailValido(em)) { FC.erroCampo($("#dd-email", body), "E-mail inválido."); return; }
      if ($("#dd-nome", body).value.trim().split(" ").length < 2) { FC.erroCampo($("#dd-nome", body), "Informe nome e sobrenome."); return; }
      c.nome = $("#dd-nome", body).value.trim(); c.email = em; c.telefone = $("#dd-tel", body).value.trim();
      c.marketing = $("#dd-mkt", body).checked; c.newsletter = $("#dd-news", body).checked;
      FC.audit("Atualização de dados pessoais", c.id, "cliente", "ok"); FC.save(); FC.toast("Dados salvos.", "ok");
    });
  }

  function tabSeguranca(body, c) {
    body.innerHTML = '<form class="box stack" id="sg-form" novalidate style="max-width:560px"><h3>Trocar senha' + rf("RF52", "RNF06") + "</h3>" + FC.fld("Senha atual", '<input class="inp" type="password" id="sg-a" autocomplete="current-password">') + FC.fld("Nova senha", '<input class="inp" type="password" id="sg-n" autocomplete="new-password">', "Mínimo " + FC.cfg().senhaMin + " caracteres com letras e números.") + FC.fld("Confirme", '<input class="inp" type="password" id="sg-c" autocomplete="new-password">') +
      '<label class="chk"><input type="checkbox" id="sg-out" checked> Encerrar as sessões abertas em outros dispositivos</label><button class="btn btn--primary" type="submit">Trocar senha</button></form>';
    $("#sg-form", body).addEventListener("submit", function (e) {
      e.preventDefault(); FC.limparErros(body);
      if (FC.hash($("#sg-a", body).value) !== c.senhaHash) { FC.erroCampo($("#sg-a", body), "Senha atual incorreta."); FC.audit("Troca de senha negada", c.id, "verificação falhou", "negado"); FC.save(); return; }
      var n = $("#sg-n", body).value;
      if (n.length < FC.cfg().senhaMin || !/[a-zA-Z]/.test(n) || !/\d/.test(n)) { FC.erroCampo($("#sg-n", body), "A senha não atende à política."); return; }
      if (n !== $("#sg-c", body).value) { FC.erroCampo($("#sg-c", body), "As senhas não conferem."); return; }
      c.senhaHash = FC.hash(n);
      FC.outbox(c.email, "e-mail", "segurança", "Sua senha foi alterada", "Se não foi você, recupere o acesso imediatamente.");
      FC.audit("Troca de senha", c.id, $("#sg-out", body).checked ? "outras sessões encerradas" : "", "ok"); FC.save(); FC.toast("Senha alterada.", "ok"); FC.render();
    });
  }

  function tabPrivacidade(body, c) {
    var meus = FC.db.lgpd.filter(function (p) { return p.clienteId === c.id; });
    body.innerHTML = '<div class="grid-2"><form class="box stack" id="lg2-form" novalidate><h3>Pedido sobre seus dados' + rf("RF89", "RNF08") + "</h3>" +
      FC.fld("Tipo de pedido", '<select class="sel" id="lp-tipo"><option>Acesso aos meus dados</option><option>Correção de dados</option><option>Exclusão de dados</option><option>Revogar consentimento de marketing</option></select>') +
      FC.fld("Detalhes", '<textarea class="txt" id="lp-det"></textarea>') + FC.fld("Confirme sua senha (verificação de identidade)", '<input class="inp" type="password" id="lp-pw" autocomplete="current-password">') +
      '<p class="small muted">Dados ligados a contratos, pagamentos ou infrações podem ser mantidos pelo prazo legal; explicaremos a retenção na resposta.</p><button class="btn btn--primary" type="submit">Enviar pedido</button></form>' +
      '<div class="box"><h3>Meus pedidos</h3>' + (meus.length ? '<ul class="events">' + meus.map(function (p) { return "<li><time>" + FC.dtBR(p.data) + "</time><strong>" + esc(p.protocolo) + "</strong> · " + esc(p.tipo) + " · " + esc(p.status) + (p.resposta ? "<br><span class=\"small\">" + esc(p.resposta) + "</span>" : "") + "</li>"; }).join("") + "</ul>" : '<p class="small muted">Nenhum pedido.</p>') + "</div></div>";
    $("#lg2-form", body).addEventListener("submit", function (e) {
      e.preventDefault(); FC.limparErros(body);
      if (FC.hash($("#lp-pw", body).value) !== c.senhaHash) { FC.erroCampo($("#lp-pw", body), "Senha incorreta."); return; }
      var p = { protocolo: "LGPD-" + (1000 + FC.db.lgpd.length + 1), clienteId: c.id, tipo: $("#lp-tipo", body).value, detalhes: $("#lp-det", body).value.trim(), data: new Date().toISOString(), status: "recebido", resposta: null };
      FC.db.lgpd.push(p);
      if (p.tipo.indexOf("marketing") >= 0) { c.marketing = false; c.newsletter = false; p.status = "concluído"; p.resposta = "Consentimento de marketing revogado imediatamente."; }
      FC.outbox(c.email, "e-mail", "privacidade", "Pedido " + p.protocolo + " recebido", "Recebemos seu pedido (" + p.tipo + ").");
      FC.audit("Pedido de titular (LGPD)", p.protocolo, p.tipo, p.status); FC.save(); FC.toast("Pedido " + p.protocolo + " registrado.", "ok"); FC.render();
    });
  }

  function tabMensagens(body, c) {
    var msgs = FC.db.saida.filter(function (m) { return m.para === c.email || m.para === c.telefone; });
    body.innerHTML = '<p class="small muted" style="margin-bottom:12px">Mensagens enviadas a você pelos canais habilitados. Neste protótipo os envios são simulados; uma falha de envio não desfaz a reserva nem duplica a confirmação.' + rf("RF25", "RF68", "RF85") + "</p>" +
      (msgs.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Canal</th><th>Assunto</th><th>Situação</th></tr></thead><tbody>' + msgs.map(function (m) { return "<tr><td>" + FC.dtBR(m.agendadoPara || m.data) + "</td><td>" + esc(m.canal) + "</td><td><strong>" + esc(m.assunto) + '</strong><br><span class="small muted">' + esc(m.corpo) + "</span></td><td>" + esc(m.status) + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<div class="box empty">Nenhuma mensagem.</div>');
  }

  /* ---------- Ajuda e chamados (RF58, RF59, RF61, RF83) ---------- */
  FC.route("ajuda", function (view) {
    var c = FC.clienteAtual();
    var meus = c ? FC.db.chamados.filter(function (h) { return h.clienteId === c.id; }) : [];
    view.innerHTML = '<div class="container page"><div class="page-head"><div><h1 class="t-h2">Ajuda</h1><p>Busque nas perguntas frequentes ou fale com a gente pelos canais oficiais.</p></div></div>' +
      '<div class="grid-3" style="margin-bottom:32px">' +
      '<div class="box"><h3>' + icon("chat", 20) + " WhatsApp oficial" + rf("RF59") + '</h3><p class="small">+55 11 90000-0000. Atendimento e reserva assistida com pagamento por link.</p><a class="btn btn--primary btn--sm" style="margin-top:12px" href="https://wa.me/5511900000000" target="_blank" rel="noopener">Abrir WhatsApp</a></div>' +
      '<div class="box"><h3>' + icon("phone", 20) + ' Central telefônica</h3><p class="small">(11) 4000-0000, todos os dias, 7h às 23h. Reservas por telefone são pagas antes da confirmação.</p><a class="btn btn--ghost btn--sm" style="margin-top:12px" href="tel:+551140000000">Ligar</a></div>' +
      '<div class="box"><h3>' + icon("shield", 20) + " Antifraude" + rf("RF61") + '</h3><p class="small">Nunca pedimos senha, código de SMS ou senha gov.br. Não cobramos por depósito em conta de pessoa física. Na dúvida, confirme pelo telefone oficial.</p></div></div>' +
      '<div class="grid-2"><section><h2 class="t-h3" style="margin-bottom:12px">Perguntas frequentes' + rf("RF58") + '</h2><label class="fld" style="margin-bottom:16px"><span>Buscar na ajuda</span><input class="inp" id="faq-q" type="search" placeholder="Ex.: moto, cancelamento, caução"></label><div class="faq" style="grid-template-columns:1fr" id="faq-list"></div></section>' +
      '<section><h2 class="t-h3" style="margin-bottom:12px">Abrir chamado' + rf("RF58", "RF83") + "</h2>" +
      (c ? '<form class="box stack" id="ch-form" novalidate>' + FC.fld("Assunto", '<select class="sel" id="ch-ass"><option>Dúvida sobre reserva</option><option>Alteração ou cancelamento</option><option>Cobrança ou reembolso</option><option>Documentos</option><option>Acessibilidade</option><option>Outro</option></select>') +
        FC.fld("Reserva (opcional)", '<select class="sel" id="ch-res"><option value="">Nenhuma</option>' + minhas(c).map(function (r) { return '<option value="' + r.codigo + '">' + r.codigo + "</option>"; }).join("") + "</select>") +
        FC.fld("Mensagem", '<textarea class="txt" id="ch-msg"></textarea>') + FC.fld("Anexo (opcional)", '<input class="inp" type="file" id="ch-arq" accept=".pdf,.jpg,.jpeg,.png" style="padding:8px">', "PDF, JPG ou PNG até 5 MB.") +
        '<button class="btn btn--primary" type="submit">Enviar</button></form>' +
        '<h3 class="t-h4" style="margin:24px 0 8px">Meus chamados</h3>' + (meus.length ? meus.map(function (h) { return '<details class="box"><summary><strong>' + esc(h.protocolo) + "</strong> · " + esc(h.assunto) + " · " + esc(h.status) + '</summary><ul class="events" style="margin-top:8px">' + h.historico.map(function (x) { return "<li><time>" + FC.dtBR(x.data) + "</time><strong>" + esc(x.autor) + ":</strong> " + esc(x.texto) + "</li>"; }).join("") + "</ul></details>"; }).join("") : '<p class="small muted">Nenhum chamado.</p>')
        : '<div class="box"><p>Entre na sua conta para abrir e acompanhar chamados com protocolo.</p><a class="btn btn--primary" href="#/conta" style="margin-top:12px">Entrar</a></div>') +
      "</section></div></div>";
    function faq() {
      var q = ($("#faq-q", view).value || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      var l = FC.FAQ.filter(function (f) { return !q || (f[0] + " " + f[1]).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").indexOf(q) >= 0; });
      $("#faq-list", view).innerHTML = l.length ? l.map(function (f, i) { return '<div class="faq__item"><h3 style="margin:0"><button class="faq__q" type="button" aria-expanded="false" aria-controls="fq' + i + '"><span>' + esc(f[0]) + "</span>" + icon("chevron-down") + '</button></h3><div class="faq__a" id="fq' + i + '" hidden><p>' + esc(f[1]) + "</p></div></div>"; }).join("") : '<p class="muted">Nada encontrado. Abra um chamado ou fale no WhatsApp.</p>';
    }
    $("#faq-q", view).addEventListener("input", faq); faq(); FC.bindFaq(view);
    var f = $("#ch-form", view);
    if (f) f.addEventListener("submit", function (e) {
      e.preventDefault(); FC.limparErros(view);
      var msg = $("#ch-msg", view).value.trim(), arq = $("#ch-arq", view).files[0];
      if (msg.length < 10) { FC.erroCampo($("#ch-msg", view), "Descreva sua solicitação (mín. 10 caracteres)."); return; }
      if (arq && (arq.size > 5 * 1024 * 1024 || !/\.(pdf|jpe?g|png)$/i.test(arq.name))) { FC.erroCampo($("#ch-arq", view), "Arquivo não aceito (tipo ou tamanho)."); return; }
      var resCod = $("#ch-res", view).value;
      var h = { protocolo: "SUP-" + (1000 + FC.db.chamados.length + 1), clienteId: c.id, canal: "site", assunto: $("#ch-ass", view).value, status: "aberto", loja: resCod ? FC.reservaByCodigo(resCod).lojaRetirada : null, reserva: resCod || null, atendente: null, criadoEm: new Date().toISOString(), historico: [{ data: new Date().toISOString(), autor: c.nome, texto: msg }], anexos: arq ? [{ nome: arq.name, tamanho: arq.size, tipo: arq.type }] : [] };
      FC.db.chamados.unshift(h);
      FC.outbox(c.email, "e-mail", "suporte", "Chamado " + h.protocolo + " aberto", "Recebemos sua mensagem. Protocolo: " + h.protocolo + ".");
      FC.audit("Chamado aberto", h.protocolo, h.assunto, "ok"); FC.save(); FC.toast("Chamado " + h.protocolo + " aberto.", "ok"); FC.render();
    });
  });

  /* ---------- Termos e privacidade (RNF08) ---------- */
  FC.route("termos", function (view) { view.innerHTML = '<div class="container page" style="max-width:860px"><h1 class="t-h2" style="margin-bottom:16px">Termos de locação</h1>' + FC.termosHtml() + "</div>"; });
  FC.route("privacidade", function (view) {
    view.innerHTML = '<div class="container page prose" style="max-width:860px"><h1 class="t-h2">Privacidade e seus direitos' + rf("RNF08", "RF89") + "</h1>" +
      '<p class="muted" style="margin-top:8px">Documento de demonstração. Não afirma conformidade legal; o texto final depende de revisão.</p>' +
      "<h3>Quais dados tratamos e para quê</h3><ul><li><strong>Cadastro</strong> (nome, documento, contatos): identificar o titular e executar o contrato.</li><li><strong>Habilitação</strong> (categoria, validade, restrições e imagem): verificar se cada condutor pode dirigir o veículo.</li><li><strong>Reservas e pagamentos</strong>: executar a locação, emitir comprovantes e tratar reembolsos. Não guardamos dados completos de cartão.</li><li><strong>Voo</strong> (opcional): organizar a retirada em aeroportos.</li><li><strong>Marketing e newsletter</strong>: só com consentimento separado, revogável a qualquer momento.</li></ul>" +
      "<h3>Quem acessa</h3><p>Atendentes, operadores de frota e gestores, cada um somente no que o perfil e a loja permitem. Ações sensíveis ficam em trilha de auditoria.</p>" +
      "<h3>Retenção</h3><p>Dados de contratos, pagamentos e infrações são mantidos pelo prazo legal; os demais, enquanto a conta estiver ativa ou até o pedido de exclusão.</p>" +
      '<h3>Seus direitos</h3><p>Você pode pedir acesso, correção, exclusão ou revogar consentimentos em <a href="#/conta">Minha conta > Privacidade</a>, com verificação de identidade.</p></div>';
  });
})();
