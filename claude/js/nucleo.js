/* Falls Car — núcleo: persistência, utilitários e regras de negócio */
(function () {
  "use strict";
  var FC = window.FC;
  var KEY = "fallscar-demo";

  /* ---------- Persistência (RNF38) ---------- */
  var storageOk = true;
  function loadDB() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) {
        var db = JSON.parse(raw);
        if (db && db.seedVersion === FC.SEED_VERSION) return db;
      }
    } catch (e) { storageOk = false; }
    return FC.buildSeed();
  }
  // o histórico de demonstração é gravado enxuto (RNF38/localStorage); listas vazias são completadas ao carregar
  function completar(db) {
    (db.reservas || []).forEach(function (r) {
      ["condutores", "protecoes", "acessorios", "despesas", "infracoes", "sinistros", "eventos"].forEach(function (k) { if (!r[k]) r[k] = []; });
    });
    return db;
  }
  FC.db = completar(loadDB());
  FC.storageOk = storageOk;
  FC.save = function () {
    try { window.localStorage.setItem(KEY, JSON.stringify(FC.db)); FC.storageOk = true; }
    catch (e) { FC.storageOk = false; }
  };
  FC.resetDB = function () { FC.db = completar(FC.buildSeed()); FC.save(); };
  FC.save();

  /* ---------- Utilitários ---------- */
  FC.$ = function (s, r) { return (r || document).querySelector(s); };
  FC.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  FC.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
  FC.brl = function (v) { return (Math.round(v * 100) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); };
  FC.pad = function (n) { return (n < 10 ? "0" : "") + n; };
  /* Falls Club e QR de demonstração: aqui no núcleo porque a página inicial (figma/) também usa */
  FC.CLUB = {
    ptsDiaria: 10, valorPonto: 0.1, maxPct: 0.5,
    niveis: [
      { nome: "Asfalto", min: 0, vantagens: ["10 pontos por diária", "Pontos viram desconto"] },
      { nome: "Estrada", min: 300, vantagens: ["Tudo do Asfalto", "Atendimento prioritário no balcão"] },
      { nome: "Rodovia", min: 900, vantagens: ["Tudo do Estrada", "Suporte dedicado no chat"] }
    ]
  };
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
  FC.dataBR = function (d) { d = new Date(d); return FC.pad(d.getDate()) + "/" + FC.pad(d.getMonth() + 1) + "/" + d.getFullYear(); };
  FC.horaBR = function (d) { d = new Date(d); return FC.pad(d.getHours()) + ":" + FC.pad(d.getMinutes()); };
  FC.dtBR = function (d) { return FC.dataBR(d) + " " + FC.horaBR(d); };
  FC.isoDate = function (d) { d = new Date(d); return d.getFullYear() + "-" + FC.pad(d.getMonth() + 1) + "-" + FC.pad(d.getDate()); };
  FC.combina = function (data, hora) { var p = data.split("-"), h = hora.split(":"); return new Date(+p[0], +p[1] - 1, +p[2], +h[0], +h[1], 0, 0); };
  FC.icon = function (id, s) { s = s || 16; return '<svg width="' + s + '" height="' + s + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; };
  FC.rf = function () { return '<span class="rf-tag" aria-hidden="true">' + Array.prototype.slice.call(arguments).join(" · ") + "</span>"; };
  FC.uid = function (p) { return p + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1e4).toString(36).toUpperCase(); };
  FC.hash = function (s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return "h" + (h >>> 0).toString(36); };

  FC.lojaById = function (id) { return FC.db.lojas.filter(function (l) { return l.id === id; })[0]; };
  FC.grupoById = function (id) { return FC.db.grupos.filter(function (g) { return g.id === id; })[0]; };
  FC.veiculoById = function (id) { return FC.db.veiculos.filter(function (v) { return v.id === id; })[0]; };
  FC.clienteById = function (id) { return FC.db.clientes.filter(function (c) { return c.id === id; })[0]; };
  FC.motoristaById = function (id) { return FC.db.motoristas.filter(function (m) { return m.id === id; })[0]; };
  FC.reservaByCodigo = function (c) { return FC.db.reservas.filter(function (r) { return r.codigo === c; })[0]; };
  FC.cfg = function () { return FC.db.config; };

  /* ---------- Auditoria (RNF30) e caixa de saída (RF85) ---------- */
  FC.audit = function (acao, objeto, motivo, resultado, autor) {
    FC.db.auditoria.unshift({ data: new Date().toISOString(), autor: autor || FC.autorAtual(), acao: acao, objeto: objeto || "", motivo: motivo || "", resultado: resultado || "ok" });
    if (FC.db.auditoria.length > 600) FC.db.auditoria.length = 600;
  };
  FC.autorAtual = function () {
    var s = FC.db.sessao;
    if (s.adminId) { var u = FC.db.usuarios.filter(function (x) { return x.id === s.adminId; })[0]; return u ? u.nome : "admin"; }
    if (s.clienteId) { var c = FC.clienteById(s.clienteId); return c ? c.nome : "cliente"; }
    return "visitante";
  };
  FC.outbox = function (para, canal, evento, assunto, corpo, opts) {
    opts = opts || {};
    var falha = opts.falha || false;
    var m = { id: FC.uid("MSG"), data: new Date().toISOString(), agendadoPara: opts.agendadoPara || null, para: para, canal: canal, evento: evento, assunto: assunto, corpo: corpo, status: opts.agendadoPara ? "agendada" : (falha ? "falha" : "entregue (simulado)"), ref: opts.ref || null };
    FC.db.saida.unshift(m);
    return m;
  };

  /* ---------- Distância em linha reta (RN04) ---------- */
  FC.distKm = function (a, b) {
    var R = 6371, toR = Math.PI / 180;
    var dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  };
  FC.cidades = [
    { nome: "São Paulo/SP", lat: -23.5505, lon: -46.6333 }, { nome: "Guarulhos/SP", lat: -23.4543, lon: -46.5337 },
    { nome: "Rio de Janeiro/RJ", lat: -22.9068, lon: -43.1729 }, { nome: "Belo Horizonte/MG", lat: -19.9167, lon: -43.9345 },
    { nome: "Brasília/DF", lat: -15.7939, lon: -47.8828 }, { nome: "Recife/PE", lat: -8.0476, lon: -34.877 },
    { nome: "Salvador/BA", lat: -12.9777, lon: -38.5016 }, { nome: "Porto Alegre/RS", lat: -30.0346, lon: -51.2177 },
    { nome: "Curitiba/PR", lat: -25.4284, lon: -49.2733 }, { nome: "Fortaleza/CE", lat: -3.7319, lon: -38.5267 }
  ];
  FC.lojasPorDistancia = function (ponto) {
    return FC.db.lojas.filter(function (l) { return l.ativa; }).map(function (l) { return { loja: l, km: FC.distKm(ponto, l) }; })
      .sort(function (a, b) { return a.km - b.km; });
  };

  /* ---------- Expediente e horários (RF14, RF36) ---------- */
  FC.expediente = function (loja, data) {
    var d = new Date(data);
    var ds = FC.isoDate(d);
    var exc = (loja.excecoes || []).filter(function (e) { return e.data === ds; })[0];
    if (exc && exc.fechado) return { fechado: true, motivo: exc.motivo };
    var h = loja.horario[d.getDay()];
    if (!h) return { fechado: true, motivo: "Fechada neste dia da semana" };
    return { fechado: false, abre: h[0], fecha: h[1] };
  };
  FC.slots = function (loja, dataStr) {
    var ex = FC.expediente(loja, FC.combina(dataStr, "12:00"));
    if (ex.fechado) return [];
    var step = FC.cfg().intervaloHorarioMin;
    var a = ex.abre.split(":"), f = ex.fecha.split(":");
    var ini = +a[0] * 60 + +a[1], fim = +f[0] * 60 + +f[1];
    var out = [];
    for (var m = ini; m <= fim; m += step) out.push(FC.pad(Math.floor(m / 60)) + ":" + FC.pad(m % 60));
    return out;
  };
  FC.validaHorario = function (loja, dt) {
    var ex = FC.expediente(loja, dt);
    if (ex.fechado) return { ok: false, msg: loja.nome + " está fechada em " + FC.dataBR(dt) + " (" + ex.motivo + ")." };
    var hm = FC.horaBR(dt);
    if (hm < ex.abre || hm > ex.fecha) return { ok: false, msg: "Fora do expediente de " + loja.nome + " (" + ex.abre + "–" + ex.fecha + ")." };
    return { ok: true };
  };
  FC.alternativasHorario = function (loja, dt) {
    var out = [];
    for (var i = 0; i < 7 && out.length < 3; i++) {
      var d = new Date(dt); d.setDate(d.getDate() + i);
      var s = FC.slots(loja, FC.isoDate(d));
      if (s.length) out.push(FC.dataBR(d) + " entre " + s[0] + " e " + s[s.length - 1]);
    }
    return out;
  };

  /* ---------- Agenda e disponibilidade (RF03, RN03, RF78) ---------- */
  FC.limparBloqueios = function () {
    var agora = Date.now(), mudou = false;
    FC.db.agenda = FC.db.agenda.filter(function (a) {
      if (a.tipo === "bloqueio" && a.expiraEm && new Date(a.expiraEm).getTime() < agora) { mudou = true; return false; }
      return true;
    });
    FC.db.reservasAcessorios = FC.db.reservasAcessorios.filter(function (a) { return !(a.expiraEm && new Date(a.expiraEm).getTime() < agora); });
    FC.db.reservas.forEach(function (r) {
      if (r.estado === "aguardando_pagamento" && r.bloqueioExpira && new Date(r.bloqueioExpira).getTime() < agora) {
        r.estado = "expirada"; r.eventos.push({ data: new Date().toISOString(), autor: "sistema", evento: "Bloqueio temporário expirou; capacidade liberada (RF78)" }); mudou = true;
      }
    });
    if (mudou) FC.save();
  };
  FC.conflitos = function (veiculoId, ini, fim, ignorarRef) {
    ini = new Date(ini); fim = new Date(fim);
    return FC.db.agenda.filter(function (a) {
      if (a.veiculoId !== veiculoId) return false;
      if (ignorarRef && a.ref === ignorarRef) return false;
      if (a.tipo === "motorista") return false;
      return new Date(a.inicio) < fim && new Date(a.fim) > ini;
    });
  };
  FC.situacaoAtual = function (v) {
    if (!v.ativo) return "inativo";
    var agora = new Date();
    var a = FC.db.agenda.filter(function (x) { return x.veiculoId === v.id && new Date(x.inicio) <= agora && new Date(x.fim) >= agora; })[0];
    if (a) return { locacao: "locado", reserva: "reservado", manutencao: "manutenção", transferencia: "em transferência", bloqueio: "bloqueado (pagamento)" }[a.tipo] || a.tipo;
    var r = FC.db.reservas.filter(function (r) { return r.veiculoId === v.id && r.estado === "em_andamento"; })[0];
    if (r) return "locado";
    return "disponível";
  };

  // Transferência viável (RF08, RF64, RF94)
  FC.avaliaTransferencia = function (origem, destino, retirada) {
    if (origem.id === destino.id) return { necessaria: false, viavel: true };
    var km = FC.distKm(origem, destino);
    var minutos = Math.ceil(km / FC.cfg().velocidadeMediaKmh * 60) + FC.cfg().margemPreparacaoMin;
    var chegada = new Date(Date.now() + minutos * 60000);
    return { necessaria: true, km: km, minutos: minutos, chegadaPrevista: chegada, viavel: chegada <= new Date(retirada) };
  };

  FC.unidadesDisponiveis = function (lojaId, ini, fim, filtros) {
    FC.limparBloqueios();
    filtros = filtros || {};
    var loja = FC.lojaById(lojaId);
    return FC.db.veiculos.filter(function (v) {
      if (!v.ativo) return false;
      var origem = FC.lojaById(v.localAtual);
      if (!origem || origem.cidade !== loja.cidade) return false;
      if (filtros.tipo && filtros.tipo !== "todos" && v.tipo !== filtros.tipo) return false;
      if (filtros.grupo && filtros.grupo !== "todos" && v.grupo !== filtros.grupo) return false;
      if (filtros.cambio && filtros.cambio !== "todos" && v.cambio !== filtros.cambio) return false;
      if (filtros.acess && filtros.acess.length) {
        for (var i = 0; i < filtros.acess.length; i++) if (v.acessibilidade.indexOf(filtros.acess[i]) < 0) return false;
      }
      return FC.conflitos(v.id, ini, fim).length === 0;
    }).map(function (v) {
      var origem = FC.lojaById(v.localAtual);
      return { veiculo: v, origem: origem, transf: FC.avaliaTransferencia(origem, loja, ini) };
    }).filter(function (x) { return x.transf.viavel; });
  };

  /* ---------- Habilitação e elegibilidade (RF21, RF76, RN05) ---------- */
  FC.categoriaCompativel = function (categoria, veiculo) {
    var m = FC.cfg().matrizCNH, c = String(categoria || "").toUpperCase();
    if (veiculo.cnh === "D") return ["D", "E", "AD", "AE"].indexOf(c) >= 0; // van de 16 lugares
    return (veiculo.tipo === "moto" ? m.moto : m.carro).indexOf(c) >= 0;
  };
  var RESTR_ADAPT = { "Exige câmbio automático": "Câmbio automático", "Exige comandos manuais": "Comandos manuais de freio e acelerador", "Exige pomo no volante": "Pomo giratório no volante" };
  FC.RESTRICOES = ["Exige câmbio automático", "Exige comandos manuais", "Exige pomo no volante", "Uso obrigatório de lentes corretivas"];
  FC.avaliaCondutor = function (cnh, veiculo, fim, rotulo) {
    var motivos = [];
    rotulo = rotulo || "Condutor";
    if (!cnh || !cnh.categoria) { motivos.push(rotulo + ": habilitação não informada."); return { ok: false, motivos: motivos }; }
    if (!FC.categoriaCompativel(cnh.categoria, veiculo)) motivos.push(rotulo + ": categoria " + cnh.categoria + " não habilita para " + (veiculo.cnh === "D" ? "van de passageiros (exige D)" : veiculo.tipo === "moto" ? "motocicleta (exige A)" : "automóvel (exige B)") + " segundo a matriz " + FC.cfg().matrizCNH.versao + ".");
    if (!cnh.validade || new Date(cnh.validade) < new Date(fim)) motivos.push(rotulo + ": habilitação vencida ou vence antes da devolução.");
    (cnh.restricoes || []).forEach(function (r) {
      var need = RESTR_ADAPT[r];
      if (need && veiculo.acessibilidade.indexOf(need) < 0) motivos.push(rotulo + ": restrição \"" + r + "\" incompatível com este veículo (sem " + need.toLowerCase() + ").");
    });
    if (cnh.status === "rejeitada") motivos.push(rotulo + ": documento rejeitado na conferência — envie um novo.");
    return { ok: motivos.length === 0, motivos: motivos, pendente: cnh.status === "pendente" };
  };

  /* ---------- Motorista contratado (RF04, RF73, RN03, RN06) ---------- */
  FC.motoristaLivre = function (m, ini, fim, ignorarRef) {
    return !FC.db.agenda.some(function (a) { return a.tipo === "motorista" && a.motoristaId === m.id && a.ref !== ignorarRef && new Date(a.inicio) < new Date(fim) && new Date(a.fim) > new Date(ini); });
  };
  FC.motoristasElegiveis = function (veiculo, lojaId, ini, fim, ignorarRef) {
    return FC.db.motoristas.filter(function (m) {
      return m.ativo && m.lojas.indexOf(lojaId) >= 0 && FC.categoriaCompativel(m.categoria, veiculo) && new Date(m.validade) > new Date(fim) && FC.motoristaLivre(m, ini, fim, ignorarRef);
    });
  };

  /* ---------- Acessórios por loja e intervalo (RF42) ---------- */
  FC.acessorioLivre = function (ac, lojaId, ini, fim, ignorarRef) {
    var usados = FC.db.reservasAcessorios.filter(function (x) {
      return x.acessorioId === ac.id && x.lojaId === lojaId && x.ref !== ignorarRef && new Date(x.inicio) < new Date(fim) && new Date(x.fim) > new Date(ini);
    }).reduce(function (s, x) { return s + x.qtd; }, 0);
    return Math.max(0, (ac.estoque[lojaId] || 0) - usados);
  };

  /* ---------- Tarifas versionadas (RF72, RNF35) ---------- */
  // diária da unidade: diária do grupo × fator do modelo (carros e motos de luxo variam por modelo)
  FC.diariaVeiculo = function (tarifa, v) { return Math.round(tarifa.diarias[v.grupo] * (v.fator || 1)); };
  FC.tarifaVigente = function (data) {
    var t = FC.db.tarifas.filter(function (x) { return new Date(x.vigenciaInicio) <= new Date(data || Date.now()); });
    return t[t.length - 1] || FC.db.tarifas[0];
  };

  /* ---------- Duração (RF10, RN01, RF44) ---------- */
  FC.duracao = function (ini, fim) {
    var min = (new Date(fim) - new Date(ini)) / 60000;
    var periodo = FC.cfg().periodoCobrancaHoras * 60;
    var cheios = Math.floor(min / periodo);
    var resto = min - cheios * periodo;
    var periodos = cheios + (resto > FC.cfg().toleranciaDevolucaoMin ? 1 : 0);
    return { minutos: min, periodos: Math.max(1, periodos), horas: min / 60 };
  };

  /* ---------- Preço discriminado (RF16, RN07) ---------- */
  FC.cupomValido = function (codigo, sel, clienteId) {
    if (!codigo) return null;
    var c = FC.db.cupons.filter(function (x) { return x.codigo === String(codigo).trim().toUpperCase(); })[0];
    if (!c || !c.ativo) return { erro: "Cupom inválido. Confira o código digitado." };
    var agora = new Date();
    if (new Date(c.fim) < agora) return { erro: "Cupom expirado em " + FC.dataBR(c.fim) + "." };
    if (new Date(c.inicio) > agora) return { erro: "Cupom ainda não está valendo. Início em " + FC.dataBR(c.inicio) + "." };
    if (c.usos >= c.limiteUso) return { erro: "Cupom esgotado: o limite de uso foi atingido." };
    var v = FC.veiculoById(sel.veiculoId);
    if (c.grupos.length && v && c.grupos.indexOf(v.grupo) < 0) return { erro: "Cupom não elegível para o grupo deste veículo." };
    if (c.primeiraLocacao) {
      if (!clienteId) return { erro: "Cupom não elegível sem login: entre na sua conta para validar a primeira locação." };
      var valida = FC.db.reservas.some(function (r) { return r.clienteId === clienteId && (r.estado === "encerrada" || r.estado === "em_andamento"); });
      if (valida) return { erro: "Cupom não elegível: vale só para a primeira locação, e você já tem uma concluída." };
    }
    return { cupom: c };
  };
  /* Planos semanais para motorista de app (catálogo; também usado pelo servidor) */
  FC.PLANOS_APP = [
    { id: "APP1", nome: "Rota Básica", nivel: "Básica", grupos: ["ECO", "COM"], semana: 590 },
    { id: "APP2", nome: "Rota Conforto", nivel: "Conforto", grupos: ["SED"], semana: 760 },
    { id: "APP3", nome: "Rota Premium", nivel: "Premium", grupos: ["SEDM", "SUVG"], semana: 990 }
  ];
  FC.planoApp = function (id) { return FC.PLANOS_APP.filter(function (p) { return p.id === id; })[0] || null; };
  FC.calcularPreco = function (sel, opts) {
    opts = opts || {};
    var cfg = FC.cfg();
    var v = FC.veiculoById(sel.veiculoId);
    var tarifa = sel.tarifaVersao ? FC.db.tarifas.filter(function (t) { return t.versao === sel.tarifaVersao; })[0] : FC.tarifaVigente(sel.inicio);
    var dur = FC.duracao(sel.inicio, sel.fim);
    var n = dur.periodos;
    var itens = [];
    var diaria = FC.diariaVeiculo(tarifa, v);
    var km = (cfg.km.definida && sel.km) ? cfg.km.modalidades.filter(function (m) { return m.id === sel.km; })[0] : null;
    var diariaFinal = diaria + (km ? km.ajusteDiaria : 0);
    var plano = sel.plano && FC.planoApp ? FC.planoApp(sel.plano) : null;
    var semanas = plano ? Math.max(1, Math.ceil(dur.horas / 168)) : 0;
    if (plano) itens.push({ tipo: "locacao", rotulo: "Plano " + plano.nome + " — " + semanas + (semanas === 1 ? " semana" : " semanas") + " × " + FC.brl(plano.semana), valor: plano.semana * semanas });
    else itens.push({ tipo: "locacao", rotulo: "Locação — " + n + (n === 1 ? " diária" : " diárias") + " × " + FC.brl(diariaFinal) + (km && km.ajusteDiaria ? " (" + km.nome + ")" : ""), valor: diariaFinal * n });
    if (sel.motorista) itens.push({ tipo: "motorista", rotulo: "Motorista contratado — " + n + " × " + FC.brl(cfg.motoristaDiaria) + " (valor de referência, PM01)", valor: cfg.motoristaDiaria * n });
    (sel.protecoes || []).forEach(function (pid) {
      var p = FC.db.protecoes.filter(function (x) { return x.id === pid; })[0];
      if (p) itens.push({ tipo: "protecao", rotulo: p.nome + " — " + n + " × " + FC.brl(p.diaria), valor: p.diaria * n });
    });
    (sel.acessorios || []).forEach(function (a) {
      var ac = FC.db.acessorios.filter(function (x) { return x.id === a.id; })[0];
      if (ac && a.qtd > 0) itens.push({ tipo: "acessorio", rotulo: ac.nome + " (" + a.qtd + ") — " + n + " × " + FC.brl(ac.diaria * a.qtd), valor: ac.diaria * a.qtd * n });
    });
    var subtotal = itens.reduce(function (s, i) { return s + i.valor; }, 0);
    var taxas = [];
    var lr = FC.lojaById(sel.lojaRetirada), ld = FC.lojaById(sel.lojaDevolucao || sel.lojaRetirada);
    if (lr.tipo === "aeroporto" && cfg.taxaAeroportoPct) taxas.push({ tipo: "taxa", rotulo: "Taxa de serviço em aeroporto (" + cfg.taxaAeroportoPct + "%, exemplo)", valor: subtotal * cfg.taxaAeroportoPct / 100 });
    if (ld.id !== lr.id) {
      var d = FC.distKm(lr, ld);
      taxas.push({ tipo: "taxa", rotulo: "Devolução em outra loja — " + FC.brl(cfg.devolucaoOutraLoja.base) + " + " + d.toFixed(0) + " km × " + FC.brl(cfg.devolucaoOutraLoja.porKm) + " (regra PM03)", valor: cfg.devolucaoOutraLoja.base + d * cfg.devolucaoOutraLoja.porKm });
    }
    var descontos = [];
    if (sel.cupom) {
      var cv = FC.cupomValido(sel.cupom, sel, opts.clienteId);
      if (cv && cv.cupom) {
        var c = cv.cupom;
        var base = itens.filter(function (i) { return i.tipo === "locacao"; }).reduce(function (s, i) { return s + i.valor; }, 0);
        descontos.push({ tipo: "desconto", rotulo: "Cupom " + c.codigo + " — " + c.descricao, valor: -(c.tipo === "pct" ? base * c.valor / 100 : Math.min(c.valor, base)) });
      }
    }
    var todos = itens.concat(taxas, descontos);
    var total = Math.round(todos.reduce(function (s, i) { return s + i.valor; }, 0) * 100) / 100;
    var caucao = cfg.caucao.adotada ? FC.grupoById(v.grupo).caucao : 0;
    return { periodos: n, duracao: dur, diaria: diaria, tarifaVersao: tarifa.versao, configVersao: cfg.versao, itens: todos, total: total, caucao: caucao, km: km,
      semanal: plano ? { semanas: semanas, plano: plano.id, nome: plano.nome } : null, agora: plano ? Math.round(total / semanas * 100) / 100 : total };
  };

  /* ---------- Reserva: código, bloqueio, pagamento (RF50, RF78, RF79, RF80, RF81) ---------- */
  FC.novoCodigo = function () {
    var c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s;
    do { s = "FC-"; for (var i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)]; } while (FC.reservaByCodigo(s));
    return s;
  };
  // valor cobrado na confirmação: o total, ou a 1ª semana nos planos para app (cobrança semanal antecipada)
  FC.valorAgora = function (r) { return r.preco && r.preco.agora != null ? r.preco.agora : r.preco.total; };
  FC.evento = function (r, texto, autor) { r.eventos.push({ data: new Date().toISOString(), autor: autor || FC.autorAtual(), evento: texto }); };

  FC.criarReservaPendente = function (sel, clienteId, canal, autor) {
    FC.limparBloqueios();
    var v = FC.veiculoById(sel.veiculoId);
    if (FC.conflitos(v.id, sel.inicio, sel.fim).length) return { erro: "Esta unidade acabou de ficar indisponível para o período. Escolha outra unidade." };
    var preco = FC.calcularPreco(sel, { clienteId: clienteId });
    var expira = new Date(Date.now() + FC.cfg().holdMin * 60000).toISOString();
    var r = {
      codigo: FC.novoCodigo(), clienteId: clienteId, canal: canal, veiculoId: v.id, grupo: v.grupo, tipo: v.tipo,
      lojaRetirada: sel.lojaRetirada, lojaDevolucao: sel.lojaDevolucao || sel.lojaRetirada, inicio: new Date(sel.inicio).toISOString(), fim: new Date(sel.fim).toISOString(),
      estado: "aguardando_pagamento", pagamento: "pendente", metodo: null, parcelas: 1,
      plano: sel.plano || null, ear: sel.ear || null, pontosUsados: sel.pontos || 0,
      preco: { total: preco.total, agora: preco.agora, semanal: preco.semanal, itens: preco.itens.map(function (i) { return { rotulo: i.rotulo, valor: Math.round(i.valor * 100) / 100, tipo: i.tipo }; }), caucao: preco.caucao },
      tarifaVersao: preco.tarifaVersao, configVersao: preco.configVersao, motorista: sel.motorista || null, condutores: sel.condutores || [], condutorPrincipal: sel.condutorPrincipal || null,
      protecoes: sel.protecoes || [], acessorios: sel.acessorios || [], km: sel.km || null, cupom: sel.cupom || null, voo: sel.voo || null,
      transferencia: sel.transferencia || null, aceite: sel.aceite || null, bloqueioExpira: expira, criadoEm: new Date().toISOString(),
      eventos: [], despesas: [], infracoes: [], sinistros: [], avaliacao: null, pagamentos: []
    };
    FC.evento(r, "Reserva criada — canal: " + canal + "; aguardando pagamento (bloqueio até " + FC.horaBR(expira) + ")", autor);
    FC.db.reservas.push(r);
    FC.db.agenda.push({ id: FC.uid("AG"), veiculoId: v.id, inicio: r.inicio, fim: r.fim, tipo: "bloqueio", ref: r.codigo, expiraEm: expira });
    if (r.motorista) FC.db.agenda.push({ id: FC.uid("AG"), tipo: "motorista", motoristaId: r.motorista, inicio: r.inicio, fim: r.fim, ref: r.codigo, expiraEm: expira });
    (r.acessorios || []).forEach(function (a) { if (a.qtd > 0) FC.db.reservasAcessorios.push({ acessorioId: a.id, lojaId: r.lojaRetirada, inicio: r.inicio, fim: r.fim, qtd: a.qtd, ref: r.codigo, expiraEm: expira }); });
    FC.audit("Reserva criada (aguardando pagamento)", r.codigo, "canal " + canal, "ok", autor);
    FC.save();
    return { reserva: r };
  };

  FC.confirmar = function (r) {
    r.estado = "confirmada";
    FC.db.agenda.forEach(function (a) { if (a.ref === r.codigo) { if (a.tipo === "bloqueio") a.tipo = "reserva"; delete a.expiraEm; } });
    FC.db.reservasAcessorios.forEach(function (a) { if (a.ref === r.codigo) delete a.expiraEm; });
    delete r.bloqueioExpira;
    if (r.cupom) { var c = FC.db.cupons.filter(function (x) { return x.codigo === r.cupom; })[0]; if (c) c.usos++; }
    if (r.transferencia && r.transferencia.necessaria) {
      var v = FC.veiculoById(r.veiculoId);
      var t = { id: FC.uid("TR-"), veiculoId: v.id, origem: v.localAtual, destino: r.lojaRetirada, responsavel: "A definir (operador de frota)", saidaPrevista: new Date().toISOString(), chegadaPrevista: r.transferencia.chegadaPrevista, margemMin: FC.cfg().margemPreparacaoMin, status: "planejada", motivo: "Atender reserva " + r.codigo, reserva: r.codigo, concluidaEm: null };
      FC.db.transferencias.push(t);
      FC.evento(r, "Transferência planejada de " + FC.lojaById(v.localAtual).nome + " para " + FC.lojaById(r.lojaRetirada).nome, "sistema");
    }
    FC.evento(r, "Reserva confirmada após aprovação do pagamento e verificação final de capacidade (RF80)", "sistema");
    var cli = FC.clienteById(r.clienteId);
    if (cli) {
      FC.outbox(cli.email, "e-mail", "confirmação", "Reserva " + r.codigo + " confirmada", "Olá, " + cli.nome + ". Sua reserva " + r.codigo + " está confirmada. Retirada em " + FC.lojaById(r.lojaRetirada).nome + " em " + FC.dtBR(r.inicio) + ".", { ref: r.codigo });
      FC.outbox(cli.telefone, "SMS", "lembrete de retirada", "Lembrete " + r.codigo, "Lembrete: retirada amanhã às " + FC.horaBR(r.inicio) + " em " + FC.lojaById(r.lojaRetirada).nome + ".", { ref: r.codigo, agendadoPara: new Date(new Date(r.inicio).getTime() - 864e5).toISOString() });
      FC.outbox(cli.email, "e-mail", "lembrete de devolução", "Lembrete de devolução " + r.codigo, "Lembrete: devolução em " + FC.dtBR(r.fim) + " em " + FC.lojaById(r.lojaDevolucao).nome + ".", { ref: r.codigo, agendadoPara: new Date(new Date(r.fim).getTime() - 3 * 36e5).toISOString() });
    }
    FC.audit("Reserva confirmada", r.codigo, "pagamento aprovado", "ok", "sistema");
  };

  // Simulador de pagamento (RF84). Resultado: aprovado | recusado | pendente | aprovado_tardio
  FC.processarPagamento = function (codigo, metodo, parcelas, resultado, idEvento) {
    FC.limparBloqueios();
    var r = FC.reservaByCodigo(codigo);
    if (!r) return { erro: "Reserva não encontrada." };
    r.pagamentos = r.pagamentos || [];
    idEvento = idEvento || FC.uid("PG");
    if (r.pagamentos.some(function (p) { return p.idEvento === idEvento; })) return { reserva: r, duplicado: true, msg: "Evento de pagamento repetido ignorado — nada foi cobrado ou confirmado de novo (RF80)." };
    if (r.pagamento === "aprovado" && resultado.indexOf("aprovado") === 0) return { reserva: r, duplicado: true, msg: "Pagamento já aprovado anteriormente — confirmação não duplicada." };
    var pg = { idEvento: idEvento, data: new Date().toISOString(), metodo: metodo, parcelas: parcelas || 1, valor: FC.valorAgora(r), resultado: resultado, ambiente: "DEMONSTRAÇÃO" };
    r.pagamentos.push(pg);
    r.metodo = metodo; r.parcelas = parcelas || 1;
    var nomeMet = { credito: "cartão de crédito", debito: "cartão de débito", pix: "Pix" }[metodo] || metodo;
    if (resultado === "recusado") {
      r.pagamento = "recusado"; FC.evento(r, "Pagamento recusado (" + nomeMet + ") — reserva não confirmada", "simulador");
      FC.save(); return { reserva: r, msg: "Pagamento recusado. A reserva não foi confirmada; você pode tentar outro meio enquanto o bloqueio estiver ativo." };
    }
    if (resultado === "pendente") {
      r.pagamento = "pendente"; FC.evento(r, "Pagamento pendente (" + nomeMet + ")", "simulador");
      FC.save(); return { reserva: r, msg: "Pagamento em análise. A reserva só será confirmada após a aprovação." };
    }
    // aprovado ou aprovado tardio
    if (resultado === "aprovado_tardio") {
      r.estado = r.estado === "aguardando_pagamento" ? "expirada" : r.estado;
      FC.db.agenda = FC.db.agenda.filter(function (a) { return !(a.ref === r.codigo && (a.tipo === "bloqueio" || a.tipo === "motorista")); });
      FC.evento(r, "Bloqueio expirado antes da aprovação (simulação de aprovação tardia)", "simulador");
    }
    r.pagamento = "aprovado";
    FC.evento(r, "Pagamento aprovado (" + nomeMet + (parcelas > 1 ? ", " + parcelas + "x" : "") + ")", "simulador");
    var conflito = FC.conflitos(r.veiculoId, r.inicio, r.fim, r.codigo).length > 0;
    var bloqueioAtivo = FC.db.agenda.some(function (a) { return a.ref === r.codigo && a.tipo === "bloqueio"; });
    if (r.estado === "aguardando_pagamento" && bloqueioAtivo && !conflito) {
      FC.confirmar(r); FC.save();
      return { reserva: r, msg: "Pagamento aprovado e reserva confirmada." };
    }
    // Exceção (RF81)
    if (!conflito) {
      FC.db.agenda.push({ id: FC.uid("AG"), veiculoId: r.veiculoId, inicio: r.inicio, fim: r.fim, tipo: "bloqueio", ref: r.codigo });
      r.estado = "aguardando_pagamento";
      FC.confirmar(r);
      FC.evento(r, "Aprovação tardia tratada como exceção: unidade ainda disponível, reserva confirmada após nova verificação (RF81)", "sistema");
      FC.save();
      return { reserva: r, msg: "Pagamento aprovado após a expiração. A unidade ainda estava livre e a reserva foi confirmada após nova verificação." };
    }
    r.estado = "excecao";
    FC.evento(r, "Pagamento aprovado sem capacidade disponível — exceção aberta; reembolso integral iniciado (RF81)", "sistema");
    FC.reembolsar(r, FC.valorAgora(r), "Aprovação tardia sem capacidade", "sistema");
    FC.save();
    return { reserva: r, msg: "O pagamento foi aprovado depois que a unidade deixou de estar disponível. Nenhum veículo incompatível foi reservado e o reembolso integral foi iniciado." };
  };

  FC.reembolsar = function (r, valor, motivo, autor) {
    r.reembolsos = r.reembolsos || [];
    var jaReemb = r.reembolsos.reduce(function (s, x) { return s + x.valor; }, 0);
    var pago = (r.pagamentos || []).filter(function (p) { return p.resultado.indexOf("aprovado") === 0; }).reduce(function (s, p) { return s + p.valor; }, 0);
    valor = Math.min(valor, Math.max(0, pago - jaReemb));
    if (valor <= 0) return null;
    var rb = { id: FC.uid("RB"), data: new Date().toISOString(), valor: Math.round(valor * 100) / 100, motivo: motivo, autorizadoPor: autor || FC.autorAtual(), status: "processado (simulado)" };
    r.reembolsos.push(rb);
    FC.evento(r, "Reembolso de " + FC.brl(rb.valor) + " — " + motivo, autor);
    FC.audit("Reembolso", r.codigo, motivo, FC.brl(rb.valor));
    return rb;
  };

  FC.liberarRecursos = function (r) {
    FC.db.agenda = FC.db.agenda.filter(function (a) { return a.ref !== r.codigo; });
    FC.db.reservasAcessorios = FC.db.reservasAcessorios.filter(function (a) { return a.ref !== r.codigo; });
  };

  FC.politicaCancelamento = function (r) {
    var cfg = FC.cfg().cancelamento;
    var horas = (new Date(r.inicio) - Date.now()) / 36e5;
    var multa = horas >= cfg.semMultaAteHoras ? 0 : FC.valorAgora(r) * cfg.multaPct / 100;
    var pago = r.pagamento === "aprovado" ? FC.valorAgora(r) : 0;
    return { horas: horas, multa: Math.round(multa * 100) / 100, reembolso: Math.max(0, Math.round((pago - multa) * 100) / 100), regra: "Cancelamento sem multa até " + cfg.semMultaAteHoras + " h antes da retirada; depois, multa de " + cfg.multaPct + "% (parâmetros de demonstração — PM07)." };
  };

  FC.ESTADOS = { rascunho: "Rascunho", aguardando_pagamento: "Aguardando pagamento", confirmada: "Confirmada", em_andamento: "Em andamento", encerrada: "Encerrada", cancelada: "Cancelada", expirada: "Expirada", excecao: "Exceção" };
  FC.PAGAMENTOS = { pendente: "Pendente", aprovado: "Aprovado", recusado: "Recusado", estornado: "Estornado" };
  FC.CANAIS = { site: "Site", telefone: "Telefone", loja: "Loja", whatsapp: "WhatsApp" };
  FC.badgeEstado = function (e) {
    var cls = { confirmada: "ok", em_andamento: "info", encerrada: "muted", cancelada: "bad", expirada: "bad", excecao: "warn", aguardando_pagamento: "warn" }[e] || "muted";
    return '<span class="status status--' + cls + '">' + (FC.ESTADOS[e] || e) + "</span>";
  };

  /* ---------- Validação (RF35, RNF25) ---------- */
  FC.cpfValido = function (cpf) {
    cpf = String(cpf || "").replace(/\D/g, "");
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    var s = 0, i;
    for (i = 0; i < 9; i++) s += +cpf[i] * (10 - i);
    var d1 = (s * 10) % 11 % 10;
    s = 0; for (i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
    var d2 = (s * 10) % 11 % 10;
    return d1 === +cpf[9] && d2 === +cpf[10];
  };
  FC.mascaraCPF = function (v) { v = v.replace(/\D/g, "").slice(0, 11); return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); };
  FC.emailValido = function (e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim()); };
  FC.mascaraDoc = function (doc) { doc = String(doc || ""); return doc.length > 4 ? doc.slice(0, 3).replace(/./g, "*") + doc.slice(3, -2).replace(/[0-9A-Za-z]/g, "*") + doc.slice(-2) : "****"; };

  /* ---------- Sessão do cliente (RF22, RNF06, RNF09) ---------- */
  FC.login = function (ident, senha) {
    ident = String(ident || "").trim().toLowerCase();
    var cfg = FC.cfg();
    var t = FC.db.sessao.tentativas[ident] || { n: 0, ate: 0 };
    if (t.ate > Date.now()) return { erro: "Muitas tentativas. Tente novamente após " + FC.horaBR(t.ate) + " ou recupere sua senha." };
    var soDig = ident.replace(/\D/g, "");
    var c = FC.db.clientes.filter(function (x) { return x.email.toLowerCase() === ident || (soDig.length === 11 && x.doc.replace(/\D/g, "") === soDig); })[0];
    if (!c || c.senhaHash !== FC.hash(senha)) {
      t.n++;
      if (t.n >= cfg.loginMaxTentativas) { t.ate = Date.now() + cfg.loginBloqueioMin * 60000; t.n = 0; }
      FC.db.sessao.tentativas[ident] = t; FC.save();
      FC.audit("Falha de login", FC.mascaraDoc(ident), "credenciais inválidas", "negado", "visitante");
      return { erro: "E-mail/CPF ou senha incorretos." };
    }
    FC.db.sessao.tentativas[ident] = { n: 0, ate: 0 };
    FC.db.sessao.clienteId = c.id; FC.save();
    return { cliente: c };
  };
  FC.clienteAtual = function () { return FC.db.sessao.clienteId ? FC.clienteById(FC.db.sessao.clienteId) : null; };
  // Login da área da empresa por e-mail e senha (RF70, RNF06, RNF09); mesma contagem de tentativas do cliente
  FC.loginAdmin = function (email, senha) {
    email = String(email || "").trim().toLowerCase();
    var cfg = FC.cfg(), chave = "admin:" + email;
    var t = FC.db.sessao.tentativas[chave] || { n: 0, ate: 0 };
    if (t.ate > Date.now()) return { erro: "Muitas tentativas. Tente novamente após " + FC.horaBR(t.ate) + "." };
    var u = FC.db.usuarios.filter(function (x) { return x.ativo && String(x.email).toLowerCase() === email; })[0];
    if (!u || u.senhaHash !== FC.hash(senha)) {
      t.n++;
      if (t.n >= cfg.loginMaxTentativas) { t.ate = Date.now() + cfg.loginBloqueioMin * 60000; t.n = 0; }
      FC.db.sessao.tentativas[chave] = t; FC.save();
      FC.audit("Falha de login administrativo", email, "credenciais inválidas", "negado", "visitante");
      return { erro: "E-mail ou senha incorretos." };
    }
    FC.db.sessao.tentativas[chave] = { n: 0, ate: 0 };
    FC.db.sessao.adminId = u.id;
    FC.audit("Login administrativo", u.id, "e-mail e senha", "ok", u.nome); FC.save();
    return { usuario: u };
  };
  // Gestor define/troca a senha de um usuário interno; guarda só o hash (RNF36)
  FC.definirSenhaAdmin = function (id, senha) {
    var u = FC.db.usuarios.filter(function (x) { return x.id === id; })[0];
    if (!u) return { erro: "Usuário não encontrado." };
    var min = FC.cfg().senhaMin || 8;
    if (String(senha || "").length < min) return { erro: "A senha precisa ter no mínimo " + min + " caracteres." };
    u.senhaHash = FC.hash(senha);
    FC.db.sessao.tentativas["admin:" + String(u.email).toLowerCase()] = { n: 0, ate: 0 };
    var quem = FC.adminAtual();
    FC.audit("Senha de usuário interno definida", u.id, "", "ok", quem ? quem.nome : "sistema"); FC.save();
    return { ok: true };
  };
  FC.adminAtual = function () { var id = FC.db.sessao.adminId; return id ? FC.db.usuarios.filter(function (u) { return u.id === id; })[0] : null; };
  FC.PERFIS = { gestor: "Administrador/gestor", atendente: "Atendente", frota: "Operador de frota" };
  FC.pode = function (acao) {
    var u = FC.adminAtual(); if (!u) return false;
    var mapa = {
      gestor: ["*"],
      atendente: ["painel", "reservas", "assistida", "clientes", "atendimento", "saida", "lojas:ver", "frota:ver", "relatorios", "requisitos"],
      frota: ["painel", "frota", "transferencias", "manutencao", "vistoria", "motoristas:ver", "lojas:ver", "reservas:ver", "requisitos"]
    }[u.perfil];
    return mapa.indexOf("*") >= 0 || mapa.indexOf(acao) >= 0 || mapa.indexOf(acao.split(":")[0]) >= 0;
  };
  FC.noEscopo = function (lojaId) { var u = FC.adminAtual(); return !!u && (u.lojas.indexOf("*") >= 0 || u.lojas.indexOf(lojaId) >= 0); };
})();

/* ---------- Backend do cliente (API /api no mesmo site; banco D1) ---------- */
(function () {
  "use strict";
  var FC = window.FC;
  FC.api = function (metodo, caminho, corpo) {
    var op = { method: metodo, credentials: "same-origin", headers: { Accept: "application/json" } };
    if (corpo !== undefined) { op.headers["Content-Type"] = "application/json"; op.body = JSON.stringify(corpo); }
    return fetch("/api" + caminho, op).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (dados) { return { ok: res.ok, status: res.status, dados: dados }; });
    }, function () { return { ok: false, status: 0, dados: { erro: "Sem conexão com o servidor. Tente novamente." } }; });
  };
  // cópia local do cliente do servidor: as telas existentes (etapas da reserva, Minha conta) leem FC.db.clientes
  FC.guardarClienteServidor = function (c) {
    var local = FC.clienteById(c.id);
    var dados = { id: c.id, nome: c.nome, email: c.email, docTipo: c.docTipo, doc: c.doc, telefone: c.telefone, nascimento: c.nascimento, cnh: c.cnh, criadoEm: c.criadoEm, servidor: true };
    if (local) Object.assign(local, dados); else FC.db.clientes.push(Object.assign({ marketing: false, newsletter: false, bloqueado: null }, dados));
    FC.db.sessao.clienteId = c.id; FC.save();
    return FC.clienteById(c.id);
  };
  // cópia local de uma reserva do servidor (confirmação, comprovante e Minha conta leem FC.db.reservas)
  FC.guardarReservaServidor = function (r) {
    var v = FC.veiculoById(r.veiculoId) || {};
    var local = FC.reservaByCodigo(r.codigo);
    var dados = { codigo: r.codigo, clienteId: FC.db.sessao.clienteId, canal: "site", veiculoId: r.veiculoId, grupo: v.grupo, tipo: v.tipo, lojaRetirada: r.lojaRetirada,
      lojaDevolucao: r.lojaDevolucao, inicio: r.inicio, fim: r.fim, estado: r.estado, pagamento: r.pagamento, metodo: r.metodo, parcelas: r.parcelas, preco: r.preco,
      motorista: r.motorista, tarifaVersao: r.tarifaVersao, bloqueioExpira: r.bloqueioExpira, criadoEm: r.criadoEm, eventos: r.eventos || [], servidor: true };
    if (local) Object.assign(local, dados);
    else FC.db.reservas.push(Object.assign({ condutores: [], protecoes: [], acessorios: [], despesas: [], infracoes: [], sinistros: [], pagamentos: [], avaliacao: null }, dados));
    FC.save();
    return FC.reservaByCodigo(r.codigo);
  };
  FC.esquecerClienteServidor = function () {
    var id = FC.db.sessao.clienteId, c = id && FC.clienteById(id);
    if (c && c.servidor) {
      FC.db.reservas = FC.db.reservas.filter(function (r) { return !(r.servidor && r.clienteId === id); });
      FC.db.clientes = FC.db.clientes.filter(function (x) { return x.id !== id; });
    }
    FC.db.sessao.clienteId = null; FC.db.rascunho = null; FC.save();
  };
  // ao abrir qualquer página: quem tem sessão no servidor continua logado (o refresh não desloga)
  FC.sessaoCliente = function () {
    return FC.api("GET", "/eu").then(function (r) {
      if (r.ok && r.dados.cliente) return FC.guardarClienteServidor(r.dados.cliente);
      if (r.status === 401) FC.esquecerClienteServidor();
      return null;
    });
  };
  FC.entrarCliente = function (ident, senha) {
    return FC.api("POST", "/login", { ident: ident, senha: senha }).then(function (r) {
      if (!r.ok) return { erro: r.dados.erro || "Não foi possível entrar." };
      return { cliente: FC.guardarClienteServidor(r.dados.cliente) };
    });
  };
  FC.sairCliente = function () {
    return FC.api("POST", "/sair", {}).then(function () { FC.esquecerClienteServidor(); });
  };
  // ocupações gravadas no servidor entram na agenda local para a busca não oferecer carro já alugado
  FC.ocupacaoServidor = function (ini, fim) {
    var chave = new Date(ini).toISOString() + "|" + new Date(fim).toISOString();
    if (FC._ocupChave === chave) return Promise.resolve(true);
    return FC.api("GET", "/ocupacao?inicio=" + encodeURIComponent(new Date(ini).toISOString()) + "&fim=" + encodeURIComponent(new Date(fim).toISOString())).then(function (r) {
      FC._ocupChave = chave;
      FC.db.agenda = FC.db.agenda.filter(function (a) { return !a.servidor; });
      if (!r.ok) { FC._ocupErro = true; return false; }
      FC._ocupErro = false;
      (r.dados.ocupados || []).forEach(function (o, i) { FC.db.agenda.push({ id: "SRV" + i, veiculoId: o.veiculoId, inicio: o.inicio, fim: o.fim, tipo: "reserva", ref: "servidor", servidor: true }); });
      return true;
    });
  };
})();
