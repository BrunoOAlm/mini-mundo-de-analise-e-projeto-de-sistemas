/* Falls Car — painel do empresário (RF87) e login da área da empresa (RF70) em fibra de carbono.
   Os números vêm de FC.painelDados (painel-dados.js); aqui só a montagem da tela. */
(function () {
  "use strict";
  var FC = window.FC, esc = FC.esc, brl = FC.brl, $ = FC.$;
  var SIT = { alugado: ["Alugado", "al"], patio: ["Pátio", "pa"], oficina: ["Oficina", "of"], vistoria: ["Vistoria", "vi"], transferencia: ["Transferência", "tr"] };
  var CAT = { parcelas: "Parcelas da frota", manutencao: "Manutenção", seguro: "Seguro", equipe: "Equipe", outros: "Outros" };
  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  var ORDEM = { oficina: 0, vistoria: 1, transferencia: 2, patio: 3, alugado: 4 };

  function pct(x) { return Math.round(x * 100) + "%"; }
  function curto(v) { return Math.abs(v) >= 10000 ? "R$ " + (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " mil" : brl(v); }
  function hora(d) { d = new Date(d); return (d.getHours() < 10 ? "0" : "") + d.getHours() + "h" + (d.getMinutes() ? (d.getMinutes() < 10 ? "0" : "") + d.getMinutes() : ""); }
  function t(html, cls) { return '<div class="t' + (cls ? " " + cls : "") + '">' + html + "</div>"; }
  function num(v, rot, cls, extra) { return t('<div class="k' + (cls ? " " + cls : "") + '">' + v + '</div><div class="m">' + rot + "</div>" + (extra ? '<div class="m" style="margin-top:6px">' + extra + "</div>" : "")); }
  function sec(id, titulo, sub, corpo) { return '<section class="pnl-sec" id="' + id + '" aria-labelledby="' + id + '-t"><h2 id="' + id + '-t">' + titulo + "</h2><p>" + sub + "</p>" + corpo + "</section>"; }
  function barra(rot, frac, valor) { return '<div class="pnl-hb"><span>' + esc(rot) + '</span><i><b style="width:' + Math.max(0, Math.min(100, frac * 100)).toFixed(1) + '%"></b></i><span>' + valor + "</span></div>"; }
  function nomeCliente(id) { var c = FC.clienteById(id); return c ? c.nome : "Cliente"; }

  FC.adminPages.painel = function (main) {
    var u = FC.adminAtual();
    var d = FC.painelDados(FC.db, new Date(), { noEscopo: FC.noEscopo, situacaoDe: FC.situacaoAtual, verFinanceiro: u.perfil === "gestor" });
    var f = d.frota, h = d.hoje, fin = d.financeiro;
    var secoes = [["pnl-visao", "Visão geral"], ["pnl-frota", "Frota"], ["pnl-hoje", "Hoje"]];
    if (fin) secoes.push(["pnl-fin", "Financeiro"]);
    var pendHoje = h.atrasados.itens.length + h.movimento.length;
    var nRet = h.movimento.filter(function (m) { return m.tipo === "retirada"; }).length;

    var visao = '<div class="pnl-g pnl-g--4">' +
      t('<div class="pnl-ocup"><div class="pnl-ring" style="--p:' + Math.round(f.ocupacao * 100) + '"><span>' + pct(f.ocupacao) + '</span></div><div><div class="k">' + f.alugados + " / " + f.total + '</div><div class="m">veículos alugados agora</div></div></div>') +
      num(f.oficina + f.vistoria, "indisponíveis", "r", f.oficina + " oficina · " + f.vistoria + " vistoria") +
      num(pendHoje, "pendências hoje", "", '<span class="r">' + h.atrasados.itens.length + " atraso(s)</span> · " + (h.movimento.length - nRet) + " devolução(ões) · " + nRet + " retirada(s)") +
      (fin ? num(curto(fin.mes.lucro), "lucro líquido do mês", fin.mes.lucro >= 0 ? "ok" : "r", "margem " + pct(fin.mes.margem) + ' · <span class="' + (fin.mes.variacaoLucro >= 0 ? "ok" : "r") + '">' + (fin.mes.variacaoLucro >= 0 ? "+" : "") + pct(fin.mes.variacaoLucro) + " vs mês anterior</span>")
        : num(brl(h.recebimentos.total), "a receber hoje", "ok", h.recebimentos.itens.length + " cobrança(s)")) + "</div>";

    var lista = f.lista.slice().sort(function (a, b) { return ORDEM[a.situacao] - ORDEM[b.situacao]; });
    var parados = {}; f.parados48h.forEach(function (v) { parados[v.id] = 1; });
    var frota = '<div class="pnl-g pnl-g--5">' + num(f.alugados, "alugados", "y") + num(f.patio, "disponíveis no pátio", "", f.parados48h.length ? '<span class="y">' + f.parados48h.length + " parado(s) há +48 h</span>" : "") +
      num(f.oficina, "na oficina", "r") + num(f.vistoria, "aguardando vistoria") + num(f.transferencia, "em transferência") + "</div>" +
      '<div class="pnl-g pnl-g--2a">' + t('<div class="pnl-tab"><table><thead><tr><th>Veículo</th><th>Placa</th><th>Situação</th><th>Onde</th><th>Quando</th></tr></thead><tbody>' +
        lista.slice(0, 12).map(function (i) {
          var s = SIT[i.situacao];
          return "<tr><td>" + esc(i.veiculo.modelo) + "</td><td>" + esc(i.veiculo.placa || "") + '</td><td><span class="pnl-pill pnl-pill--' + s[1] + '">' + s[0] + "</span></td><td>" + esc(i.onde) + '</td><td class="' + (parados[i.veiculo.id] ? "y" : "") + '">' + esc(i.quando) + "</td></tr>";
        }).join("") + '</tbody></table></div><a class="pnl-mais" href="#/admin/frota">Ver a frota completa (' + f.total + ")</a>") +
        t('<div class="m" style="margin-bottom:8px">Ocupação por categoria</div>' + f.porCategoria.map(function (c) { return barra(c.grupo, c.ocupacao, pct(c.ocupacao)); }).join("")) + "</div>";

    var li = function (a, b, cls) { return '<div class="pnl-li"><span>' + a + '</span><span class="' + (cls || "") + '">' + b + "</span></div>"; };
    var vazio = function (txt) { return '<p class="pnl-vazio">' + txt + "</p>"; };
    var hoje = '<div class="pnl-g pnl-g--3">' +
      t('<div class="m" style="margin-bottom:4px">Recebimentos de hoje · <b class="ok">' + brl(h.recebimentos.total) + "</b></div>" + (h.recebimentos.itens.length ? h.recebimentos.itens.map(function (c) {
        return li(esc(nomeCliente(c.clienteId)) + ' <span class="m">· ' + esc(c.descricao) + "</span>", brl(c.valor) + (c.pagoEm ? " · recebido" : " · " + hora(c.vencimento)), c.pagoEm ? "ok" : "");
      }).join("") : vazio("Nada vence hoje."))) +
      t('<div class="m" style="margin-bottom:4px">Atrasados · <b class="r">' + brl(h.atrasados.total) + "</b></div>" + (h.atrasados.itens.length ? h.atrasados.itens.map(function (a) {
        return li(esc(nomeCliente(a.cobranca.clienteId)) + ' <span class="m">· ' + brl(a.cobranca.valor) + "</span>", a.dias + (a.dias === 1 ? " dia" : " dias"), "r");
      }).join("") : vazio("Nenhuma cobrança atrasada."))) +
      t('<div class="m" style="margin-bottom:4px">Movimento do pátio</div>' + (h.movimento.length ? h.movimento.map(function (m) {
        var v = FC.veiculoById(m.reserva.veiculoId);
        return li(hora(m.hora) + " · " + (m.tipo === "retirada" ? "retirada" : "devolução") + " · " + esc(v ? v.modelo : m.reserva.codigo), m.tipo === "retirada" ? esc((FC.lojaById(m.reserva.lojaRetirada) || {}).nome || "") : "preparar vistoria", m.tipo === "retirada" ? "m" : "y");
      }).join("") : vazio("Sem retiradas ou devoluções hoje."))) + "</div>" +
      '<div class="pnl-g">' + t('<div class="m" style="margin-bottom:4px">Pendências operacionais · ' + h.pendencias.length + "</div>" + (h.pendencias.length ? h.pendencias.slice(0, 10).map(function (p) {
        return li(esc(p.rotulo), '<a href="' + p.link + '">' + esc(p.ref) + "</a>");
      }).join("") : vazio("Nenhuma pendência."))) + "</div>";

    var financeiro = "";
    if (fin) {
      var mx = Math.max.apply(null, fin.serie.map(function (s) { return Math.max(s.faturamento, s.despesas, 1); }));
      var alt = function (v) { return (Math.max(0, v) / mx * 100).toFixed(1) + "%"; };
      var maiorCat = fin.despesasPorCategoria.length ? fin.despesasPorCategoria[0].valor : 1;
      financeiro = '<div class="pnl-g pnl-g--4e">' + num(curto(fin.mes.faturamento), "faturamento") + num(curto(fin.mes.despesas), "despesas", "r") + num(curto(fin.mes.lucro), "lucro líquido", fin.mes.lucro >= 0 ? "ok" : "r") + num(brl(fin.mes.ticket), "ticket médio por locação") + "</div>" +
        '<div class="pnl-g pnl-g--2b">' + t('<div class="m">Faturamento × despesas × lucro · 6 meses</div><div class="pnl-cols" role="img" aria-label="Gráfico de faturamento, despesas e lucro dos últimos 6 meses">' + fin.serie.map(function (s) {
          return '<div title="' + esc(s.mes) + ": faturamento " + brl(s.faturamento) + ", despesas " + brl(s.despesas) + ", lucro " + brl(s.lucro) + '"><i class="c-f" style="height:' + alt(s.faturamento) + '"></i><i class="c-d" style="height:' + alt(s.despesas) + '"></i><i class="c-l" style="height:' + alt(s.lucro) + '"></i></div>';
        }).join("") + '</div><div class="pnl-lbl">' + fin.serie.map(function (s) { return "<span>" + MESES[+s.mes.slice(5) - 1] + "</span>"; }).join("") + '</div><div class="pnl-leg"><span class="y">Faturamento</span><span class="r">Despesas</span><span class="ok">Lucro</span></div>') +
        t('<div class="m" style="margin-bottom:8px">Para onde foi a despesa</div>' + (fin.despesasPorCategoria.length ? fin.despesasPorCategoria.map(function (c) { return barra(CAT[c.categoria] || c.categoria, c.valor / maiorCat, curto(c.valor)); }).join("") : vazio("Sem despesas no mês."))) + "</div>";
    }

    var navHtml = '<nav class="pnl-nav" aria-label="Seções do painel">' +
      secoes.map(function (s, i) { return '<button type="button" data-alvo="' + s[0] + '"' + (i ? "" : ' class="is-on" aria-current="true"') + ">" + s[1] + "</button>"; }).join("") + "</nav>";
    main.innerHTML = '<div class="pnl">' +
      sec("pnl-visao", "Visão geral", "Os 5 segundos da manhã: o essencial de cada seção.", visao) +
      sec("pnl-frota", "Frota", "Onde está cada veículo e o que está parado sem render.", frota) +
      sec("pnl-hoje", "Hoje", "O que vence hoje: dinheiro a receber, atrasos e o movimento do pátio.", hoje) +
      (fin ? sec("pnl-fin", "Financeiro", "Resultado do mês e tendência dos últimos 6 meses. Valores de demonstração.", financeiro) : "") + "</div>";

    // menu de seções vai para a barra de cima, ao lado da logo (uma barra só); sem cabeçalho, fica no topo do painel
    var topo = document.querySelector(".header__top"), logo = topo && topo.querySelector(".logo");
    var nav = document.createRange().createContextualFragment(navHtml).firstChild;
    if (logo) logo.insertAdjacentElement("afterend", nav); else main.querySelector(".pnl").insertAdjacentElement("afterbegin", nav);
    var botoes = FC.$$("button", nav);
    function marcar(id) { botoes.forEach(function (b) { var on = b.dataset.alvo === id; b.classList.toggle("is-on", on); if (on) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); }); }
    var travaAte = 0; // depois de um clique, o botão clicado fica marcado enquanto a página rola até a seção
    nav.addEventListener("click", function (e) { var b = e.target.closest("[data-alvo]"); if (!b) return; marcar(b.dataset.alvo); travaAte = Date.now() + 1200; document.getElementById(b.dataset.alvo).scrollIntoView({ behavior: "smooth", block: "start" }); });
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        if (Date.now() < travaAte) return;
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) { marcar(secoes[secoes.length - 1][0]); return; } // fim da página: última seção
        es.forEach(function (x) { if (x.isIntersecting) marcar(x.target.id); });
      }, { rootMargin: "-30% 0px -60% 0px" });
      secoes.forEach(function (s) { io.observe(document.getElementById(s[0])); });
    }
  };

  FC.telaLoginAdmin = function (view) {
    view.innerHTML = '<div class="container"><div class="pnl pnl-login"><form class="t pnl-login__card" novalidate aria-labelledby="la-t">' +
      '<svg class="pnl-login__logo" viewBox="0 0 1362 375" aria-hidden="true"><use href="#i-logo"/></svg>' +
      '<h1 class="pnl-login__marca" id="la-t">Falls<b>Car</b></h1><p class="pnl-login__sub">Área da empresa</p>' +
      '<label for="la-email">E-mail</label><input id="la-email" type="email" autocomplete="username" required>' +
      '<label for="la-senha">Senha</label><input id="la-senha" type="password" autocomplete="current-password" required>' +
      '<p class="pnl-login__erro" id="la-erro" role="alert" hidden></p>' +
      '<button class="pnl-btn" type="submit">Entrar</button>' +
      '<button class="pnl-link" type="button" id="la-esqueci">Esqueci minha senha</button>' +
      '<p class="pnl-login__nota">Protótipo: a senha é verificada no navegador; a proteção real vem com o backend.</p></form></div></div>';
    var form = $("form", view), erro = $("#la-erro", view);
    $("#la-email", view).focus();
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = $("#la-email", view).value, senha = $("#la-senha", view).value;
      if (!email.trim() || !senha) { erro.textContent = "Informe e-mail e senha."; erro.hidden = false; return; }
      var r = FC.loginAdmin(email, senha);
      if (r.erro) { erro.textContent = r.erro; erro.hidden = false; $("#la-senha", view).value = ""; $("#la-senha", view).focus(); return; }
      FC.go("#/admin/painel");
    });
    $("#la-esqueci", view).addEventListener("click", function () { FC.toast("A senha é redefinida por um administrador em Usuários internos."); });
  };
})();
