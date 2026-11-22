/* Falls Car — administração: frota, agenda, transferências, manutenção, cadastros, relatórios, gestão */
(function () {
  "use strict";
  var FC = window.FC, $ = FC.$, $$ = FC.$$, esc = FC.esc, icon = FC.icon, rf = FC.rf, brl = FC.brl;
  var P = FC.adminPages;
  function sit(s) { var cls = { "disponível": "ok", locado: "info", reservado: "info", "manutenção": "warn", "em transferência": "warn", inativo: "muted" }[s] || "muted"; return '<span class="status status--' + cls + '">' + esc(s) + "</span>"; }
  function semPermissao(acao) { if (!FC.pode(acao)) { FC.toast("Seu perfil não pode executar esta ação.", "bad"); FC.audit("Ação negada", acao, "perfil " + FC.adminAtual().perfil, "negado"); FC.save(); return true; } return false; }

  /* ---------- Reservas afetadas (RF86) ---------- */
  FC.reservasAfetadas = function () {
    var out = [];
    FC.db.reservas.filter(function (r) { return r.estado === "confirmada"; }).forEach(function (r) {
      var conf = FC.conflitos(r.veiculoId, r.inicio, r.fim, r.codigo).filter(function (a) { return a.tipo === "manutencao"; });
      if (conf.length) out.push({ reserva: r, motivo: "manutenção" });
      var t = FC.db.transferencias.filter(function (x) { return x.reserva === r.codigo && x.status !== "concluida"; })[0];
      if (t && new Date(t.chegadaPrevista) > new Date(new Date(r.inicio).getTime() - t.margemMin * 60000)) out.push({ reserva: r, motivo: "atraso de transferência" });
      if (r.motorista) { var m = FC.motoristaById(r.motorista); if (!m.ativo) out.push({ reserva: r, motivo: "falta de motorista" }); }
    });
    return out.filter(function (a) { return !a.reserva.alternativa; });
  };
  FC.tratarAfetada = function (r, motivo) {
    var v = FC.veiculoById(r.veiculoId);
    var alts = FC.unidadesDisponiveis(r.lojaRetirada, r.inicio, r.fim, { tipo: v.tipo }).filter(function (x) { return x.veiculo.id !== v.id; });
    var m = FC.modal("Reserva afetada " + r.codigo + " (" + motivo + ")", '<p class="small">Registre a alternativa que o cliente aceitou. Nada muda sem o aceite dele.' + rf("RF86") + "</p>" +
      FC.fld("Alternativa", '<select class="sel" id="af-alt">' + alts.map(function (x) { return '<option value="' + x.veiculo.id + '">Trocar para ' + esc(x.veiculo.modelo) + " (" + esc(FC.grupoById(x.veiculo.grupo).nome) + ", " + (x.transf.necessaria ? "transferência" : "na loja") + ")</option>"; }).join("") + '<option value="cancelar">Cancelar com reembolso integral</option></select>') +
      FC.fld("Como o cliente aceitou", '<input class="inp" id="af-ac" placeholder="Ex.: telefone, 14h, protocolo SUP-1002">') + '<button class="btn btn--primary" type="button" id="af-ok" style="margin-top:12px">Registrar alternativa aceita</button>');
    $("#af-ok", m).addEventListener("click", function () {
      var a = $("#af-alt", m).value, ac = $("#af-ac", m).value.trim();
      if (!ac) { FC.toast("Registre como o cliente aceitou.", "bad"); return; }
      if (a === "cancelar") { r.estado = "cancelada"; FC.liberarRecursos(r); FC.reembolsar(r, r.preco.total, "Indisponibilidade (" + motivo + ")"); }
      else {
        FC.db.agenda.forEach(function (x) { if (x.ref === r.codigo && x.veiculoId) x.veiculoId = a; });
        r.veiculoId = a;
      }
      r.alternativa = { motivo: motivo, solucao: a === "cancelar" ? "cancelamento com reembolso" : "troca para " + FC.veiculoById(a).modelo, aceite: ac, por: FC.autorAtual(), data: new Date().toISOString() };
      FC.evento(r, "Reserva afetada por " + motivo + ": " + r.alternativa.solucao + " (aceite: " + ac + ")");
      FC.audit("Alternativa registrada", r.codigo, motivo, r.alternativa.solucao); FC.save(); FC.closeModal(); FC.render();
    });
  };

  /* ---------- Frota (RF01, RF02, RF03) ---------- */
  var frotaF = { loja: "", tipo: "", sit: "", q: "" };
  P.frota = function (main) {
    var f = frotaF;
    var lista = FC.db.veiculos.filter(function (v) {
      if (!FC.noEscopo(v.localAtual) && !FC.noEscopo(v.lojaResponsavel)) return false;
      if (f.loja && v.localAtual !== f.loja) return false;
      if (f.tipo && v.tipo !== f.tipo) return false;
      if (f.sit && FC.situacaoAtual(v) !== f.sit) return false;
      if (f.q && (v.modelo + " " + v.placa + " " + v.id).toLowerCase().indexOf(f.q.toLowerCase()) < 0) return false;
      return true;
    });
    main.innerHTML = FC.head("Frota" + rf("RF01", "RF02", "RF03"), "Carros e motos por unidade, com localização atual, loja responsável e histórico de movimentações.", FC.pode("frota") ? '<button class="btn btn--primary" type="button" id="fr-novo">' + icon("plus", 16) + "Cadastrar veículo</button>" : "") +
      '<form class="box form-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px" id="fr-f">' + FC.fld("Buscar", '<input class="inp" id="fr-q" value="' + esc(f.q) + '" placeholder="Modelo, placa ou unidade">') + FC.fld("Local atual", FC.selLojaEscopo("fr-l", f.loja)) +
      FC.fld("Tipo", '<select class="sel" id="fr-t"><option value="">Todos</option><option value="carro"' + (f.tipo === "carro" ? " selected" : "") + '>Carros</option><option value="moto"' + (f.tipo === "moto" ? " selected" : "") + ">Motos</option></select>") +
      FC.fld("Situação", '<select class="sel" id="fr-s"><option value="">Todas</option>' + ["disponível", "reservado", "locado", "manutenção", "em transferência", "inativo"].map(function (x) { return "<option" + (f.sit === x ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select>") + "</form>" +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Unidade</th><th>Modelo</th><th>Grupo</th><th>Habilitação</th><th>Local atual</th><th>Loja responsável</th><th class="num">Km</th><th>Situação</th><th></th></tr></thead><tbody>' +
      (lista.map(function (v) {
        return "<tr><td><strong>" + v.id + "</strong><br><span class=\"small muted\">" + esc(v.placa) + "</span></td><td>" + esc(v.modelo) + " " + v.ano + "</td><td>" + esc(FC.grupoById(v.grupo).nome) + "</td><td>" + (v.tipo === "moto" ? "A" : "B") + "</td><td>" + esc(v.localAtual) + "</td><td>" + esc(v.lojaResponsavel) + '</td><td class="num">' + v.km.toLocaleString("pt-BR") + (v.km >= v.proximaRevisaoKm - 1000 ? ' <span class="status status--warn">revisão</span>' : "") + "</td><td>" + sit(FC.situacaoAtual(v)) + '</td><td class="actions"><button class="btn btn--ghost btn--sm" type="button" data-hist="' + v.id + '">Histórico</button>' + (FC.pode("frota") ? ' <button class="btn btn--ghost btn--sm" type="button" data-ed="' + v.id + '">Editar</button>' : "") + "</td></tr>";
      }).join("") || '<tr><td colspan="9" class="empty">Nenhum veículo.</td></tr>') + "</tbody></table></div>";
    $("#fr-f", main).addEventListener("change", function () { f.q = $("#fr-q", main).value; f.loja = $("#fr-l", main).value; f.tipo = $("#fr-t", main).value; f.sit = $("#fr-s", main).value; FC.render(); });
    $("#fr-f", main).addEventListener("submit", function (e) { e.preventDefault(); f.q = $("#fr-q", main).value; FC.render(); });
    var nv = $("#fr-novo", main); if (nv) nv.addEventListener("click", function () { editarVeiculo(null); });
    main.addEventListener("click", function (e) {
      var h = e.target.closest("[data-hist]"); if (h) historicoVeiculo(FC.veiculoById(h.dataset.hist));
      var ed = e.target.closest("[data-ed]"); if (ed) editarVeiculo(FC.veiculoById(ed.dataset.ed));
    });
  };
  var ACESS = ["Câmbio automático", "Comandos manuais de freio e acelerador", "Pomo giratório no volante", "Assento giratório", "Rampa para cadeira de rodas"];
  function editarVeiculo(v) {
    var novo = !v;
    v = v || { id: "", placa: "", modelo: "", foto: "", grupo: "ECO", tipo: "carro", ano: 2025, cor: "Branco", lugares: 5, malas: 2, cambio: "Manual", ar: true, cilindrada: null, combustivel: "Flex", acessibilidade: [], lojaResponsavel: FC.lojasEscopo()[0].id, localAtual: FC.lojasEscopo()[0].id, km: 0, proximaRevisaoKm: 10000, ativo: true };
    var m = FC.modal(novo ? "Cadastrar veículo" : "Editar " + v.id, '<form class="form-grid" id="ve-f" novalidate>' +
      FC.fld("Placa", '<input class="inp" id="ve-placa" value="' + esc(v.placa) + '" maxlength="7">', "Formato Mercosul: ABC1D23") + FC.fld("Modelo", '<input class="inp" id="ve-mod" value="' + esc(v.modelo) + '">') +
      FC.fld("Grupo (classificação)", '<select class="sel" id="ve-g">' + FC.db.grupos.map(function (g) { return '<option value="' + g.id + '"' + (g.id === v.grupo ? " selected" : "") + ">" + esc(g.nome) + " (" + g.tipo + ")</option>"; }).join("") + "</select>", "O tipo (carro/moto) e a habilitação exigida vêm do grupo — matriz " + FC.cfg().matrizCNH.versao + rf("RF76", "RNF41")) +
      FC.fld("Ano", '<input class="inp" type="number" id="ve-ano" value="' + v.ano + '">') + FC.fld("Cor", '<input class="inp" id="ve-cor" value="' + esc(v.cor) + '">') + FC.fld("Lugares", '<input class="inp" type="number" min="1" id="ve-lug" value="' + v.lugares + '">') +
      FC.fld("Malas", '<input class="inp" type="number" min="0" id="ve-mal" value="' + v.malas + '">') + FC.fld("Câmbio", '<select class="sel" id="ve-cb"><option' + (v.cambio === "Manual" ? " selected" : "") + ">Manual</option><option" + (v.cambio === "Automático" ? " selected" : "") + ">Automático</option></select>") +
      FC.fld("Km atual", '<input class="inp" type="number" min="0" id="ve-km" value="' + v.km + '">') + FC.fld("Próxima revisão (km)", '<input class="inp" type="number" min="0" id="ve-rev" value="' + v.proximaRevisaoKm + '">') +
      FC.fld("Loja responsável", '<select class="sel" id="ve-lr">' + FC.lojaOptions(v.lojaResponsavel, function (l) { return FC.noEscopo(l.id); }) + "</select>") + FC.fld("Localização atual", '<select class="sel" id="ve-la">' + FC.lojaOptions(v.localAtual, function (l) { return FC.noEscopo(l.id); }) + "</select>", "Alterar gera registro no histórico.") +
      '<label class="chk"><input type="checkbox" id="ve-ar"' + (v.ar ? " checked" : "") + "> Ar-condicionado</label>" +
      '<fieldset class="fld span-all"><legend>Acessibilidade e adaptações' + rf("RF39") + "</legend>" + ACESS.map(function (a) { return '<label class="chk"><input type="checkbox" class="ve-ac" value="' + esc(a) + '"' + (v.acessibilidade.indexOf(a) >= 0 ? " checked" : "") + "> " + esc(a) + "</label>"; }).join("") + "</fieldset>" +
      FC.fld("Motivo da alteração (auditoria)", '<input class="inp" id="ve-mot">', null, "span-all") +
      '<div class="span-all row"><button class="btn btn--primary" type="submit">Salvar</button>' + (!novo ? '<button class="btn ' + (v.ativo ? "btn--danger" : "btn--ghost") + '" type="button" id="ve-ina">' + (v.ativo ? "Inativar" : "Reativar") + "</button>" : "") + "</div></form>", { wide: true });
    $("#ve-f", m).addEventListener("submit", function (e) {
      e.preventDefault(); FC.limparErros(m);
      var placa = $("#ve-placa", m).value.trim().toUpperCase();
      var ok = true;
      if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa)) { FC.erroCampo($("#ve-placa", m), "Placa inválida."); ok = false; }
      else if (FC.db.veiculos.some(function (x) { return x.placa === placa && x.id !== v.id; })) { FC.erroCampo($("#ve-placa", m), "Placa já cadastrada."); ok = false; }
      if (!$("#ve-mod", m).value.trim()) { FC.erroCampo($("#ve-mod", m), "Informe o modelo."); ok = false; }
      if (!ok) return;
      var g = FC.grupoById($("#ve-g", m).value);
      var la = $("#ve-la", m).value;
      if (novo) { v.id = "V" + String(FC.db.veiculos.length + 1).padStart(3, "0"); while (FC.veiculoById(v.id)) v.id = "V" + Math.floor(Math.random() * 9000 + 1000); v.criadoEm = new Date().toISOString(); FC.db.veiculos.push(v); FC.db.movimentos.push({ id: FC.uid("M"), veiculoId: v.id, data: new Date().toISOString(), de: null, para: la, motivo: "Entrada na frota", autor: FC.autorAtual() }); }
      else if (la !== v.localAtual) FC.db.movimentos.push({ id: FC.uid("M"), veiculoId: v.id, data: new Date().toISOString(), de: v.localAtual, para: la, motivo: $("#ve-mot", m).value.trim() || "Ajuste de localização", autor: FC.autorAtual() });
      Object.assign(v, { placa: placa, modelo: $("#ve-mod", m).value.trim(), grupo: g.id, tipo: g.tipo, ano: +$("#ve-ano", m).value, cor: $("#ve-cor", m).value.trim(), lugares: +$("#ve-lug", m).value, malas: +$("#ve-mal", m).value, cambio: $("#ve-cb", m).value, km: +$("#ve-km", m).value, proximaRevisaoKm: +$("#ve-rev", m).value, lojaResponsavel: $("#ve-lr", m).value, localAtual: la, ar: $("#ve-ar", m).checked, acessibilidade: $$(".ve-ac:checked", m).map(function (x) { return x.value; }), cilindrada: g.tipo === "moto" ? (g.id === "MOT1" ? 160 : 300) : null });
      FC.audit(novo ? "Veículo cadastrado" : "Veículo editado", v.id, $("#ve-mot", m).value.trim(), "ok"); FC.save(); FC.closeModal(); FC.toast("Veículo salvo.", "ok"); FC.render();
    });
    var ina = $("#ve-ina", m);
    if (ina) ina.addEventListener("click", function () {
      var fut = FC.db.reservas.filter(function (r) { return r.veiculoId === v.id && (r.estado === "confirmada" || r.estado === "aguardando_pagamento"); });
      if (v.ativo && fut.length) { FC.toast("Há " + fut.length + " reserva(s) futura(s) para esta unidade. Trate-as antes de inativar.", "bad"); return; }
      v.ativo = !v.ativo; FC.audit(v.ativo ? "Veículo reativado" : "Veículo inativado", v.id, $("#ve-mot", m).value.trim(), "ok"); FC.save(); FC.closeModal(); FC.render();
    });
  }
  function historicoVeiculo(v) {
    var mov = FC.db.movimentos.filter(function (x) { return x.veiculoId === v.id; }).sort(function (a, b) { return new Date(b.data) - new Date(a.data); });
    var ag = FC.db.agenda.filter(function (a) { return a.veiculoId === v.id && new Date(a.fim) > new Date(Date.now() - 30 * 864e5); }).sort(function (a, b) { return new Date(a.inicio) - new Date(b.inicio); });
    FC.modal("Histórico — " + v.modelo + " (" + v.id + ")", '<div class="grid-2"><div><h3 class="t-h4">Movimentações' + rf("RF02") + '</h3><ul class="events">' + mov.map(function (x) { return "<li><time>" + FC.dtBR(x.data) + "</time>" + (x.de ? esc(x.de) + " → " : "") + esc(x.para) + " · " + esc(x.motivo) + ' <span class="muted">(' + esc(x.autor) + ")</span></li>"; }).join("") + "</ul></div>" +
      '<div><h3 class="t-h4">Agenda (30 dias passados e futuros)' + rf("RF03") + '</h3><ul class="events">' + (ag.map(function (a) { return "<li><time>" + FC.dtBR(a.inicio) + " → " + FC.dtBR(a.fim) + "</time>" + esc(a.tipo) + " · " + esc(a.ref || "") + "</li>"; }).join("") || "<li>Sem compromissos.</li>") + "</ul></div></div>", { wide: true });
  }

  /* ---------- Agenda (RF03) ---------- */
  var agF = { loja: "", de: "", dias: 14 };
  P.agenda = function (main) {
    var f = agF;
    if (!f.de) f.de = FC.isoDate(new Date());
    var ini = new Date(f.de + "T00:00:00"), fim = new Date(ini.getTime() + f.dias * 864e5);
    var vs = FC.db.veiculos.filter(function (v) { return v.ativo && FC.noEscopo(v.localAtual) && (!f.loja || v.localAtual === f.loja); });
    var span = fim - ini;
    main.innerHTML = FC.head("Agenda de disponibilidade" + rf("RF03"), "Locação, reserva, manutenção, transferência e bloqueio de pagamento por intervalo.") +
      '<form class="box form-grid form-grid--3" style="margin-bottom:16px" id="ag-f">' + FC.fld("Loja", FC.selLojaEscopo("ag-l", f.loja)) + FC.fld("A partir de", '<input class="inp" type="date" id="ag-de" value="' + f.de + '">') + FC.fld("Dias", '<select class="sel" id="ag-d">' + [7, 14, 30].map(function (d) { return "<option" + (d === f.dias ? " selected" : "") + ">" + d + "</option>"; }).join("") + "</select>") + "</form>" +
      '<div class="legend"><span><i class="tl-locacao"></i>Locação</span><span><i class="tl-reserva"></i>Reserva</span><span><i class="tl-manutencao"></i>Manutenção</span><span><i class="tl-transferencia"></i>Transferência</span><span><i class="tl-bloqueio"></i>Bloqueio (pagamento)</span></div>' +
      '<div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th style="width:220px">Unidade</th><th>' + FC.dataBR(ini) + " → " + FC.dataBR(fim) + "</th></tr></thead><tbody>" +
      vs.map(function (v) {
        var ag = FC.db.agenda.filter(function (a) { return a.veiculoId === v.id && new Date(a.fim) > ini && new Date(a.inicio) < fim; });
        return "<tr><td><strong>" + v.id + "</strong> " + esc(v.modelo) + '<br><span class="small muted">' + esc(v.localAtual) + "</span></td><td><div class=\"timeline\">" + ag.map(function (a) {
          var l = Math.max(0, (new Date(a.inicio) - ini) / span * 100), w = Math.min(100 - l, (Math.min(new Date(a.fim), fim) - Math.max(new Date(a.inicio), ini)) / span * 100);
          return '<span class="tl-' + a.tipo + '" style="left:' + l.toFixed(2) + "%;width:" + Math.max(w, 0.8).toFixed(2) + '%" title="' + esc(a.tipo + " " + (a.ref || "") + " " + FC.dtBR(a.inicio) + "–" + FC.dtBR(a.fim)) + '">' + esc(a.ref || a.tipo) + "</span>";
        }).join("") + "</div></td></tr>";
      }).join("") + "</tbody></table></div>";
    $("#ag-f", main).addEventListener("change", function () { f.loja = $("#ag-l", main).value; f.de = $("#ag-de", main).value; f.dias = +$("#ag-d", main).value; FC.render(); });
  };

  /* ---------- Transferências (RF64, RF94, RF86) ---------- */
  P.transferencias = function (main) {
    var lista = FC.db.transferencias.filter(function (t) { return FC.noEscopo(t.origem) || FC.noEscopo(t.destino); }).sort(function (a, b) { return new Date(b.saidaPrevista) - new Date(a.saidaPrevista); });
    main.innerHTML = FC.head("Transferências entre lojas" + rf("RF64", "RF94"), "Viabilidade calculada pela chegada prevista (distância ÷ velocidade média + margem de preparação), não só pela distância.", '<button class="btn btn--primary" type="button" id="tr-novo">' + icon("plus", 16) + "Planejar transferência</button>") +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Veículo</th><th>Origem → destino</th><th>Responsável</th><th>Saída prevista</th><th>Chegada prevista</th><th>Reserva</th><th>Status</th><th></th></tr></thead><tbody>' +
      (lista.map(function (t) {
        var v = FC.veiculoById(t.veiculoId); var atras = t.status !== "concluida" && new Date(t.chegadaPrevista) < new Date();
        return "<tr><td>" + esc(t.id) + "</td><td>" + esc(v.modelo) + " (" + v.id + ")</td><td>" + esc(t.origem) + " → " + esc(t.destino) + "</td><td>" + esc(t.responsavel) + "</td><td>" + FC.dtBR(t.saidaPrevista) + "</td><td>" + FC.dtBR(t.chegadaPrevista) + (atras ? ' <span class="status status--bad">atrasada</span>' : "") + "</td><td>" + esc(t.reserva || "—") + "</td><td>" + esc(t.status) + '</td><td class="actions">' +
          (t.status === "planejada" ? '<button class="btn btn--ghost btn--sm" type="button" data-tr="' + t.id + '|em trânsito">Iniciar</button> ' : "") + (t.status !== "concluida" ? '<button class="btn btn--primary btn--sm" type="button" data-tr="' + t.id + '|concluida">Concluir</button>' : esc(t.concluidaEm ? FC.dtBR(t.concluidaEm) : "")) + "</td></tr>";
      }).join("") || '<tr><td colspan="9" class="empty">Nenhuma transferência.</td></tr>') + "</tbody></table></div>";
    main.addEventListener("click", function (e) {
      var b = e.target.closest("[data-tr]"); if (!b) return;
      var p = b.dataset.tr.split("|"), t = FC.db.transferencias.filter(function (x) { return x.id === p[0]; })[0], v = FC.veiculoById(t.veiculoId);
      t.status = p[1];
      if (p[1] === "concluida") {
        t.concluidaEm = new Date().toISOString();
        FC.db.movimentos.push({ id: FC.uid("M"), veiculoId: v.id, data: t.concluidaEm, de: t.origem, para: t.destino, motivo: "Transferência " + t.id + (t.reserva ? " (reserva " + t.reserva + ")" : ""), autor: FC.autorAtual() });
        v.localAtual = t.destino;
        FC.db.agenda = FC.db.agenda.filter(function (a) { return a.ref !== t.id; });
      }
      FC.audit("Transferência " + p[1], t.id, "", "ok"); FC.save(); FC.render();
    });
    $("#tr-novo", main).addEventListener("click", function () {
      var vs = FC.db.veiculos.filter(function (v) { return v.ativo && FC.noEscopo(v.localAtual); });
      var m = FC.modal("Planejar transferência", '<form class="form-grid" id="tn-f" novalidate>' + FC.fld("Veículo", '<select class="sel" id="tn-v">' + vs.map(function (v) { return '<option value="' + v.id + '">' + v.id + " " + esc(v.modelo) + " (em " + v.localAtual + ")</option>"; }).join("") + "</select>", null, "span-all") +
        FC.fld("Destino", '<select class="sel" id="tn-d">' + FC.lojaOptions("") + "</select>") + FC.fld("Responsável", '<input class="inp" id="tn-r" value="' + esc(FC.autorAtual()) + '">') + FC.fld("Saída prevista", '<input class="inp" type="datetime-local" id="tn-s" value="' + FC.isoDate(new Date()) + "T" + FC.horaBR(new Date(Date.now() + 36e5)) + '">') +
        FC.fld("Margem de preparação (min)", '<input class="inp" type="number" min="0" id="tn-m" value="' + FC.cfg().margemPreparacaoMin + '">') + '<div class="span-all" id="tn-est"></div><div class="span-all"><button class="btn btn--primary" type="submit">Planejar</button></div></form>');
      function est() {
        var v = FC.veiculoById($("#tn-v", m).value), d = FC.lojaById($("#tn-d", m).value), o = FC.lojaById(v.localAtual);
        var km = FC.distKm(o, d), min = Math.ceil(km / FC.cfg().velocidadeMediaKmh * 60) + +$("#tn-m", m).value;
        var cheg = new Date(new Date($("#tn-s", m).value).getTime() + min * 60000);
        $("#tn-est", m).innerHTML = '<div class="note">' + icon("truck", 16) + "<span>" + km.toFixed(1) + " km em linha reta · estimativa operacional " + min + " min (incluindo margem) · chegada prevista " + FC.dtBR(cheg) + "</span></div>";
        return { v: v, o: o, d: d, cheg: cheg, km: km };
      }
      ["#tn-v", "#tn-d", "#tn-s", "#tn-m"].forEach(function (x) { $(x, m).addEventListener("change", est); });
      est();
      $("#tn-f", m).addEventListener("submit", function (e) {
        e.preventDefault(); var x = est();
        if (x.o.id === x.d.id) { FC.toast("Origem e destino iguais.", "bad"); return; }
        var sai = new Date($("#tn-s", m).value);
        if (FC.conflitos(x.v.id, sai, x.cheg).length) { FC.toast("A unidade tem compromisso no período da transferência.", "bad"); return; }
        var t = { id: "TR-" + (FC.db.transferencias.length + 1), veiculoId: x.v.id, origem: x.o.id, destino: x.d.id, responsavel: $("#tn-r", m).value.trim(), saidaPrevista: sai.toISOString(), chegadaPrevista: x.cheg.toISOString(), margemMin: +$("#tn-m", m).value, status: "planejada", motivo: "Planejamento manual", reserva: null, concluidaEm: null };
        FC.db.transferencias.push(t); FC.db.agenda.push({ id: FC.uid("AG"), veiculoId: x.v.id, inicio: t.saidaPrevista, fim: t.chegadaPrevista, tipo: "transferencia", ref: t.id });
        FC.audit("Transferência planejada", t.id, x.o.id + "→" + x.d.id, "ok"); FC.save(); FC.closeModal(); FC.render();
      });
    });
  };

  /* ---------- Manutenção (RF65, RF86) ---------- */
  P.manutencao = function (main) {
    var lista = FC.db.manutencoes.filter(function (x) { return FC.noEscopo(FC.veiculoById(x.veiculoId).localAtual); });
    var porKm = FC.db.veiculos.filter(function (v) { return v.ativo && FC.noEscopo(v.localAtual) && v.km >= v.proximaRevisaoKm - 1000; });
    var afet = FC.reservasAfetadas();
    main.innerHTML = FC.head("Manutenção" + rf("RF65", "RF86"), "Programação por prazo ou quilometragem. A agenda impede alocação conflitante e lista as reservas afetadas.", '<button class="btn btn--primary" type="button" id="mn-novo">' + icon("plus", 16) + "Programar manutenção</button>") +
      (afet.length ? '<div class="box" style="margin-bottom:16px"><h3>Reservas afetadas — tratar com o cliente</h3><ul class="events">' + afet.map(function (a) { return "<li><strong>" + a.reserva.codigo + "</strong> · " + esc(a.motivo) + " · retirada " + FC.dtBR(a.reserva.inicio) + ' <button class="btn btn--ghost btn--sm" type="button" data-af="' + a.reserva.codigo + "|" + a.motivo + '">Registrar alternativa</button></li>'; }).join("") + "</ul></div>" : "") +
      (porKm.length ? '<div class="note note--warn" style="margin-bottom:16px">' + icon("wrench", 16) + "<span>Revisão por quilometragem próxima: " + porKm.map(function (v) { return v.id + " (" + v.km.toLocaleString("pt-BR") + "/" + v.proximaRevisaoKm.toLocaleString("pt-BR") + " km)"; }).join(", ") + "</span></div>" : "") +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Veículo</th><th>Motivo</th><th>Início</th><th>Fim</th><th>Status</th><th></th></tr></thead><tbody>' +
      (lista.map(function (x) { var v = FC.veiculoById(x.veiculoId); return "<tr><td>" + esc(x.id) + "</td><td>" + esc(v.modelo) + " (" + v.id + ")</td><td>" + esc(x.motivo) + "</td><td>" + FC.dtBR(x.inicio) + "</td><td>" + FC.dtBR(x.fim) + "</td><td>" + esc(x.status) + '</td><td class="actions">' + (x.status === "programada" ? '<button class="btn btn--ghost btn--sm" type="button" data-mn="' + x.id + '|em andamento">Iniciar</button> ' : "") + (x.status !== "concluída" ? '<button class="btn btn--primary btn--sm" type="button" data-mn="' + x.id + '|concluída">Concluir</button>' : "") + "</td></tr>"; }).join("") || '<tr><td colspan="7" class="empty">Nenhuma.</td></tr>') + "</tbody></table></div>";
    main.addEventListener("click", function (e) {
      var af = e.target.closest("[data-af]"); if (af) { var p = af.dataset.af.split("|"); FC.tratarAfetada(FC.reservaByCodigo(p[0]), p[1]); return; }
      var b = e.target.closest("[data-mn]"); if (!b) return;
      var q = b.dataset.mn.split("|"), x = FC.db.manutencoes.filter(function (y) { return y.id === q[0]; })[0];
      x.status = q[1];
      if (q[1] === "em andamento") { x.inicioReal = new Date().toISOString(); FC.db.agenda.forEach(function (a) { if (a.ref === x.id) a.inicio = x.inicioReal; }); }
      if (q[1] === "concluída") { x.fimReal = new Date().toISOString(); FC.db.agenda.forEach(function (a) { if (a.ref === x.id) a.fim = x.fimReal; }); var v = FC.veiculoById(x.veiculoId); if (v.km >= v.proximaRevisaoKm - 1000) v.proximaRevisaoKm += 10000; }
      FC.audit("Manutenção " + q[1], x.id, "", "ok"); FC.save(); FC.render();
    });
    $("#mn-novo", main).addEventListener("click", function () {
      var vs = FC.db.veiculos.filter(function (v) { return v.ativo && FC.noEscopo(v.localAtual); });
      var m = FC.modal("Programar manutenção", '<form class="form-grid" id="mn-f" novalidate>' + FC.fld("Veículo", '<select class="sel" id="mn-v">' + vs.map(function (v) { return '<option value="' + v.id + '">' + v.id + " " + esc(v.modelo) + " · " + v.km.toLocaleString("pt-BR") + " km</option>"; }).join("") + "</select>", null, "span-all") +
        FC.fld("Motivo", '<select class="sel" id="mn-m"><option>Revisão por prazo</option><option>Revisão por quilometragem</option><option>Reparo</option><option>Higienização</option></select>') + FC.fld("Responsável", '<input class="inp" id="mn-r" value="' + esc(FC.autorAtual()) + '">') +
        FC.fld("Início", '<input class="inp" type="datetime-local" id="mn-i">') + FC.fld("Fim previsto", '<input class="inp" type="datetime-local" id="mn-fm">') + '<div class="span-all" id="mn-conf"></div><div class="span-all"><button class="btn btn--primary" type="submit">Programar</button></div></form>');
      $("#mn-f", m).addEventListener("submit", function (e) {
        e.preventDefault();
        var i = new Date($("#mn-i", m).value), f = new Date($("#mn-fm", m).value), vid = $("#mn-v", m).value;
        if (isNaN(i) || isNaN(f) || f <= i) { FC.toast("Informe início e fim válidos.", "bad"); return; }
        var conf = FC.conflitos(vid, i, f).filter(function (a) { return a.tipo === "reserva" || a.tipo === "bloqueio" || a.tipo === "locacao"; });
        if (conf.some(function (a) { return a.tipo === "locacao"; })) { FC.toast("Unidade está locada no período — não é possível programar.", "bad"); return; }
        var x = { id: "MAN-" + (FC.db.manutencoes.length + 1), veiculoId: vid, motivo: $("#mn-m", m).value, inicio: i.toISOString(), fim: f.toISOString(), status: "programada", responsavel: $("#mn-r", m).value.trim(), afetadas: conf.map(function (a) { return a.ref; }) };
        FC.db.manutencoes.push(x); FC.db.agenda.push({ id: FC.uid("AG"), veiculoId: vid, inicio: x.inicio, fim: x.fim, tipo: "manutencao", ref: x.id });
        FC.audit("Manutenção programada", x.id, x.motivo, conf.length ? conf.length + " reserva(s) afetada(s)" : "ok"); FC.save(); FC.closeModal();
        FC.toast(conf.length ? conf.length + " reserva(s) afetada(s) — trate com os clientes." : "Manutenção programada.", conf.length ? "bad" : "ok"); FC.render();
      });
    });
  };

  /* ---------- Motoristas (RF73) ---------- */
  P.motoristas = function (main) {
    var pode = FC.pode("motoristas");
    main.innerHTML = FC.head("Motoristas contratados" + rf("RF73", "RN03"), "Habilitação, restrições, lojas atendidas e agenda. O sistema impede designação incompatível ou em horário conflitante.", pode ? '<button class="btn btn--primary" type="button" id="mt-novo">' + icon("plus", 16) + "Cadastrar motorista</button>" : "") +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nome</th><th>CNH</th><th>Validade</th><th>Lojas</th><th>Próximas designações</th><th>Situação</th><th></th></tr></thead><tbody>' +
      FC.db.motoristas.map(function (d) {
        var ag = FC.db.agenda.filter(function (a) { return a.tipo === "motorista" && a.motoristaId === d.id && new Date(a.fim) > new Date(); });
        return "<tr><td>" + esc(d.nome) + "</td><td>" + d.categoria + "</td><td>" + FC.dataBR(d.validade) + (new Date(d.validade) < new Date(Date.now() + 60 * 864e5) ? ' <span class="status status--warn">vence em breve</span>' : "") + "</td><td>" + d.lojas.join(", ") + "</td><td>" + (ag.map(function (a) { return esc(a.ref) + " (" + FC.dataBR(a.inicio) + ")"; }).join("<br>") || "—") + "</td><td>" + (d.ativo ? '<span class="status status--ok">ativo</span>' : '<span class="status status--muted">inativo</span>') + '</td><td>' + (pode ? '<button class="btn btn--ghost btn--sm" type="button" data-md="' + d.id + '">Editar</button>' : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" + '<p class="small muted" style="margin-top:12px">Requisitos profissionais do motorista (ex.: EAR) dependem de PM11 e verificação oficial.</p>';
    function editar(d) {
      var novo = !d; d = d || { id: "D" + (FC.db.motoristas.length + 1), nome: "", categoria: "B", validade: new Date(Date.now() + 365 * 864e5).toISOString(), restricoes: [], lojas: [], ativo: true };
      var m = FC.modal(novo ? "Cadastrar motorista" : "Editar motorista", '<form class="form-grid" id="md-f">' + FC.fld("Nome", '<input class="inp" id="md-n" value="' + esc(d.nome) + '">') + FC.fld("Categoria", '<select class="sel" id="md-c">' + ["B", "AB", "C", "D", "E", "AC", "AD", "AE"].map(function (c) { return "<option" + (c === d.categoria ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select>") +
        FC.fld("Validade da CNH", '<input class="inp" type="date" id="md-v" value="' + FC.isoDate(d.validade) + '">') + '<label class="chk"><input type="checkbox" id="md-a"' + (d.ativo ? " checked" : "") + "> Ativo</label>" +
        '<fieldset class="fld span-all"><legend>Lojas atendidas</legend><div class="row">' + FC.db.lojas.map(function (l) { return '<label class="chk"><input type="checkbox" class="md-l" value="' + l.id + '"' + (d.lojas.indexOf(l.id) >= 0 ? " checked" : "") + "> " + l.id + "</label>"; }).join("") + "</div></fieldset>" +
        '<div class="span-all"><button class="btn btn--primary" type="submit">Salvar</button></div></form>', { wide: true });
      $("#md-f", m).addEventListener("submit", function (e) {
        e.preventDefault();
        if (!$("#md-n", m).value.trim()) { FC.toast("Informe o nome.", "bad"); return; }
        var ativoAntes = d.ativo;
        Object.assign(d, { nome: $("#md-n", m).value.trim(), categoria: $("#md-c", m).value, validade: new Date($("#md-v", m).value + "T12:00:00").toISOString(), ativo: $("#md-a", m).checked, lojas: $$(".md-l:checked", m).map(function (x) { return x.value; }) });
        if (novo) FC.db.motoristas.push(d);
        if (ativoAntes && !d.ativo) FC.toast("Reservas futuras com este motorista aparecem como afetadas em Manutenção.", "bad");
        FC.audit(novo ? "Motorista cadastrado" : "Motorista editado", d.id, "", "ok"); FC.save(); FC.closeModal(); FC.render();
      });
    }
    var nv = $("#mt-novo", main); if (nv) nv.addEventListener("click", function () { editar(null); });
    main.addEventListener("click", function (e) { var b = e.target.closest("[data-md]"); if (b) editar(FC.motoristaById(b.dataset.md)); });
  };

  /* ---------- Clientes e documentos (RF67, RF75, RF60) ---------- */
  P.clientes = function (main) {
    main.innerHTML = FC.head("Clientes e documentos" + rf("RF20", "RF67", "RF75"), "Conferência manual de habilitação e bloqueio/revisão de cadastro com motivo e responsável.") +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cliente</th><th>Documento</th><th>CNH</th><th>Situação da CNH</th><th>Cadastro</th><th></th></tr></thead><tbody>' +
      FC.db.clientes.map(function (c) {
        return "<tr><td>" + esc(c.nome) + '<br><span class="small muted">' + esc(c.email) + "</span></td><td>" + esc(c.docTipo) + " " + esc(FC.mascaraDoc(c.doc)) + "</td><td>" + (c.cnh ? esc(c.cnh.categoria) + " · " + FC.dataBR(c.cnh.validade) + ((c.cnh.restricoes || []).length ? "<br><span class=\"small\">" + esc(c.cnh.restricoes.join(", ")) + "</span>" : "") : "—") + "</td><td>" + (c.cnh ? FC.statusDoc(c.cnh.status) : "—") + "</td><td>" + (c.bloqueado ? '<span class="status status--bad">Em revisão</span>' : '<span class="status status--ok">Regular</span>') + '</td><td><button class="btn btn--ghost btn--sm" type="button" data-cl="' + c.id + '">Abrir</button></td></tr>';
      }).join("") + "</tbody></table></div>";
    main.addEventListener("click", function (e) { var b = e.target.closest("[data-cl]"); if (b) abrirCliente(FC.clienteById(b.dataset.cl)); });
  };
  function abrirCliente(c) {
    var rs = FC.db.reservas.filter(function (r) { return r.clienteId === c.id; });
    var pagas = rs.filter(function (r) { return r.estado === "confirmada"; });
    var m = FC.modal(c.nome, '<div class="grid-2"><div class="stack"><div class="box"><h3>CNH' + rf("RF75", "RN08") + "</h3>" + (c.cnh ? '<p class="small">Categoria ' + esc(c.cnh.categoria) + " · validade " + FC.dataBR(c.cnh.validade) + " · restrições: " + esc((c.cnh.restricoes || []).join(", ") || "nenhuma") + "<br>Arquivo: " + esc(c.cnh.arquivo ? c.cnh.arquivo.nome + " (" + c.cnh.arquivo.armazenamento + ")" : "não enviado") + "<br>Situação: " + FC.statusDoc(c.cnh.status) + (c.cnh.analisadoPor ? "<br>Analisado por " + esc(c.cnh.analisadoPor) + " em " + FC.dtBR(c.cnh.analisadoEm) + "<br>Método: " + esc(c.cnh.metodo) : "") + "</p>" +
      '<p class="small muted" style="margin-top:8px">Separe as verificações: leitura/extração dos dados, conferência manual da imagem e verificação oficial de autenticidade (não realizada neste protótipo — sem integração com o Senatran).</p>' +
      (c.cnh.status !== "conferida" || true ? FC.fld("Motivo (para rejeição)", '<input class="inp" id="cc-mot">') + '<div class="row" style="margin-top:8px"><button class="btn btn--primary btn--sm" type="button" id="cc-ok">Conferência manual: aprovar</button><button class="btn btn--danger btn--sm" type="button" id="cc-rej">Rejeitar</button></div>' : "") : '<p class="small muted">Sem CNH cadastrada.</p>') + "</div></div>" +
      '<div class="stack"><div class="box"><h3>Bloqueio / revisão de cadastro' + rf("RF67") + "</h3>" + (c.bloqueado ? '<p class="small">Motivo: ' + esc(c.bloqueado.motivo) + "<br>Por " + esc(c.bloqueado.por) + " em " + FC.dtBR(c.bloqueado.data) + "<br>Revisão prevista: " + FC.dataBR(c.bloqueado.ate) + '</p><button class="btn btn--ghost btn--sm" type="button" id="cb-des" style="margin-top:8px">Desbloquear</button>' :
        FC.fld("Motivo", '<input class="inp" id="cb-m">') + FC.fld("Revisar até", '<input class="inp" type="date" id="cb-a" value="' + FC.isoDate(Date.now() + 7 * 864e5) + '">') + '<button class="btn btn--danger btn--sm" type="button" id="cb-ok" style="margin-top:8px">Colocar em revisão</button>') +
      (pagas.length ? '<p class="small" style="margin-top:8px">Reservas pagas que precisam de tratamento (não são canceladas automaticamente): ' + pagas.map(function (r) { return '<a class="link" href="#/admin/reserva/' + r.codigo + '">' + r.codigo + "</a>"; }).join(", ") + "</p>" : "") + "</div>" +
      '<div class="box"><h3>Reservas</h3><ul class="events">' + rs.slice(-8).reverse().map(function (r) { return '<li><a class="link" href="#/admin/reserva/' + r.codigo + '">' + r.codigo + "</a> · " + FC.dataBR(r.inicio) + " · " + (FC.ESTADOS[r.estado] || r.estado) + "</li>"; }).join("") + "</ul></div></div></div>", { wide: true });
    var ok = $("#cc-ok", m);
    if (ok) ok.addEventListener("click", function () { c.cnh.status = "conferida"; c.cnh.analisadoPor = FC.autorAtual(); c.cnh.analisadoEm = new Date().toISOString(); c.cnh.metodo = "Conferência manual de imagem — não é verificação oficial"; c.cnh.motivoRejeicao = null; FC.outbox(c.email, "e-mail", "documentos", "CNH conferida", "Sua CNH foi conferida manualmente."); FC.audit("CNH conferida", c.id, "manual", "ok"); FC.save(); FC.closeModal(); FC.render(); });
    var rej = $("#cc-rej", m);
    if (rej) rej.addEventListener("click", function () { var mo = $("#cc-mot", m).value.trim(); if (!mo) { FC.toast("Informe o motivo da rejeição.", "bad"); return; } c.cnh.status = "rejeitada"; c.cnh.motivoRejeicao = mo; c.cnh.analisadoPor = FC.autorAtual(); c.cnh.analisadoEm = new Date().toISOString(); FC.outbox(c.email, "e-mail", "documentos", "CNH rejeitada — envie novamente", "Motivo: " + mo + ". Envie um novo arquivo em Minha conta > Documentos."); FC.audit("CNH rejeitada", c.id, mo, "ok"); FC.save(); FC.closeModal(); FC.render(); });
    var bo = $("#cb-ok", m);
    if (bo) bo.addEventListener("click", function () { var mo = $("#cb-m", m).value.trim(); if (mo.length < 5) { FC.toast("Informe o motivo.", "bad"); return; } c.bloqueado = { motivo: mo, por: FC.autorAtual(), data: new Date().toISOString(), ate: new Date($("#cb-a", m).value + "T12:00:00").toISOString() }; pagas.forEach(function (r) { FC.evento(r, "Cliente em revisão — reserva paga mantida para tratamento"); }); FC.audit("Cliente em revisão", c.id, mo, "ok"); FC.save(); FC.closeModal(); FC.render(); });
    var de = $("#cb-des", m);
    if (de) de.addEventListener("click", function () { FC.audit("Cliente desbloqueado", c.id, c.bloqueado.motivo, "ok"); c.bloqueado = null; FC.save(); FC.closeModal(); FC.render(); });
  }

  /* ---------- Atendimento (RF83, RF59) ---------- */
  P.atendimento = function (main) {
    var lista = FC.db.chamados.filter(function (h) { return !h.loja || FC.noEscopo(h.loja); });
    main.innerHTML = FC.head("Atendimento" + rf("RF83", "RF59"), "Chamados com protocolo, canal, atendente, loja, status e histórico. Atendimentos por WhatsApp e telefone são registrados manualmente — não há integração automática.", '<button class="btn btn--primary" type="button" id="at-man">' + icon("plus", 16) + "Registrar atendimento manual</button>") +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Protocolo</th><th>Cliente</th><th>Canal</th><th>Assunto</th><th>Loja</th><th>Atendente</th><th>Status</th><th></th></tr></thead><tbody>' +
      (lista.map(function (h) { var c = FC.clienteById(h.clienteId); return "<tr><td>" + esc(h.protocolo) + "</td><td>" + esc(c ? c.nome : "—") + "</td><td>" + esc(FC.CANAIS[h.canal] || h.canal) + "</td><td>" + esc(h.assunto) + "</td><td>" + esc(h.loja || "—") + "</td><td>" + esc(h.atendente || "—") + "</td><td>" + esc(h.status) + '</td><td><button class="btn btn--ghost btn--sm" type="button" data-ch="' + h.protocolo + '">Abrir</button></td></tr>'; }).join("") || '<tr><td colspan="8" class="empty">Nenhum chamado.</td></tr>') + "</tbody></table></div>";
    main.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ch]"); if (!b) return;
      var h = FC.db.chamados.filter(function (x) { return x.protocolo === b.dataset.ch; })[0], c = FC.clienteById(h.clienteId);
      var m = FC.modal(h.protocolo + " — " + h.assunto, '<ul class="events">' + h.historico.map(function (x) { return "<li><time>" + FC.dtBR(x.data) + "</time><strong>" + esc(x.autor) + ":</strong> " + esc(x.texto) + "</li>"; }).join("") + "</ul>" + (h.anexos.length ? '<p class="small">Anexos (armazenamento privado simulado): ' + h.anexos.map(function (a) { return esc(a.nome); }).join(", ") + "</p>" : "") +
        FC.fld("Resposta", '<textarea class="txt" id="ch-r"></textarea>') + FC.fld("Status", '<select class="sel" id="ch-s">' + ["aberto", "em andamento", "respondido", "encerrado"].map(function (s) { return "<option" + (s === h.status ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>") + '<button class="btn btn--primary" type="button" id="ch-ok" style="margin-top:12px">Salvar</button>');
      $("#ch-ok", m).addEventListener("click", function () {
        var t = $("#ch-r", m).value.trim();
        if (t) { h.historico.push({ data: new Date().toISOString(), autor: FC.autorAtual(), texto: t }); if (c) FC.outbox(c.email, "e-mail", "suporte", "Resposta ao chamado " + h.protocolo, t); }
        h.status = $("#ch-s", m).value; h.atendente = FC.autorAtual();
        FC.audit("Chamado atualizado", h.protocolo, h.status, "ok"); FC.save(); FC.closeModal(); FC.render();
      });
    });
    $("#at-man", main).addEventListener("click", function () {
      var m = FC.modal("Registrar atendimento manual", '<form class="form-grid" id="am-f">' + FC.fld("Canal", '<select class="sel" id="am-c"><option value="whatsapp">WhatsApp</option><option value="telefone">Telefone</option><option value="loja">Presencial</option></select>') + FC.fld("Cliente", '<select class="sel" id="am-cl"><option value="">Não identificado</option>' + FC.db.clientes.map(function (c) { return '<option value="' + c.id + '">' + esc(c.nome) + "</option>"; }).join("") + "</select>") +
        FC.fld("Assunto", '<input class="inp" id="am-a">') + FC.fld("Loja", FC.selLojaEscopo("am-l", "", false)) + FC.fld("Resumo e resultado", '<textarea class="txt" id="am-r"></textarea>', null, "span-all") + '<div class="span-all"><button class="btn btn--primary" type="submit">Registrar</button></div></form>');
      $("#am-f", m).addEventListener("submit", function (e) {
        e.preventDefault();
        if (!$("#am-a", m).value.trim() || !$("#am-r", m).value.trim()) { FC.toast("Assunto e resumo são obrigatórios.", "bad"); return; }
        var h = { protocolo: "SUP-" + (1000 + FC.db.chamados.length + 1), clienteId: $("#am-cl", m).value || null, canal: $("#am-c", m).value, assunto: $("#am-a", m).value.trim(), status: "encerrado", loja: $("#am-l", m).value, atendente: FC.autorAtual(), criadoEm: new Date().toISOString(), historico: [{ data: new Date().toISOString(), autor: FC.autorAtual(), texto: "[Registro manual] " + $("#am-r", m).value.trim() }], anexos: [] };
        FC.db.chamados.unshift(h); FC.audit("Atendimento manual registrado", h.protocolo, h.canal, "ok"); FC.save(); FC.closeModal(); FC.render();
      });
    });
  };

  /* ---------- Pedidos de privacidade (RF89) ---------- */
  P.lgpd = function (main) {
    main.innerHTML = FC.head("Pedidos de privacidade" + rf("RF89", "RNF08"), "Acesso, correção e exclusão, com identidade verificada no pedido e justificativa de retenção quando aplicável.") +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Protocolo</th><th>Cliente</th><th>Tipo</th><th>Detalhes</th><th>Data</th><th>Status</th><th></th></tr></thead><tbody>' +
      (FC.db.lgpd.map(function (p, i) { var c = FC.clienteById(p.clienteId); return "<tr><td>" + esc(p.protocolo) + "</td><td>" + esc(c ? c.nome : "—") + "</td><td>" + esc(p.tipo) + "</td><td>" + esc(p.detalhes || "—") + "</td><td>" + FC.dtBR(p.data) + "</td><td>" + esc(p.status) + "</td><td>" + (p.status !== "concluído" ? '<button class="btn btn--ghost btn--sm" type="button" data-lp="' + i + '">Responder</button>' : "") + "</td></tr>"; }).join("") || '<tr><td colspan="7" class="empty">Nenhum pedido. Clientes abrem pedidos em Minha conta > Privacidade.</td></tr>') + "</tbody></table></div>";
    main.addEventListener("click", function (e) {
      var b = e.target.closest("[data-lp]"); if (!b) return;
      var p = FC.db.lgpd[+b.dataset.lp], c = FC.clienteById(p.clienteId);
      var m = FC.modal("Responder " + p.protocolo, FC.fld("Resposta ao titular", '<textarea class="txt" id="lr-t">' + (p.tipo.indexOf("Exclusão") >= 0 ? "Dados cadastrais excluídos. Contratos, pagamentos e infrações mantidos pelo prazo legal (retenção justificada)." : "") + "</textarea>") + '<button class="btn btn--primary" type="button" id="lr-ok" style="margin-top:12px">Concluir</button>');
      $("#lr-ok", m).addEventListener("click", function () { p.resposta = $("#lr-t", m).value.trim() || "Pedido atendido."; p.status = "concluído"; if (c) FC.outbox(c.email, "e-mail", "privacidade", "Pedido " + p.protocolo + " concluído", p.resposta); FC.audit("Pedido de privacidade concluído", p.protocolo, p.tipo, "ok"); FC.save(); FC.closeModal(); FC.render(); });
    });
  };

  /* ---------- Caixa de saída (RF85, RF68, RF25) ---------- */
  P.saida = function (main) {
    main.innerHTML = FC.head("Caixa de saída demonstrativa" + rf("RF85", "RF68", "RF25"), "Mensagens e documentos que seriam enviados, com destinatário, evento e resultado — sem serviço pago. Lembretes aparecem como agendados.") +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Para</th><th>Canal</th><th>Evento</th><th>Assunto</th><th>Resultado</th><th></th></tr></thead><tbody>' +
      (FC.db.saida.slice(0, 150).map(function (m) { return "<tr><td>" + FC.dtBR(m.data) + (m.agendadoPara ? '<br><span class="small muted">agendado: ' + FC.dtBR(m.agendadoPara) + "</span>" : "") + "</td><td>" + esc(m.para) + "</td><td>" + esc(m.canal) + "</td><td>" + esc(m.evento) + "</td><td><strong>" + esc(m.assunto) + '</strong><br><span class="small muted">' + esc(m.corpo) + "</span></td><td>" + esc(m.status) + '</td><td class="actions">' + (m.status !== "falha" ? '<button class="btn btn--ghost btn--sm" type="button" data-fl="' + m.id + '">Simular falha</button>' : '<button class="btn btn--ghost btn--sm" type="button" data-re="' + m.id + '">Reenviar</button>') + "</td></tr>"; }).join("") || '<tr><td colspan="7" class="empty">Nenhuma mensagem ainda.</td></tr>') + "</tbody></table></div>" +
      '<p class="small muted" style="margin-top:12px">Uma falha de envio não desfaz a reserva paga nem gera nova confirmação; o reenvio usa a mesma reserva.' + rf("RNF40") + "</p>";
    main.addEventListener("click", function (e) {
      var f = e.target.closest("[data-fl]"), r = e.target.closest("[data-re]");
      var id = (f || r || {}).dataset; if (!id) return;
      var m = FC.db.saida.filter(function (x) { return x.id === (id.fl || id.re); })[0];
      m.status = f ? "falha" : "entregue (reenvio simulado)"; FC.audit(f ? "Falha de envio simulada" : "Mensagem reenviada", m.id, m.evento, m.status); FC.save(); FC.render();
    });
  };

  /* ---------- Relatórios (RF11, RF69) ---------- */
  var relF = null;
  P.relatorios = function (main) {
    if (!relF) relF = { de: FC.isoDate(Date.now() - 180 * 864e5), ate: FC.isoDate(Date.now() + 30 * 864e5), loja: "", tipo: "" };
    var f = relF;
    var de = new Date(f.de + "T00:00:00"), ate = new Date(f.ate + "T23:59:59");
    var rs = FC.db.reservas.filter(function (r) {
      if (!FC.noEscopo(r.lojaRetirada)) return false;
      if (new Date(r.inicio) < de || new Date(r.inicio) > ate) return false;
      if (f.loja && r.lojaRetirada !== f.loja) return false;
      if (f.tipo && r.tipo !== f.tipo) return false;
      return true;
    });
    var validas = rs.filter(function (r) { return ["confirmada", "em_andamento", "encerrada"].indexOf(r.estado) >= 0; });
    var receita = validas.reduce(function (s, r) { return s + r.preco.total; }, 0);
    var diarias = validas.reduce(function (s, r) { return s + FC.duracao(r.inicio, r.fim).periodos; }, 0);
    var canc = rs.filter(function (r) { return r.estado === "cancelada"; }).length;
    var aval = validas.filter(function (r) { return r.avaliacao; });
    var media = aval.length ? aval.reduce(function (s, r) { return s + r.avaliacao.nota; }, 0) / aval.length : 0;
    function agrupa(fn) { var o = {}; validas.forEach(function (r) { var k = fn(r); o[k] = o[k] || { n: 0, v: 0 }; o[k].n++; o[k].v += r.preco.total; }); return o; }
    function barras(o, rotulo) {
      var ks = Object.keys(o).sort(function (a, b) { return o[b].v - o[a].v; }); var max = Math.max.apply(null, ks.map(function (k) { return o[k].v; }).concat([1]));
      return '<div class="bars">' + ks.map(function (k) { return '<div class="bar"><span>' + esc(rotulo ? rotulo(k) : k) + '</span><div class="bar__track"><div class="bar__fill" style="width:' + (o[k].v / max * 100).toFixed(1) + '%"></div></div><span class="num small">' + o[k].n + " · " + brl(o[k].v) + "</span></div>"; }).join("") + "</div>";
    }
    var meses = agrupa(function (r) { return r.inicio.slice(0, 7); });
    main.innerHTML = FC.head("Relatórios de locações" + rf("RF11", "RF69"), "Indicadores e fórmulas provisórios — dependem da decisão DP05. Valores em reais, fuso local.", '<button class="btn btn--ghost" type="button" id="rl-csv">' + icon("doc", 16) + "Exportar CSV</button>") +
      '<form class="box form-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px" id="rl-f">' + FC.fld("De", '<input class="inp" type="date" id="rl-de" value="' + f.de + '">') + FC.fld("Até", '<input class="inp" type="date" id="rl-ate" value="' + f.ate + '">') + FC.fld("Loja", FC.selLojaEscopo("rl-l", f.loja)) +
      FC.fld("Tipo de veículo", '<select class="sel" id="rl-t"><option value="">Todos</option><option value="carro"' + (f.tipo === "carro" ? " selected" : "") + '>Carros</option><option value="moto"' + (f.tipo === "moto" ? " selected" : "") + ">Motos</option></select>") + "</form>" +
      '<div class="kpis">' + [[validas.length, "Locações válidas"], [brl(receita), "Receita (preço contratado)"], [diarias, "Diárias"], [brl(validas.length ? receita / validas.length : 0), "Ticket médio"], [rs.length ? (canc / rs.length * 100).toFixed(1) + "%" : "0%", "Taxa de cancelamento"], [media ? media.toFixed(1) + " ★ (" + aval.length + ")" : "—", "Avaliação média"]].map(function (k) { return '<div class="kpi"><b>' + k[0] + "</b><span>" + k[1] + "</span></div>"; }).join("") + "</div>" +
      '<div class="grid-2"><section class="box"><h3>Por loja</h3>' + barras(agrupa(function (r) { return r.lojaRetirada; }), function (k) { return FC.lojaById(k).nome; }) + '</section><section class="box"><h3>Por grupo</h3>' + barras(agrupa(function (r) { return r.grupo; }), function (k) { return FC.grupoById(k).nome; }) + "</section>" +
      '<section class="box"><h3>Por canal de reserva</h3>' + barras(agrupa(function (r) { return r.canal; }), function (k) { return FC.CANAIS[k] || k; }) + '</section><section class="box"><h3>Por mês de retirada</h3>' + barras(meses) + "</section></div>";
    $("#rl-f", main).addEventListener("change", function () { f.de = $("#rl-de", main).value; f.ate = $("#rl-ate", main).value; f.loja = $("#rl-l", main).value; f.tipo = $("#rl-t", main).value; FC.render(); });
    $("#rl-csv", main).addEventListener("click", function () {
      var linhas = [["codigo", "loja", "grupo", "tipo", "canal", "inicio", "fim", "estado", "total"]].concat(rs.map(function (r) { return [r.codigo, r.lojaRetirada, r.grupo, r.tipo, r.canal, r.inicio, r.fim, r.estado, r.preco.total.toFixed(2)]; }));
      var csv = linhas.map(function (l) { return l.join(";"); }).join("\n");
      var m = FC.modal("Exportar CSV (" + rs.length + " linhas)", '<p class="small muted">Copie o conteúdo abaixo e cole numa planilha. Se o seu navegador permitir, use também o botão de download.</p><textarea class="txt" id="csv-t" style="min-height:280px;font-family:monospace;font-size:12px" readonly>' + esc(csv) + '</textarea><div class="row" style="margin-top:12px"><button class="btn btn--primary" type="button" id="csv-copy">Copiar</button><button class="btn btn--ghost" type="button" id="csv-dl">Tentar baixar arquivo</button></div>', { wide: true });
      $("#csv-copy", m).addEventListener("click", function () {
        var t = $("#csv-t", m); t.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
        if (navigator.clipboard) navigator.clipboard.writeText(csv).then(function () { FC.toast("CSV copiado.", "ok"); }, function () { FC.toast(ok ? "CSV copiado." : "Selecione o texto e copie com Ctrl+C.", ok ? "ok" : "bad"); });
        else FC.toast(ok ? "CSV copiado." : "Selecione o texto e copie com Ctrl+C.", ok ? "ok" : "bad");
      });
      $("#csv-dl", m).addEventListener("click", function () {
        try { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = "locacoes.csv"; document.body.appendChild(a); a.click(); a.remove(); FC.toast("Download solicitado. Se nada baixar, este ambiente bloqueia downloads — use Copiar."); }
        catch (e3) { FC.toast("Este ambiente bloqueia downloads — use Copiar.", "bad"); }
      });
      FC.audit("Relatório exportado", "locações", rs.length + " linhas", "ok"); FC.save();
    });
  };

  /* ---------- Lojas (RF71) ---------- */
  P.lojas = function (main) {
    var pode = FC.pode("lojas");
    main.innerHTML = FC.head("Lojas" + rf("RF71", "RF14", "RF37"), "Coordenadas, contatos, expediente, calendário de exceções e instruções de retirada. Inativar preserva o vínculo com reservas históricas.", pode ? '<button class="btn btn--primary" type="button" id="lj-novo">' + icon("plus", 16) + "Cadastrar loja</button>" : "") +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Código</th><th>Nome</th><th>Cidade</th><th>Expediente</th><th>Exceções</th><th>Situação</th><th></th></tr></thead><tbody>' +
      FC.db.lojas.map(function (l) { return "<tr><td>" + l.id + "</td><td>" + esc(l.nome) + "</td><td>" + esc(l.cidade) + "/" + l.uf + '</td><td class="small">' + esc(FC.horarioTexto(l)) + "</td><td>" + (l.excecoes || []).length + "</td><td>" + (l.ativa ? '<span class="status status--ok">ativa</span>' : '<span class="status status--muted">inativa</span>') + "</td><td>" + (pode ? '<button class="btn btn--ghost btn--sm" type="button" data-lj="' + l.id + '">Editar</button>' : "") + "</td></tr>"; }).join("") + "</tbody></table></div>";
    function editar(l) {
      var novo = !l; l = l || { id: "", nome: "", tipo: "cidade", cidade: "", uf: "", endereco: "", lat: 0, lon: 0, horario: { 0: null, 1: ["08:00", "20:00"], 2: ["08:00", "20:00"], 3: ["08:00", "20:00"], 4: ["08:00", "20:00"], 5: ["08:00", "20:00"], 6: ["08:00", "14:00"] }, excecoes: [], telefone: "", whatsapp: "", instrucoes: "", ativa: true };
      var dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      var m = FC.modal(novo ? "Cadastrar loja" : "Editar " + l.nome, '<form class="form-grid" id="le-f" novalidate>' + FC.fld("Código", '<input class="inp" id="le-id" value="' + esc(l.id) + '"' + (novo ? "" : " disabled") + ' maxlength="6">') + FC.fld("Nome", '<input class="inp" id="le-n" value="' + esc(l.nome) + '">') +
        FC.fld("Tipo", '<select class="sel" id="le-t"><option value="cidade"' + (l.tipo === "cidade" ? " selected" : "") + '>Cidade</option><option value="aeroporto"' + (l.tipo === "aeroporto" ? " selected" : "") + ">Aeroporto</option></select>") + FC.fld("Cidade", '<input class="inp" id="le-c" value="' + esc(l.cidade) + '">') + FC.fld("UF", '<input class="inp" id="le-uf" maxlength="2" value="' + esc(l.uf) + '">') + FC.fld("Endereço", '<input class="inp" id="le-e" value="' + esc(l.endereco) + '">') +
        FC.fld("Latitude", '<input class="inp" id="le-lat" value="' + l.lat + '">') + FC.fld("Longitude", '<input class="inp" id="le-lon" value="' + l.lon + '">') + FC.fld("Telefone", '<input class="inp" id="le-tel" value="' + esc(l.telefone) + '">') + FC.fld("WhatsApp", '<input class="inp" id="le-wa" value="' + esc(l.whatsapp) + '">') +
        '<fieldset class="fld span-all"><legend>Expediente</legend><div class="form-grid form-grid--3">' + [1, 2, 3, 4, 5, 6, 0].map(function (d) { var h = l.horario[d]; return '<div class="fld"><span>' + dias[d] + '</span><div class="row"><label class="chk"><input type="checkbox" class="le-ab" data-d="' + d + '"' + (h ? " checked" : "") + '> Aberta</label><input class="inp le-ha" data-d="' + d + '" type="time" value="' + (h ? h[0] : "08:00") + '" style="width:110px" aria-label="Abre ' + dias[d] + '"><input class="inp le-hf" data-d="' + d + '" type="time" value="' + (h ? h[1] : "20:00") + '" style="width:110px" aria-label="Fecha ' + dias[d] + '"></div></div>'; }).join("") + "</div></fieldset>" +
        FC.fld("Exceções do calendário (uma por linha: AAAA-MM-DD;motivo)", '<textarea class="txt" id="le-ex">' + esc((l.excecoes || []).map(function (e) { return e.data + ";" + e.motivo; }).join("\n")) + "</textarea>", "Datas listadas ficam fechadas.", "span-all") +
        FC.fld("Instruções de retirada", '<textarea class="txt" id="le-ins">' + esc(l.instrucoes) + "</textarea>", null, "span-all") +
        '<label class="chk span-all"><input type="checkbox" id="le-at"' + (l.ativa ? " checked" : "") + "> Loja ativa (inativar não apaga reservas históricas)</label>" +
        '<div class="span-all"><button class="btn btn--primary" type="submit">Salvar</button></div></form>', { wide: true });
      $("#le-f", m).addEventListener("submit", function (e) {
        e.preventDefault(); FC.limparErros(m);
        var id = (novo ? $("#le-id", m).value.trim().toUpperCase() : l.id), lat = parseFloat($("#le-lat", m).value), lon = parseFloat($("#le-lon", m).value);
        var ok = true;
        if (novo && (!/^[A-Z0-9]{3,6}$/.test(id) || FC.lojaById(id))) { FC.erroCampo($("#le-id", m), "Código inválido ou já usado."); ok = false; }
        if (!$("#le-n", m).value.trim()) { FC.erroCampo($("#le-n", m), "Informe o nome."); ok = false; }
        if (isNaN(lat) || Math.abs(lat) > 90) { FC.erroCampo($("#le-lat", m), "Latitude inválida."); ok = false; }
        if (isNaN(lon) || Math.abs(lon) > 180) { FC.erroCampo($("#le-lon", m), "Longitude inválida."); ok = false; }
        if (!ok) return;
        var hor = {}; $$(".le-ab", m).forEach(function (c) { var d = c.dataset.d; hor[d] = c.checked ? [$('.le-ha[data-d="' + d + '"]', m).value, $('.le-hf[data-d="' + d + '"]', m).value] : null; });
        var exc = $("#le-ex", m).value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { var p = x.split(";"); return { data: p[0].trim(), fechado: true, motivo: (p[1] || "Exceção").trim() }; });
        if (!l.ativa === false && !$("#le-at", m).checked) { var fut = FC.db.reservas.filter(function (r) { return (r.lojaRetirada === l.id || r.lojaDevolucao === l.id) && r.estado === "confirmada"; }); if (fut.length) FC.toast(fut.length + " reserva(s) futura(s) nesta loja precisam de tratamento.", "bad"); }
        Object.assign(l, { id: id, nome: $("#le-n", m).value.trim(), tipo: $("#le-t", m).value, cidade: $("#le-c", m).value.trim(), uf: $("#le-uf", m).value.trim().toUpperCase(), endereco: $("#le-e", m).value.trim(), lat: lat, lon: lon, telefone: $("#le-tel", m).value.trim(), whatsapp: $("#le-wa", m).value.trim(), horario: hor, excecoes: exc, instrucoes: $("#le-ins", m).value.trim(), ativa: $("#le-at", m).checked });
        if (novo) { FC.db.lojas.push(l); FC.db.acessorios.forEach(function (a) { a.estoque[l.id] = 0; }); }
        FC.audit(novo ? "Loja cadastrada" : "Loja editada", l.id, "", "ok"); FC.save(); FC.closeModal(); FC.render();
      });
    }
    var nv = $("#lj-novo", main); if (nv) nv.addEventListener("click", function () { editar(null); });
    main.addEventListener("click", function (e) { var b = e.target.closest("[data-lj]"); if (b) editar(FC.lojaById(b.dataset.lj)); });
  };

  /* ---------- Tarifas e políticas (RF72, RNF35) ---------- */
  var tarTab = "tarifas";
  P.tarifas = function (main) {
    var TABS = [["tarifas", "Tabela de diárias"], ["politicas", "Parâmetros e políticas"], ["catalogos", "Proteções e acessórios"], ["cupons", "Cupons"]];
    main.innerHTML = FC.head("Tarifas e políticas" + rf("RF72", "RNF35", "RNF13"), "Alterações criam nova versão com vigência, justificativa e responsável. Reservas já contratadas mantêm a versão usada.") +
      '<div class="tabs" role="tablist">' + TABS.map(function (t) { return '<button type="button" role="tab" aria-selected="' + (t[0] === tarTab) + '" data-tt="' + t[0] + '">' + t[1] + "</button>"; }).join("") + '</div><div id="tt-body"></div>';
    $$("[data-tt]", main).forEach(function (b) { b.addEventListener("click", function () { tarTab = b.dataset.tt; FC.render(); }); });
    var body = $("#tt-body", main);
    if (tarTab === "tarifas") {
      var atual = FC.tarifaVigente();
      body.innerHTML = '<div class="grid-2"><form class="box" id="tf-f"><h3>Nova versão (atual: v' + atual.versao + ')</h3><div class="form-grid">' + FC.db.grupos.map(function (g) { return FC.fld(esc(g.nome), '<input class="inp" type="number" min="1" step="1" data-g="' + g.id + '" value="' + atual.diarias[g.id] + '">'); }).join("") +
        FC.fld("Início da vigência", '<input class="inp" type="datetime-local" id="tf-v" value="' + FC.isoDate(new Date()) + "T" + FC.horaBR(new Date()) + '">') + FC.fld("Justificativa", '<input class="inp" id="tf-j" placeholder="Ex.: resultado da pesquisa de preços">') + '</div><button class="btn btn--primary" type="submit" style="margin-top:12px">Publicar nova versão</button></form>' +
        '<div class="box"><h3>Histórico de versões</h3><ul class="events">' + FC.db.tarifas.slice().reverse().map(function (t) { return "<li><strong>v" + t.versao + "</strong> · vigência " + FC.dtBR(t.vigenciaInicio) + " · " + esc(t.responsavel) + '<br><span class="small">' + esc(t.justificativa) + "</span></li>"; }).join("") + "</ul></div></div>";
      $("#tf-f", body).addEventListener("submit", function (e) {
        e.preventDefault();
        var j = $("#tf-j", body).value.trim(); if (j.length < 5) { FC.toast("Justificativa obrigatória.", "bad"); return; }
        var d = {}; $$("[data-g]", body).forEach(function (i) { d[i.dataset.g] = +i.value; });
        var t = { versao: FC.db.tarifas.length + 1, vigenciaInicio: new Date($("#tf-v", body).value).toISOString(), justificativa: j, responsavel: FC.autorAtual(), criadoEm: new Date().toISOString(), diarias: d };
        FC.db.tarifas.push(t); FC.audit("Tarifa publicada", "v" + t.versao, j, "ok"); FC.save(); FC.toast("Versão v" + t.versao + " publicada. Reservas existentes não mudam.", "ok"); FC.render();
      });
    } else if (tarTab === "politicas") {
      var c = FC.cfg();
      var campos = [["antecedenciaMin", "Antecedência mínima (min)", "PM02"], ["intervaloHorarioMin", "Intervalo entre horários (min)", "PM02"], ["periodoCobrancaHoras", "Período de cobrança (h)", "PM02"], ["toleranciaDevolucaoMin", "Tolerância de devolução (min)", "PM02"], ["holdMin", "Bloqueio durante pagamento (min)", "DP02"], ["margemPreparacaoMin", "Margem de preparação da transferência (min)", "RF94"], ["velocidadeMediaKmh", "Velocidade média de transferência (km/h)", "RF94"], ["motoristaDiaria", "Diária do motorista (R$)", "PM01"], ["taxaAeroportoPct", "Taxa de aeroporto (%)", "RF16"], ["maxCondutoresAdicionais", "Máx. condutores adicionais", "DP04"], ["loginMaxTentativas", "Tentativas de login", "RNF06"], ["loginBloqueioMin", "Bloqueio de login (min)", "RNF06"], ["senhaMin", "Tamanho mínimo da senha", "RNF06"]];
      var flags = [["loginGoogle", "Login Google (simulado) priorizado", "RF51"], ["newsletter", "Newsletter na entrega", "RF57"], ["pagadorDistinto", "Permitir pagador distinto", "RF47 · DP04"]];
      body.innerHTML = '<form class="box" id="pl-f"><h3>Parâmetros (versão ' + c.versao + ", por " + esc(c.responsavel) + ")</h3><p class=\"small muted\">Todos são valores de demonstração até as decisões PM/DP. A versão usada fica gravada em cada reserva.</p><div class=\"form-grid form-grid--3\" style=\"margin-top:12px\">" +
        campos.map(function (x) { return FC.fld(x[1] + ' <span class="muted">(' + x[2] + ")</span>", '<input class="inp" type="number" min="0" data-k="' + x[0] + '" value="' + c[x[0]] + '">'); }).join("") +
        FC.fld("Devolução em outra loja: base (R$) <span class=\"muted\">(PM03)</span>", '<input class="inp" type="number" id="pl-db" value="' + c.devolucaoOutraLoja.base + '">') + FC.fld("Devolução: R$ por km", '<input class="inp" type="number" step="0.1" id="pl-dk" value="' + c.devolucaoOutraLoja.porKm + '">') +
        FC.fld("Cancelamento sem multa até (h) <span class=\"muted\">(PM07)</span>", '<input class="inp" type="number" id="pl-ch" value="' + c.cancelamento.semMultaAteHoras + '">') + FC.fld("Multa de cancelamento (%)", '<input class="inp" type="number" id="pl-cm" value="' + c.cancelamento.multaPct + '">') +
        FC.fld("Parcelas máximas <span class=\"muted\">(PM08)</span>", '<input class="inp" type="number" id="pl-pm" value="' + c.parcelamento.maxParcelas + '">') + FC.fld("Parcela mínima (R$)", '<input class="inp" type="number" id="pl-pn" value="' + c.parcelamento.minParcela + '">') + FC.fld("Juros do parcelamento (%)", '<input class="inp" type="number" step="0.1" id="pl-pj" value="' + c.parcelamento.jurosPct + '">') + "</div>" +
        '<fieldset class="fld" style="margin-top:12px"><legend>Funcionalidades opcionais</legend>' + '<label class="chk"><input type="checkbox" id="pl-dev"' + (c.devolucaoOutraLoja.habilitada ? " checked" : "") + "> Devolução em outra loja aprovada (RF13)</label>" + '<label class="chk"><input type="checkbox" id="pl-par"' + (c.parcelamento.habilitado ? " checked" : "") + "> Parcelamento aprovado (RF46)</label>" + '<label class="chk"><input type="checkbox" id="pl-cau"' + (c.caucao.adotada ? " checked" : "") + "> Caução adotada (RF30)</label>" + '<label class="chk"><input type="checkbox" id="pl-km"' + (c.km.definida ? " checked" : "") + "> Modalidades de quilometragem definidas (RF17)</label>" +
        flags.map(function (x) { return '<label class="chk"><input type="checkbox" data-f="' + x[0] + '"' + (c[x[0]] ? " checked" : "") + "> " + x[1] + ' <span class="muted">(' + x[2] + ")</span></label>"; }).join("") + "</fieldset>" +
        FC.fld("Justificativa da alteração", '<input class="inp" id="pl-j">') + '<button class="btn btn--primary" type="submit" style="margin-top:12px">Salvar nova versão de parâmetros</button></form>' +
        '<div class="box"><h3>Histórico</h3><ul class="events">' + FC.db.historicoConfig.slice().reverse().map(function (h) { return "<li><strong>v" + h.versao + "</strong> · " + FC.dtBR(h.data) + " · " + esc(h.responsavel) + " · " + esc(h.justificativa) + "</li>"; }).join("") + "</ul></div>" +
        '<div class="box"><h3>Matriz de habilitação ' + esc(c.matrizCNH.versao) + rf("RF76", "RN05", "RNF41") + '</h3><p class="small">Carros: ' + c.matrizCNH.carro.join(", ") + "<br>Motos: " + c.matrizCNH.moto.join(", ") + "<br>Fonte: " + esc(c.matrizCNH.fonte) + ". C, D e E não autorizam moto automaticamente. Veículos fora da matriz são bloqueados.</p></div>";
      $("#pl-f", body).addEventListener("submit", function (e) {
        e.preventDefault();
        var j = $("#pl-j", body).value.trim(); if (j.length < 5) { FC.toast("Justificativa obrigatória.", "bad"); return; }
        $$("[data-k]", body).forEach(function (i) { c[i.dataset.k] = +i.value; });
        $$("[data-f]", body).forEach(function (i) { c[i.dataset.f] = i.checked; });
        c.devolucaoOutraLoja.habilitada = $("#pl-dev", body).checked; c.devolucaoOutraLoja.base = +$("#pl-db", body).value; c.devolucaoOutraLoja.porKm = +$("#pl-dk", body).value;
        c.cancelamento.semMultaAteHoras = +$("#pl-ch", body).value; c.cancelamento.multaPct = +$("#pl-cm", body).value;
        c.parcelamento.habilitado = $("#pl-par", body).checked; c.parcelamento.maxParcelas = +$("#pl-pm", body).value; c.parcelamento.minParcela = +$("#pl-pn", body).value; c.parcelamento.jurosPct = +$("#pl-pj", body).value;
        c.caucao.adotada = $("#pl-cau", body).checked; c.km.definida = $("#pl-km", body).checked;
        c.versao++; c.atualizadoEm = new Date().toISOString(); c.responsavel = FC.autorAtual();
        FC.db.historicoConfig.push({ versao: c.versao, data: c.atualizadoEm, responsavel: c.responsavel, justificativa: j, snapshot: JSON.stringify(c) });
        FC.audit("Parâmetros alterados", "config v" + c.versao, j, "ok"); FC.save(); FC.toast("Parâmetros v" + c.versao + " salvos.", "ok"); FC.render();
      });
    } else if (tarTab === "catalogos") {
      body.innerHTML = '<div class="grid-2"><section class="box"><h3>Proteções' + rf("RF18", "PM05") + '</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nome</th><th class="num">Diária</th><th class="num">Participação</th></tr></thead><tbody>' + FC.db.protecoes.map(function (p) { return "<tr><td>" + esc(p.nome) + (p.inclui.length ? '<br><span class="small muted">inclui ' + p.inclui.join(", ") + "</span>" : "") + '</td><td class="num"><input class="inp" style="width:90px;height:32px" type="number" data-pr="' + p.id + '" value="' + p.diaria + '"></td><td class="num">' + brl(p.participacao) + "</td></tr>"; }).join("") + "</tbody></table></div></section>" +
        '<section class="box"><h3>Acessórios e estoque' + rf("RF19", "RF42") + '</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Acessório</th><th>Compatível</th><th class="num">Diária</th>' + FC.lojasEscopo().slice(0, 4).map(function (l) { return '<th class="num">' + l.id + "</th>"; }).join("") + "</tr></thead><tbody>" +
        FC.db.acessorios.map(function (a) { return "<tr><td>" + esc(a.nome) + "</td><td>" + a.tipos.join(", ") + '</td><td class="num"><input class="inp" style="width:80px;height:32px" type="number" data-ad="' + a.id + '" value="' + a.diaria + '"></td>' + FC.lojasEscopo().slice(0, 4).map(function (l) { return '<td class="num"><input class="inp" style="width:64px;height:32px" type="number" min="0" data-es="' + a.id + "|" + l.id + '" value="' + (a.estoque[l.id] || 0) + '"></td>'; }).join("") + "</tr>"; }).join("") + "</tbody></table></div></section></div>" +
        FC.fld("Justificativa", '<input class="inp" id="ct-j">') + '<button class="btn btn--primary" type="button" id="ct-ok" style="margin-top:12px">Salvar catálogos</button><p class="small muted" style="margin-top:8px">Preços salvos valem para novas reservas; reservas existentes guardam o valor contratado.</p>';
      $("#ct-ok", body).addEventListener("click", function () {
        var j = $("#ct-j", body).value.trim(); if (j.length < 5) { FC.toast("Justificativa obrigatória.", "bad"); return; }
        $$("[data-pr]", body).forEach(function (i) { FC.db.protecoes.filter(function (p) { return p.id === i.dataset.pr; })[0].diaria = +i.value; });
        $$("[data-ad]", body).forEach(function (i) { FC.db.acessorios.filter(function (a) { return a.id === i.dataset.ad; })[0].diaria = +i.value; });
        $$("[data-es]", body).forEach(function (i) { var p = i.dataset.es.split("|"); FC.db.acessorios.filter(function (a) { return a.id === p[0]; })[0].estoque[p[1]] = +i.value; });
        FC.audit("Catálogos alterados", "proteções/acessórios", j, "ok"); FC.save(); FC.toast("Catálogos salvos.", "ok"); FC.render();
      });
    } else {
      body.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Código</th><th>Descrição</th><th>Vigência</th><th>Regras</th><th class="num">Usos</th><th>Responsável</th><th></th></tr></thead><tbody>' + FC.db.cupons.map(function (c) { return "<tr><td><strong>" + esc(c.codigo) + "</strong></td><td>" + esc(c.descricao) + "</td><td>" + FC.dataBR(c.inicio) + " a " + FC.dataBR(c.fim) + "</td><td class=\"small\">" + (c.primeiraLocacao ? "1ª locação válida · " : "") + (c.grupos.length ? c.grupos.join(", ") : "todos") + '</td><td class="num">' + c.usos + "/" + c.limiteUso + "</td><td>" + esc(c.responsavel) + '</td><td><button class="btn btn--ghost btn--sm" type="button" data-cp="' + c.codigo + '">' + (c.ativo ? "Inativar" : "Ativar") + "</button></td></tr>"; }).join("") + "</tbody></table></div>" +
        '<form class="box form-grid form-grid--3" id="cp-f" style="margin-top:16px"><h3 class="span-all">Novo cupom' + rf("RF26", "RF56", "RF62") + "</h3>" + FC.fld("Código", '<input class="inp" id="cp-c">') + FC.fld("Descrição", '<input class="inp" id="cp-d">') + FC.fld("Tipo", '<select class="sel" id="cp-t"><option value="pct">%</option><option value="valor">R$</option></select>') + FC.fld("Valor", '<input class="inp" type="number" id="cp-v">') + FC.fld("Fim da vigência", '<input class="inp" type="date" id="cp-fim">') + FC.fld("Limite de uso", '<input class="inp" type="number" id="cp-l" value="100">') +
        '<label class="chk"><input type="checkbox" id="cp-1"> Somente primeira locação válida</label>' + FC.fld("Regulamento", '<textarea class="txt" id="cp-r"></textarea>', null, "span-all") + '<div class="span-all"><button class="btn btn--primary" type="submit">Criar cupom</button></div></form>';
      body.addEventListener("click", function (e) { var b = e.target.closest("[data-cp]"); if (!b) return; var c = FC.db.cupons.filter(function (x) { return x.codigo === b.dataset.cp; })[0]; c.ativo = !c.ativo; FC.audit(c.ativo ? "Cupom ativado" : "Cupom inativado", c.codigo, "", "ok"); FC.save(); FC.render(); });
      $("#cp-f", body).addEventListener("submit", function (e) {
        e.preventDefault();
        var cod = $("#cp-c", body).value.trim().toUpperCase();
        if (!/^[A-Z0-9]{4,15}$/.test(cod) || FC.db.cupons.some(function (x) { return x.codigo === cod; })) { FC.toast("Código inválido ou repetido.", "bad"); return; }
        if (!$("#cp-r", body).value.trim() || !$("#cp-fim", body).value || !(+$("#cp-v", body).value > 0)) { FC.toast("Preencha valor, vigência e regulamento.", "bad"); return; }
        FC.db.cupons.push({ codigo: cod, descricao: $("#cp-d", body).value.trim() || cod, tipo: $("#cp-t", body).value, valor: +$("#cp-v", body).value, primeiraLocacao: $("#cp-1", body).checked, grupos: [], inicio: new Date().toISOString(), fim: new Date($("#cp-fim", body).value + "T23:59:00").toISOString(), limiteUso: +$("#cp-l", body).value, usos: 0, ativo: true, responsavel: FC.autorAtual(), regulamento: $("#cp-r", body).value.trim() });
        FC.audit("Cupom criado", cod, "", "ok"); FC.save(); FC.render();
      });
    }
  };

  /* ---------- Usuários internos (RF70) ---------- */
  P.usuarios = function (main) {
    main.innerHTML = FC.head("Usuários internos" + rf("RF70", "RNF32"), "Três perfis aprovados, com escopo por loja. Só o administrador/gestor cria usuários e atribui perfis.") +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Lojas</th><th>Situação</th><th></th></tr></thead><tbody>' + FC.db.usuarios.map(function (u) { return "<tr><td>" + esc(u.nome) + "</td><td>" + esc(u.email) + "</td><td>" + FC.PERFIS[u.perfil] + "</td><td>" + (u.lojas[0] === "*" ? "todas" : u.lojas.join(", ")) + "</td><td>" + (u.ativo ? "ativo" : "inativo") + "</td><td>" + (u.id !== FC.adminAtual().id ? '<button class="btn btn--ghost btn--sm" type="button" data-us="' + u.id + '">' + (u.ativo ? "Inativar" : "Ativar") + "</button>" : '<span class="small muted">você</span>') + "</td></tr>"; }).join("") + "</tbody></table></div>" +
      '<form class="box form-grid form-grid--3" id="us-f" style="margin-top:16px"><h3 class="span-all">Novo usuário</h3>' + FC.fld("Nome", '<input class="inp" id="us-n">') + FC.fld("E-mail", '<input class="inp" id="us-e">') + FC.fld("Perfil", '<select class="sel" id="us-p">' + Object.keys(FC.PERFIS).map(function (k) { return '<option value="' + k + '">' + FC.PERFIS[k] + "</option>"; }).join("") + "</select>") +
      '<fieldset class="fld span-all"><legend>Lojas do escopo</legend><div class="row"><label class="chk"><input type="checkbox" id="us-todas"> Todas</label>' + FC.db.lojas.map(function (l) { return '<label class="chk"><input type="checkbox" class="us-l" value="' + l.id + '"> ' + l.id + "</label>"; }).join("") + '</div></fieldset><div class="span-all"><button class="btn btn--primary" type="submit">Criar usuário</button><p class="small muted" style="margin-top:8px">No produto real, o usuário define a própria senha por convite; senhas não são exibidas nem registradas.</p></div></form>';
    main.addEventListener("click", function (e) { var b = e.target.closest("[data-us]"); if (!b) return; var u = FC.db.usuarios.filter(function (x) { return x.id === b.dataset.us; })[0]; u.ativo = !u.ativo; FC.audit(u.ativo ? "Usuário ativado" : "Usuário inativado", u.id, "", "ok"); FC.save(); FC.render(); });
    $("#us-f", main).addEventListener("submit", function (e) {
      e.preventDefault();
      var em = $("#us-e", main).value.trim().toLowerCase();
      if (!$("#us-n", main).value.trim() || !FC.emailValido(em) || FC.db.usuarios.some(function (u) { return u.email === em; })) { FC.toast("Nome e e-mail válido (não repetido) são obrigatórios.", "bad"); return; }
      var lojas = $("#us-todas", main).checked ? ["*"] : $$(".us-l:checked", main).map(function (x) { return x.value; });
      if (!lojas.length) { FC.toast("Escolha ao menos uma loja.", "bad"); return; }
      var u = { id: FC.uid("U"), nome: $("#us-n", main).value.trim(), email: em, perfil: $("#us-p", main).value, lojas: lojas, ativo: true };
      FC.db.usuarios.push(u); FC.audit("Usuário criado", u.id, FC.PERFIS[u.perfil], "ok"); FC.save(); FC.render();
    });
  };

  /* ---------- Auditoria (RF90, RNF30) ---------- */
  var audQ = "";
  P.auditoria = function (main) {
    var q = audQ.toLowerCase();
    var l = FC.db.auditoria.filter(function (a) { return !q || (a.acao + " " + a.objeto + " " + a.autor + " " + a.motivo).toLowerCase().indexOf(q) >= 0; });
    main.innerHTML = FC.head("Auditoria" + rf("RF90", "RNF30", "RNF14"), "Ações sensíveis com autor, instante, objeto, motivo e resultado. Somente leitura; dados pessoais mascarados.") +
      '<label class="fld box" style="margin-bottom:16px"><span>Filtrar</span><input class="inp" id="au-q" value="' + esc(audQ) + '" placeholder="Ex.: FC-, tarifa, V012, negado"></label>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Quando</th><th>Autor</th><th>Ação</th><th>Objeto</th><th>Motivo</th><th>Resultado</th></tr></thead><tbody>' + l.slice(0, 300).map(function (a) { return "<tr><td>" + FC.dtBR(a.data) + "</td><td>" + esc(a.autor) + "</td><td>" + esc(a.acao) + "</td><td>" + esc(a.objeto) + "</td><td>" + esc(a.motivo) + "</td><td>" + esc(a.resultado) + "</td></tr>"; }).join("") + "</tbody></table></div>";
    $("#au-q", main).addEventListener("change", function () { audQ = this.value; FC.render(); });
  };

  /* ---------- Mapa de requisitos ---------- */
  var RF = {
    "01": "Admin > Frota: cadastrar, editar, inativar carros e motos (grupo, características, habilitação).", "02": "Admin > Frota > Histórico: localização atual, loja responsável e movimentações.", "03": "Admin > Agenda e Painel: situação e agenda por intervalo.", "04": "Reserva etapa 1: motorista contratado com agenda e compatibilidade; custo discriminado.",
    "05": "Site: busca → unidade → etapas → login → revisão → pagamento aprovado.", "06": "Admin > Reserva assistida (telefone/WhatsApp) com link de pagamento.", "07": "Admin > Reserva assistida (presencial) com pagamento no balcão antes da confirmação.", "08": "Veículos: unidades de outras lojas da mesma cidade com transferência viável.",
    "09": "Início/Lojas: loja mais próxima em linha reta, localização manual, próxima loja viável com aceite.", "10": "Datas e horas livres; duração por períodos configuráveis.", "11": "Admin > Relatórios com filtros de período, loja e tipo.", "12": "Lojas: busca por cidade, aeroporto e endereço; mensagem sem resultados.",
    "13": "Busca: devolução em outra loja só com política habilitada; taxa exibida antes.", "14": "Busca/Revisão: expediente, calendário e exceções com alternativas.", "15": "Veículos: unidade específica com grupo, características, fotos e preço.", "16": "Resumo: locação, motorista, proteções, acessórios, descontos e taxas recalculados.",
    "17": "Reserva etapa 2: modalidades de km com franquia e excedente.", "18": "Reserva etapa 2: proteções com preço, cobertura, exclusões e participação.", "19": "Reserva etapa 2: acessórios compatíveis com quantidade e preço.", "20": "Cadastro: CPF/passaporte/RNE; marketing separado.",
    "21": "Etapa 1: elegibilidade por condutor e veículo (categoria, validade, restrições).", "22": "Conta: login por e-mail ou CPF; recuperação com código único, validade e tentativas.", "23": "Minha reserva: código + e-mail + 4 dígitos; visão limitada.", "24": "Conta > Reservas: alterar/cancelar com diferença, multa e reembolso antes do aceite.",
    "25": "Confirmação e comprovante na conta; envios registrados.", "26": "Revisão: cupom com vigência, elegibilidade e limite.", "27": "Admin > Reserva > Retirada e devolução com operador, km, combustível, vistoria e aceite.", "28": "Admin > Financeiro: despesas com evidência; cliente contesta.",
    "29": "Conta: prorrogação com disponibilidade, novo aceite e pagamento.", "30": "Caução separada com modalidade, estado, falha e liberação.", "31": "Admin > Infrações com condutor responsável e comunicação.", "32": "Admin > Sinistros com documentos e indisponibilidade.",
    "33": "Fidelidade desativada (DP01); aparece só se habilitada nos parâmetros.", "34": "Antecedência mínima configurável validada na busca e na revisão.", "35": "Erros por campo em busca, cadastro, pagamento e formulários.", "36": "Horários selecionáveis dentro do expediente no intervalo configurado.",
    "37": "Instruções da loja na revisão, confirmação e comprovante.", "38": "Recomendação com critério explicado, sem pré-seleção.", "39": "Filtros de acessibilidade e conferência das restrições da CNH.", "40": "Etapa 2: troca para categoria superior com diferença e aceite.",
    "41": "Proteções sem sobreposição; nenhuma marcada por padrão.", "42": "Acessórios por loja e intervalo; bloqueio e liberação.", "43": "Resumo lateral e revisão com volta às etapas e revalidação.", "44": "Revisão: tolerância de devolução configurável.",
    "45": "Pagamento: crédito, débito e Pix antes da confirmação.", "46": "Parcelamento só no crédito e com política habilitada.", "47": "Pagador distinto bloqueado até DP04 (parâmetro).", "48": "Etapa 3: dados de voo em lojas de aeroporto, com finalidade.",
    "49": "Revisão: aceite expresso com versão, data e autor.", "50": "Código único FC-XXXXXX, sem valor como credencial.", "51": "Login Google oculto até ser priorizado (parâmetro).", "52": "Conta > Segurança: troca de senha com verificação.",
    "53": "Conta: só reservas, pagamentos, reembolsos e despesas do próprio cliente.", "54": "Lojas: lista + mapa, filtro por estado/cidade, distância, alternativa manual.", "55": "Frota: catálogo de grupos e preços de referência.", "56": "Cupons com regulamento, responsável e condições, geridos na área da empresa (não divulgados no site).",
    "57": "Rodapé e conta: inscrição e cancelamento de newsletter.", "58": "Ajuda: FAQ pesquisável e chamados com protocolo e anexos limitados.", "59": "WhatsApp e telefone; registro manual no painel.", "60": "Conta > Documentos: envio e estados de conferência.",
    "61": "Canais oficiais e antifraude no rodapé, ajuda e pagamento.", "62": "Cupom de primeira locação válida considerando histórico.", "63": "Condutores adicionais validados separadamente; limite configurável.", "64": "Admin > Transferências com responsáveis, previsão e status.",
    "65": "Admin > Manutenção por prazo/km com bloqueio de agenda.", "66": "Contrato e recibo simulados sem validade fiscal.", "67": "Admin > Clientes: revisão/bloqueio com motivo, sem cancelar reservas pagas.", "68": "Lembretes agendados na caixa de saída.",
    "69": "Avaliação única por locação encerrada; média nos relatórios.", "70": "Usuários internos com 3 perfis e escopo por loja.", "71": "Admin > Lojas: cadastro completo, expediente, exceções, instruções.", "72": "Tarifas e parâmetros versionados com justificativa.",
    "73": "Admin > Motoristas: habilitação, lojas e agenda.", "74": "Envio de CNH em PDF/imagem com substituição.", "75": "Conferência manual com responsável e data; separada de verificação oficial.", "76": "Matriz versionada de compatibilidade CNH × veículo.",
    "77": "Com motorista contratado, a CNH do cliente não é exigida.", "78": "Bloqueio temporário durante o pagamento com expiração.", "79": "Estados de reserva e de pagamento separados, com eventos.", "80": "Confirmação única; eventos repetidos ignorados.",
    "81": "Aprovação tardia tratada como exceção com reembolso.", "82": "Reembolso total/parcial sem estorno duplicado.", "83": "Admin > Atendimento com protocolo, canal, atendente, loja, status.", "84": "Simulador de pagamento com 4 resultados.",
    "85": "Admin > Caixa de saída com destinatário, evento e resultado.", "86": "Reservas afetadas por manutenção, transferência ou motorista; alternativa aceita.", "87": "Admin > Painel por loja com pendências.", "88": "Contestação e solução de cobranças extras.",
    "89": "Pedidos de acesso/correção/exclusão com verificação.", "90": "Admin > Auditoria filtrável.", "91": "Rascunho da reserva retomável com revalidação.", "92": "Encerramento da locação independente de cobranças posteriores.",
    "93": "Sugestão da próxima loja viável com distância e aceite.", "94": "Estimativa de transferência com margem e chegada prevista."
  };
  P.requisitos = function (main) {
    var q = (FC._reqQ || "").toLowerCase();
    var ks = Object.keys(RF).filter(function (k) { return !q || ("rf" + k + " " + RF[k]).toLowerCase().indexOf(q) >= 0; });
    main.innerHTML = FC.head("Mapa de requisitos", "Onde cada requisito funcional aparece neste protótipo. Ative “Mostrar requisitos” na barra superior para ver as etiquetas nas telas.") +
      '<label class="fld box" style="margin-bottom:16px"><span>Buscar requisito</span><input class="inp" id="rq-q" value="' + esc(FC._reqQ || "") + '" placeholder="Ex.: RF45, pagamento, CNH"></label>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>RF</th><th>Como e onde foi atendido</th></tr></thead><tbody>' + ks.map(function (k) { return "<tr><td><strong>RF" + k + "</strong></td><td>" + esc(RF[k]) + "</td></tr>"; }).join("") + "</tbody></table></div>" +
      '<div class="grid-2" style="margin-top:24px"><section class="box"><h3>Requisitos não funcionais no protótipo</h3><ul class="small" style="margin-left:18px"><li>RNF05/36: faixa de demonstração.</li><li>RNF07: dados de cartão não são guardados.</li><li>RNF11/12: layout responsivo, rótulos, foco visível e navegação por teclado.</li><li>RNF16: português e real.</li><li>RNF19: nenhum rastreador antes da escolha.</li><li>RNF20: nada pago vem marcado.</li><li>RNF30/14: trilha de auditoria.</li><li>RNF32: perfis e escopo por loja; acessos negados registrados.</li><li>RNF33: tipo e tamanho de anexos limitados.</li><li>RNF34/80: confirmação idempotente.</li><li>RNF35: versão de tarifa e parâmetros gravada na reserva.</li><li>RNF37: lista e entrada manual quando mapa ou localização falham.</li><li>RNF38: dados persistidos no navegador; botão para restaurar a base.</li></ul></section>' +
      '<section class="box"><h3>Limites deste protótipo</h3><ul class="small" style="margin-left:18px"><li>Roda só no navegador: não há servidor, HTTPS próprio, backup, testes de carga nem autorização no servidor (RNF02, RNF03, RNF21, RNF31, RNF32 exigem back-end).</li><li>Pagamentos, mensagens e validação de CNH são simulados; nada é integrado a serviços oficiais.</li><li>Parâmetros PM/DP usam valores de demonstração até a decisão do grupo.</li><li>Se o ambiente bloquear o armazenamento, os dados valem só na sessão.</li></ul></section></div>';
    $("#rq-q", main).addEventListener("change", function () { FC._reqQ = this.value; FC.render(); });
  };
})();
