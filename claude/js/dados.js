/* Falls Car — base de demonstração (RNF36) */
window.FC = window.FC || {};

FC.SEED_VERSION = 5;

FC.buildSeed = function () {
  var now = new Date();
  function iso(d) { return new Date(d).toISOString(); }
  function addH(d, h) { return new Date(new Date(d).getTime() + h * 36e5); }
  function day(off, h, m) { var d = new Date(now); d.setDate(d.getDate() + off); d.setHours(h || 10, m || 0, 0, 0); return d; }
  // gerador pseudoaleatório determinístico
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }

  var H24 = { 0: ["00:00", "23:59"], 1: ["00:00", "23:59"], 2: ["00:00", "23:59"], 3: ["00:00", "23:59"], 4: ["00:00", "23:59"], 5: ["00:00", "23:59"], 6: ["00:00", "23:59"] };
  var HAERO = { 0: ["06:00", "23:00"], 1: ["06:00", "23:00"], 2: ["06:00", "23:00"], 3: ["06:00", "23:00"], 4: ["06:00", "23:00"], 5: ["06:00", "23:00"], 6: ["06:00", "23:00"] };
  var HCID = { 0: null, 1: ["08:00", "20:00"], 2: ["08:00", "20:00"], 3: ["08:00", "20:00"], 4: ["08:00", "20:00"], 5: ["08:00", "20:00"], 6: ["08:00", "14:00"] };

  var DDD = { SP: "11", RJ: "21", MG: "31", DF: "61", PE: "81", BA: "71", RS: "51", PR: "41", CE: "85" };
  function loja(id, nome, tipo, cidade, uf, endereco, lat, lon, horario, mapa, extra) {
    var ddd = DDD[uf] || "11", fim = (1000 + id.length * 37 + Math.abs(Math.round(lat * 7))).toString().slice(-4);
    return Object.assign({
      id: id, nome: nome, tipo: tipo, cidade: cidade, uf: uf, endereco: endereco, mapa: mapa,
      lat: lat, lon: lon, horario: horario, excecoes: [], telefone: "(" + ddd + ") 4000-" + fim, whatsapp: "+55 " + ddd + " 99000-" + fim, ativa: true,
      instrucoes: tipo === "aeroporto"
        ? "Siga as placas de locadoras até o balcão Falls Car. Leve CNH, documento com foto e o código da reserva."
        : "Balcão no térreo, com estacionamento para clientes. Leve CNH, documento com foto e o código da reserva."
    }, extra || {});
  }
  var natal = new Date(now.getFullYear(), 11, 25).toISOString().slice(0, 10);
  var lojas = [
    loja("GRU", "Aeroporto de Guarulhos (GRU)", "aeroporto", "Guarulhos", "SP", "Rod. Hélio Smidt, s/n · Terminal 2", -23.4322, -46.4692, H24, "Aeroporto Internacional de Guarulhos Terminal 2"),
    loja("CGH", "Aeroporto de Congonhas (CGH)", "aeroporto", "São Paulo", "SP", "Av. Washington Luís, s/n · Vila Congonhas", -23.6261, -46.6566, HAERO, "Aeroporto de Congonhas, São Paulo"),
    loja("SPPAU", "São Paulo — Paulista", "cidade", "São Paulo", "SP", "Av. Paulista, 1000 · Bela Vista", -23.5649, -46.6522, HCID, "Av. Paulista, 1000 - Bela Vista, São Paulo - SP", { excecoes: [{ data: natal, fechado: true, motivo: "Natal" }] }),
    loja("SPPIN", "São Paulo — Pinheiros", "cidade", "São Paulo", "SP", "Rua dos Pinheiros, 500 · Pinheiros", -23.5665, -46.6849, HCID, "Rua dos Pinheiros, 500 - Pinheiros, São Paulo - SP"),
    loja("GIG", "Aeroporto do Galeão (GIG)", "aeroporto", "Rio de Janeiro", "RJ", "Av. Vinte de Janeiro, s/n · Terminal 2", -22.8089, -43.2436, H24, "Aeroporto Internacional do Galeão Terminal 2, Rio de Janeiro"),
    loja("SDU", "Aeroporto Santos Dumont (SDU)", "aeroporto", "Rio de Janeiro", "RJ", "Praça Senador Salgado Filho, s/n · Centro", -22.9105, -43.1631, HAERO, "Aeroporto Santos Dumont, Rio de Janeiro"),
    loja("RJBAR", "Rio de Janeiro — Barra da Tijuca", "cidade", "Rio de Janeiro", "RJ", "Av. das Américas, 2000 · Barra da Tijuca", -23.0004, -43.3659, HCID, "Av. das Américas, 2000 - Barra da Tijuca, Rio de Janeiro - RJ"),
    loja("CNF", "Aeroporto de Confins (CNF)", "aeroporto", "Confins", "MG", "Rod. LMG-800, km 7,9 · Confins", -19.6244, -43.9719, H24, "Aeroporto Internacional de Belo Horizonte Confins"),
    loja("BHSAV", "Belo Horizonte — Savassi", "cidade", "Belo Horizonte", "MG", "Av. Getúlio Vargas, 300 · Funcionários", -19.9386, -43.9346, HCID, "Av. Getúlio Vargas, 300 - Funcionários, Belo Horizonte - MG"),
    loja("BSB", "Aeroporto de Brasília (BSB)", "aeroporto", "Brasília", "DF", "Lago Sul, s/n · Terminal 1", -15.8697, -47.9208, H24, "Aeroporto Internacional de Brasília"),
    loja("REC", "Aeroporto do Recife (REC)", "aeroporto", "Recife", "PE", "Praça Ministro Salgado Filho, s/n · Imbiribeira", -8.1264, -34.9236, H24, "Aeroporto Internacional do Recife Guararapes"),
    loja("SSA", "Aeroporto de Salvador (SSA)", "aeroporto", "Salvador", "BA", "Praça Gago Coutinho, s/n · São Cristóvão", -12.9086, -38.3225, HAERO, "Aeroporto Internacional de Salvador"),
    loja("POA", "Aeroporto de Porto Alegre (POA)", "aeroporto", "Porto Alegre", "RS", "Av. Severo Dullius, 90010 · Anchieta", -29.9939, -51.1711, HAERO, "Aeroporto Internacional Salgado Filho, Porto Alegre"),
    loja("CWB", "Aeroporto de Curitiba (CWB)", "aeroporto", "São José dos Pinhais", "PR", "Av. Rocha Pombo, s/n · Águas Belas", -25.5285, -49.1758, HAERO, "Aeroporto Internacional Afonso Pena, São José dos Pinhais"),
    loja("FOR", "Aeroporto de Fortaleza (FOR)", "aeroporto", "Fortaleza", "CE", "Av. Senador Carlos Jereissati, 3000 · Serrinha", -3.7763, -38.5326, HAERO, "Aeroporto Internacional de Fortaleza")
  ];

  var grupos = [
    { id: "ECO", nome: "Econômico", tipo: "carro", descricao: "Compactos de entrada, ideais para a cidade.", habilitacao: "carro", caucao: 700 },
    { id: "COM", nome: "Compacto", tipo: "carro", descricao: "Hatches com bom espaço e consumo baixo.", habilitacao: "carro", caucao: 800 },
    { id: "SED", nome: "Sedã", tipo: "carro", descricao: "Sedãs compactos com porta-malas grande.", habilitacao: "carro", caucao: 900 },
    { id: "SEDM", nome: "Sedã médio", tipo: "carro", descricao: "Mais espaço e conforto para viagens longas.", habilitacao: "carro", caucao: 1100 },
    { id: "SUV", nome: "SUV compacto", tipo: "carro", descricao: "Posição de dirigir elevada e versatilidade.", habilitacao: "carro", caucao: 1200 },
    { id: "SUVG", nome: "SUV médio", tipo: "carro", descricao: "Mais espaço para a família e a bagagem.", habilitacao: "carro", caucao: 1500 },
    { id: "PIC", nome: "Picape", tipo: "carro", descricao: "Caçamba para carga, trabalho e estrada.", habilitacao: "carro", caucao: 1500 },
    { id: "MIN", nome: "Minivan e van", tipo: "carro", descricao: "De 7 a 16 lugares para grupos.", habilitacao: "carro", caucao: 1500 },
    { id: "ELE", nome: "Elétrico", tipo: "carro", descricao: "100% elétricos, silenciosos e econômicos.", habilitacao: "carro", caucao: 1200 },
    { id: "LUX", nome: "Carro de luxo", tipo: "carro", descricao: "Premium, esportivos e superesportivos.", habilitacao: "carro", caucao: 5000 },
    { id: "MOT1", nome: "Moto 125 a 160 cc", tipo: "moto", descricao: "Motos urbanas, ágeis e econômicas.", habilitacao: "moto", caucao: 400 },
    { id: "SCO", nome: "Scooter", tipo: "moto", descricao: "Câmbio automático e espaço sob o banco.", habilitacao: "moto", caucao: 500 },
    { id: "MOT2", nome: "Moto trail e street", tipo: "moto", descricao: "Para cidade, estrada e terra.", habilitacao: "moto", caucao: 800 },
    { id: "MOTL", nome: "Moto de luxo", tipo: "moto", descricao: "Alta cilindrada para viajar com conforto.", habilitacao: "moto", caucao: 2500 }
  ];

  // Tarifas versionadas (RF72, RNF35): diária "a partir de" por grupo; cada modelo tem um fator
  var tarifas = [{
    versao: 1, vigenciaInicio: iso(day(-200)), justificativa: "Tabela inicial de demonstração (pesquisa de preços pendente)", responsavel: "Gestor (demo)", criadoEm: iso(day(-200)),
    diarias: { ECO: 119, COM: 139, SED: 159, SEDM: 209, SUV: 219, SUVG: 299, PIC: 229, MIN: 259, ELE: 239, LUX: 590, MOT1: 69, SCO: 79, MOT2: 109, MOTL: 249 }
  }];

  // [modelo, foto (claude/assets/carros/<foto>.jpg), ajustes: l=lugares m=malas c=câmbio cc=cilindrada f=fator da diária k=combustível cnh=categoria mínima]
  var modelos = {
    ECO: [["Fiat Mobi", "fiat-mobi"], ["Renault Kwid", "renault-kwid"], ["Volkswagen Gol", "vw-gol", { f: 1.05 }]],
    COM: [["Chevrolet Onix", "chevrolet-onix", { c: "Automático", f: 1.05 }], ["Hyundai HB20", "hyundai-hb20"], ["Fiat Argo", "fiat-argo"], ["Citroën C3", "citroen-c3"], ["Volkswagen Polo Track", "vw-polo-track", { f: 1.05 }]],
    SED: [["Renault Logan", "renault-logan"], ["Chevrolet Onix Plus", "chevrolet-onix-plus", { f: 1.05 }], ["Hyundai HB20S", "hyundai-hb20s", { f: 1.05 }], ["Fiat Cronos", "fiat-cronos"], ["Volkswagen Virtus", "vw-virtus", { f: 1.1 }]],
    SEDM: [["Honda City", "honda-city"], ["Nissan Sentra", "nissan-sentra", { f: 1.05 }], ["Toyota Corolla", "toyota-corolla", { f: 1.1 }], ["Honda Civic", "honda-civic", { f: 1.2 }]],
    SUV: [["Fiat Pulse", "fiat-pulse"], ["Volkswagen Nivus", "vw-nivus", { f: 1.05 }], ["Chevrolet Tracker", "chevrolet-tracker", { f: 1.05 }], ["Hyundai Creta", "hyundai-creta", { f: 1.1 }], ["Volkswagen T-Cross", "vw-t-cross", { f: 1.1 }], ["Jeep Renegade", "jeep-renegade", { f: 1.1 }]],
    SUVG: [["Toyota Corolla Cross", "toyota-corolla-cross"], ["Volkswagen Tiguan Allspace", "vw-tiguan", { l: 7, f: 1.25 }]],
    PIC: [["Volkswagen Saveiro", "vw-saveiro", { l: 2, c: "Manual" }], ["Chevrolet Montana", "chevrolet-montana"], ["Fiat Strada", "fiat-strada", { c: "Manual" }], ["Fiat Toro", "fiat-toro", { f: 1.3 }], ["Chevrolet S10", "chevrolet-s10", { f: 1.6, k: "Diesel" }], ["Toyota Hilux", "toyota-hilux", { f: 1.75, k: "Diesel" }]],
    MIN: [["Chevrolet Spin", "chevrolet-spin"], ["Fiat Doblò", "fiat-doblo", { c: "Manual" }], ["Van 16 lugares (Sprinter ou Master)", "van-16-lugares-sprinter-ou-master", { l: 16, m: 8, c: "Manual", f: 2.4, k: "Diesel", cnh: "D" }]],
    ELE: [["BYD Dolphin Mini", "byd-dolphin-mini", { l: 4, m: 1 }], ["BYD Dolphin", "byd-dolphin", { f: 1.2 }]],
    LUX: [["Audi Q3", "audi-q3"], ["BMW X1", "bmw-x1"], ["Mercedes-Benz GLA 200", "mercedes-gla-200", { f: 1.05 }], ["Volvo XC60", "volvo-xc60", { f: 1.25 }], ["BMW 320i", "bmw-320i", { f: 1.15 }],
      ["BMW X3", "bmw-x3", { f: 1.35 }], ["Mercedes-Benz E 300", "mercedes-e300", { f: 1.6 }], ["BMW X5", "bmw-x5", { f: 1.9 }], ["Porsche Macan", "porsche-macan", { f: 2 }],
      ["Ford Mustang GT", "ford-mustang-gt", { l: 4, m: 1, f: 2.1, k: "Gasolina" }], ["Chevrolet Camaro", "chevrolet-camaro", { l: 4, m: 1, f: 2, k: "Gasolina" }], ["Porsche 911", "porsche-911", { l: 4, m: 1, f: 3.6, k: "Gasolina" }],
      ["Ferrari Roma", "ferrari-roma", { l: 4, m: 1, f: 5, k: "Gasolina" }], ["Lamborghini Huracán EVO", "lamborghini-huracan-evo", { l: 2, m: 1, f: 5.6, k: "Gasolina" }]],
    MOT1: [["Honda Pop 110i", "honda-pop-110i", { cc: 110 }], ["Honda Biz 125", "honda-biz-125", { cc: 125, c: "Semiautomático", f: 1.05 }], ["Honda CG 160 Fan", "honda-cg-160-fan", { cc: 160, f: 1.1 }], ["Honda CG 160 Titan", "honda-cg-160-titan", { cc: 160, f: 1.15 }], ["Yamaha Factor 150", "yamaha-factor-150", { cc: 150, f: 1.1 }]],
    SCO: [["Honda Elite 125", "honda-elite-125", { cc: 125 }], ["Yamaha NMAX 160", "yamaha-nmax-160", { cc: 160, f: 1.15 }], ["Honda PCX 160", "honda-pcx-160", { cc: 160, f: 1.15 }], ["Honda ADV 160", "honda-adv-160", { cc: 160, f: 1.25 }]],
    MOT2: [["Honda Bros 160", "honda-bros-160", { cc: 160 }], ["Honda XRE 190", "honda-xre-190", { cc: 190, f: 1.05 }], ["Yamaha Lander 250", "yamaha-lander-250", { cc: 250, f: 1.15 }], ["Yamaha Fazer 250", "yamaha-fazer-250", { cc: 250, f: 1.15 }],
      ["Honda CB 300F Twister", "honda-cb-300f-twister", { cc: 300, f: 1.2 }], ["Honda XRE 300", "honda-xre-300", { cc: 300, f: 1.25 }], ["Yamaha MT-03", "yamaha-mt-03", { cc: 321, f: 1.4 }], ["Kawasaki Ninja 400", "kawasaki-ninja-400", { cc: 400, f: 1.5 }]],
    MOTL: [["BMW G 310 GS", "bmw-g-310-gs", { cc: 313 }], ["Yamaha MT-09", "yamaha-mt-09", { cc: 890, f: 1.5 }], ["BMW F 850 GS", "bmw-f-850-gs", { cc: 853, f: 1.7 }], ["Triumph Tiger 900", "triumph-tiger-900", { cc: 888, f: 1.75 }],
      ["Ducati Monster", "ducati-monster", { cc: 937, f: 1.8 }], ["Honda Africa Twin", "honda-africa-twin", { cc: 1084, f: 1.85 }], ["BMW R 1250 GS", "bmw-r-1250-gs", { cc: 1254, f: 2.2 }], ["Harley-Davidson Fat Boy", "harley-davidson-fat-boy", { cc: 1868, f: 2.3 }],
      ["Kawasaki Ninja ZX-10R", "kawasaki-ninja-zx-10r", { cc: 998, f: 2.3 }], ["BMW R 1300 GS", "bmw-r-1300-gs", { cc: 1300, f: 2.4 }], ["BMW S 1000 RR", "bmw-s-1000-rr", { cc: 999, f: 2.5 }], ["Harley-Davidson Street Glide", "harley-davidson-street-glide", { cc: 1923, f: 2.6 }]]
  };
  var specs = {
    ECO: { lugares: 5, malas: 1, cambio: "Manual", ar: true }, COM: { lugares: 5, malas: 2, cambio: "Manual", ar: true },
    SED: { lugares: 5, malas: 3, cambio: "Automático", ar: true }, SEDM: { lugares: 5, malas: 3, cambio: "Automático", ar: true },
    SUV: { lugares: 5, malas: 2, cambio: "Automático", ar: true }, SUVG: { lugares: 5, malas: 3, cambio: "Automático", ar: true },
    PIC: { lugares: 5, malas: 4, cambio: "Automático", ar: true }, MIN: { lugares: 7, malas: 2, cambio: "Automático", ar: true },
    ELE: { lugares: 5, malas: 2, cambio: "Automático", ar: true }, LUX: { lugares: 5, malas: 3, cambio: "Automático", ar: true },
    MOT1: { lugares: 2, malas: 0, cambio: "Manual", ar: false }, SCO: { lugares: 2, malas: 0, cambio: "Automático", ar: false },
    MOT2: { lugares: 2, malas: 0, cambio: "Manual", ar: false }, MOTL: { lugares: 2, malas: 0, cambio: "Manual", ar: false }
  };
  var COPIAS = { ECO: 3, COM: 2, SED: 2, SEDM: 2, SUV: 2, SUVG: 2, PIC: 1, MIN: 2, ELE: 2, LUX: 1, MOT1: 2, SCO: 2, MOT2: 1, MOTL: 1 };
  var tipoDe = {}; grupos.forEach(function (g) { tipoDe[g.id] = g.tipo; });
  var cores = ["Branco", "Prata", "Preto", "Cinza", "Azul", "Vermelho"];
  var letras = "ABCDEFGHJKLMNPRSTUVWXYZ";
  var veiculos = [];
  var vid = 0;
  function unidade(lj, g, mod) {
    vid++;
    var sp = specs[g], o = mod[2] || {}, cambio = o.c || sp.cambio, tipo = tipoDe[g];
    var acess = [];
    if (cambio === "Automático" && tipo === "carro") acess.push("Câmbio automático");
    if ((lj === "SPPAU" && g === "SUV") || (lj === "GIG" && g === "SED") || (lj === "GRU" && g === "COM")) acess.push("Comandos manuais de freio e acelerador", "Pomo giratório no volante");
    if (lj === "SPPAU" && g === "MIN" && mod[1] === "chevrolet-spin") acess.push("Assento giratório", "Rampa para cadeira de rodas");
    var placa = "FC" + letras[vid % letras.length] + (vid % 10) + letras[(vid * 7) % letras.length] + ((vid * 13) % 90 + 10);
    var v = {
      id: "V" + String(vid).padStart(3, "0"), placa: placa, modelo: mod[0], foto: mod[1], grupo: g, tipo: tipo,
      ano: 2023 + (vid % 3), cor: cores[vid % cores.length], lugares: o.l || sp.lugares, malas: o.m != null ? o.m : sp.malas, cambio: cambio, ar: sp.ar,
      cilindrada: o.cc || null, combustivel: o.k || (g === "ELE" ? "Elétrico" : tipo === "moto" ? "Gasolina" : "Flex"), fator: o.f || 1,
      acessibilidade: acess, lojaResponsavel: lj, localAtual: lj, km: 5000 + Math.floor(rnd() * 40000),
      proximaRevisaoKm: 0, ativo: true, criadoEm: iso(day(-210))
    };
    if (o.cnh) v.cnh = o.cnh;
    veiculos.push(v);
  }
  // unidades fixas usadas nas reservas de demonstração
  unidade("SPPAU", "COM", modelos.COM[0]); unidade("GIG", "SUV", modelos.SUV[3]); unidade("GRU", "SUV", modelos.SUV[5]);
  unidade("SPPIN", "SUVG", modelos.SUVG[0]); unidade("GRU", "COM", modelos.COM[1]); unidade("SPPAU", "MIN", modelos.MIN[0]);
  // o resto da frota é distribuído entre as lojas, todos os modelos com pelo menos uma unidade
  var lojaIds = lojas.map(function (l) { return l.id; }), li = 0;
  Object.keys(modelos).forEach(function (g) {
    modelos[g].forEach(function (mod) { for (var c = 0; c < COPIAS[g]; c++) unidade(lojaIds[li++ % lojaIds.length], g, mod); });
  });
  veiculos.forEach(function (v) { v.proximaRevisaoKm = Math.ceil((v.km + 1) / 10000) * 10000; });

  var movimentos = veiculos.map(function (v) {
    return { id: "M" + v.id, veiculoId: v.id, data: iso(day(-210)), de: null, para: v.lojaResponsavel, motivo: "Entrada na frota", autor: "Operador de frota (demo)" };
  });

  var motoristas = [
    { id: "D1", nome: "Marcos Lima", categoria: "D", validade: iso(day(800)), restricoes: [], lojas: ["GRU", "CGH", "SPPAU", "SPPIN"], ativo: true },
    { id: "D2", nome: "Fernanda Rocha", categoria: "B", validade: iso(day(500)), restricoes: [], lojas: ["SPPAU", "SPPIN", "CGH"], ativo: true },
    { id: "D3", nome: "Ricardo Alves", categoria: "AB", validade: iso(day(300)), restricoes: [], lojas: ["GIG", "SDU", "RJBAR"], ativo: true },
    { id: "D4", nome: "Juliana Prado", categoria: "E", validade: iso(day(900)), restricoes: [], lojas: ["BSB"], ativo: true },
    { id: "D5", nome: "Paulo Mendes", categoria: "D", validade: iso(day(400)), restricoes: [], lojas: ["CNF", "BHSAV", "REC", "SSA"], ativo: true }
  ];

  var protecoes = [
    { id: "P1", nome: "Proteção do veículo (exemplo)", diaria: 39, cobertura: "Danos ao veículo locado em colisão, roubo ou furto.", exclusoes: "Pneus, vidros, uso indevido, condutor não autorizado.", participacao: 3000, inclui: [] },
    { id: "P2", nome: "Proteção a terceiros (exemplo)", diaria: 25, cobertura: "Danos materiais e corporais a terceiros até R$ 100.000.", exclusoes: "Danos a ocupantes do veículo locado.", participacao: 0, inclui: [] },
    { id: "P3", nome: "Proteção de vidros e pneus (exemplo)", diaria: 15, cobertura: "Para-brisa, vidros laterais, faróis e pneus.", exclusoes: "Rodas e calotas.", participacao: 300, inclui: [] },
    { id: "P4", nome: "Pacote completo (exemplo)", diaria: 69, cobertura: "Reúne as três proteções acima com participação reduzida.", exclusoes: "Uso indevido e condutor não autorizado.", participacao: 1000, inclui: ["P1", "P2", "P3"] }
  ];

  var acessorios = [
    { id: "A1", nome: "Cadeirinha infantil", diaria: 25, tipos: ["carro"], estoque: {} },
    { id: "A2", nome: "Assento de elevação", diaria: 20, tipos: ["carro"], estoque: {} },
    { id: "A3", nome: "GPS portátil", diaria: 18, tipos: ["carro", "moto"], estoque: {} },
    { id: "A4", nome: "Suporte para bicicleta", diaria: 30, tipos: ["carro"], estoque: {} },
    { id: "A5", nome: "Capacete adicional", diaria: 15, tipos: ["moto"], estoque: {} },
    { id: "A6", nome: "Baú traseiro", diaria: 12, tipos: ["moto"], estoque: {} }
  ];
  acessorios.forEach(function (a, i) { lojas.forEach(function (l, j) { a.estoque[l.id] = 1 + ((i + j) % 4); }); });

  var cupons = [
    { codigo: "BEMVINDO10", descricao: "10% na primeira locação", tipo: "pct", valor: 10, primeiraLocacao: true, grupos: [], inicio: iso(day(-60)), fim: iso(day(120)), limiteUso: 500, usos: 37, ativo: true, responsavel: "Marketing Falls Car (demo)", regulamento: "Válido para clientes sem locação válida concluída. Locação cancelada não conta como locação válida. Não cumulativo com outros cupons." },
    { codigo: "SUV15", descricao: "15% em SUVs", tipo: "pct", valor: 15, primeiraLocacao: false, grupos: ["SUV", "SUVG"], inicio: iso(day(-10)), fim: iso(day(45)), limiteUso: 100, usos: 12, ativo: true, responsavel: "Gestão comercial (demo)", regulamento: "Válido para os grupos SUV compacto e SUV médio, retiradas dentro da vigência. Não cumulativo." },
    { codigo: "MOTO20", descricao: "R$ 20 de desconto em motos", tipo: "valor", valor: 20, primeiraLocacao: false, grupos: ["MOT1", "SCO", "MOT2"], inicio: iso(day(-5)), fim: iso(day(30)), limiteUso: 50, usos: 3, ativo: true, responsavel: "Gestão comercial (demo)", regulamento: "Desconto fixo por reserva de moto. Não cumulativo." }
  ];

  var config = {
    versao: 1, atualizadoEm: iso(day(-30)), responsavel: "Gestor (demo)",
    antecedenciaMin: 120, intervaloHorarioMin: 30, periodoCobrancaHoras: 24, toleranciaDevolucaoMin: 59,
    holdMin: 15, margemPreparacaoMin: 60, velocidadeMediaKmh: 30,
    devolucaoOutraLoja: { habilitada: true, base: 80, porKm: 1.2, mesmaCidadeApenas: false },
    cancelamento: { semMultaAteHoras: 24, multaPct: 10 },
    parcelamento: { habilitado: true, maxParcelas: 6, minParcela: 100, jurosPct: 0 },
    caucao: { adotada: true, modalidade: "Pré-autorização no cartão de crédito (simulada)" },
    motoristaDiaria: 280, taxaAeroportoPct: 10, maxCondutoresAdicionais: 2, pagadorDistinto: false,
    km: { definida: true, modalidades: [{ id: "LIVRE", nome: "Quilometragem livre", ajusteDiaria: 0, franquiaDia: null, excedente: null }, { id: "F150", nome: "Franquia de 150 km por dia", ajusteDiaria: -15, franquiaDia: 150, excedente: 0.9 }] },
    fidelidade: false, loginGoogle: false, newsletter: true, loginMaxTentativas: 5, loginBloqueioMin: 10, codigoValidadeMin: 10, senhaMin: 8,
    matrizCNH: { versao: "demo-2026.11", fonte: "CTB art. 143 — conferir com fonte oficial (RNF41)", carro: ["B", "AB", "C", "D", "E", "AC", "AD", "AE"], moto: ["A", "AB", "AC", "AD", "AE"] }
  };
  var historicoConfig = [{ versao: 1, data: iso(day(-30)), responsavel: "Gestor (demo)", justificativa: "Parâmetros iniciais de demonstração — decisões PM/DP pendentes", snapshot: JSON.stringify(config) }];

  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return "h" + (h >>> 0).toString(36); }

  var clientes = [
    { id: "C1", nome: "Ana Souza", email: "ana@exemplo.com", senhaHash: hash("Senha@123"), docTipo: "CPF", doc: "529.982.247-25", nascimento: "1990-04-12", telefone: "(11) 98888-1111", cnh: { numero: "00000000001", categoria: "B", validade: iso(day(700)), restricoes: [], status: "conferida", analisadoPor: "Atendente (demo)", analisadoEm: iso(day(-40)), metodo: "Conferência manual de imagem — não é verificação oficial" }, marketing: false, newsletter: false, bloqueado: null, criadoEm: iso(day(-120)) },
    { id: "C2", nome: "Bruno Carvalho", email: "bruno@exemplo.com", senhaHash: hash("Senha@123"), docTipo: "CPF", doc: "111.444.777-35", nascimento: "1985-09-30", telefone: "(21) 97777-2222", cnh: null, marketing: true, newsletter: true, bloqueado: null, criadoEm: iso(day(-90)) },
    { id: "C3", nome: "Carla Mendes", email: "carla@exemplo.com", senhaHash: hash("Senha@123"), docTipo: "CPF", doc: "390.533.447-05", nascimento: "1978-01-22", telefone: "(31) 96666-3333", cnh: { numero: "00000000003", categoria: "AB", validade: iso(day(400)), restricoes: ["Exige câmbio automático"], status: "conferida", analisadoPor: "Atendente (demo)", analisadoEm: iso(day(-20)), metodo: "Conferência manual de imagem — não é verificação oficial" }, marketing: false, newsletter: false, bloqueado: null, criadoEm: iso(day(-200)) },
    { id: "C4", nome: "John Miller", email: "john@exemplo.com", senhaHash: hash("Senha@123"), docTipo: "Passaporte", doc: "XK123456", nascimento: "1982-06-05", telefone: "+1 555 0100", cnh: { numero: "INT-0004", categoria: "B", validade: iso(day(200)), restricoes: [], status: "pendente", analisadoPor: null, analisadoEm: null, metodo: null }, marketing: false, newsletter: false, bloqueado: null, criadoEm: iso(day(-15)) }
  ];

  var usuarios = [
    // senha de demonstração combinada com a equipe; aqui só o hash (RNF36)
    { id: "U1", nome: "Bruno Oliveira de Almeida", email: "bruno@fallscar.com.br", senhaHash: "h20gerb", perfil: "gestor", lojas: ["*"], ativo: true },
    { id: "U4", nome: "Vladmir dos Santos Oliveira", email: "vladmir@fallscar.com.br", senhaHash: "h20gerb", perfil: "gestor", lojas: ["*"], ativo: true },
    { id: "U5", nome: "Carlos Eduardo de Moura Pinto (Cadu)", email: "cadu@fallscar.com.br", senhaHash: "h20gerb", perfil: "gestor", lojas: ["*"], ativo: true },
    { id: "U2", nome: "Atendente (demo)", email: "atendente@fallscar.demo", senhaHash: "h20gerb", perfil: "atendente", lojas: ["SPPAU", "SPPIN", "CGH", "GRU"], ativo: true },
    { id: "U3", nome: "Operador de frota (demo)", email: "frota@fallscar.demo", senhaHash: "h20gerb", perfil: "frota", lojas: ["SPPAU", "SPPIN", "CGH", "GRU"], ativo: true }
  ];

  // Histórico de locações para relatórios (encerradas) + algumas futuras
  var reservas = [];
  var agenda = [];
  var canais = ["site", "site", "site", "telefone", "loja"];
  var rc = 0;
  function codigo() { rc++; var s = ""; var c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; for (var i = 0; i < 6; i++) s += c[Math.floor(rnd() * c.length)]; return "FC-" + s; }
  // Cada veículo (exceto as unidades fixas V001–V006) tem locações seguidas nos últimos ~6 meses; cerca de 75%
  // da frota está alugada agora, para o painel do empresário mostrar números de uma locadora em operação.
  veiculos.slice(6).forEach(function (v) {
  var cursor = day(-178 - Math.floor(rnd() * 5), 9);
  while (true) {
    cursor = addH(cursor, (Math.floor(rnd() * 3)) * 24 + 12);
    var dur = 2 + Math.floor(rnd() * 20);
    var ini = addH(cursor, Math.floor(rnd() * 8)), fim = addH(ini, dur * 24);
    if (ini > now) break;
    var atual = fim > now;
    if (atual && rnd() > 0.82) break; // ~20% da frota fica no pátio
    cursor = fim;
    var diaria = tarifas[0].diarias[v.grupo];
    var cli = pick(["C1", "C2", "C3", "C4", "C1"]);
    var motorista = rnd() < 0.12;
    var total = diaria * dur + (motorista ? config.motoristaDiaria * dur : 0) + (rnd() < 0.5 ? 39 * dur : 0);
    var r = {
      codigo: codigo(), clienteId: cli, canal: pick(canais), veiculoId: v.id, grupo: v.grupo, tipo: v.tipo,
      lojaRetirada: v.lojaResponsavel, lojaDevolucao: v.lojaResponsavel, inicio: iso(ini), fim: iso(fim),
      estado: atual ? "em_andamento" : "encerrada", pagamento: "aprovado", metodo: pick(["credito", "credito", "pix", "debito"]), parcelas: 1,
      preco: { total: Math.round(total), itens: [{ rotulo: "Locação", valor: diaria * dur }] }, tarifaVersao: 1, configVersao: 1,
      motorista: motorista ? "D1" : null, condutores: [], protecoes: [], acessorios: [], km: "LIVRE",
      criadoEm: iso(addH(ini, -72)), eventos: [{ data: iso(addH(ini, -72)), autor: "sistema", evento: "Reserva confirmada (histórico de demonstração)" }],
      retirada: { operador: "Operador de frota (demo)", data: iso(ini), km: 10000, combustivel: "Cheio", vistoria: "Sem avarias", aceite: true },
      devolucao: atual ? null : { operador: "Operador de frota (demo)", data: iso(fim), km: 10000 + dur * 180, combustivel: "Cheio", vistoria: "Sem avarias", aceite: true },
      despesas: [], infracoes: [], sinistros: [], avaliacao: !atual && rnd() < 0.5 ? { nota: 3 + Math.floor(rnd() * 3), comentario: "", data: iso(fim) } : null
    };
    reservas.push(r);
    agenda.push({ id: "AG" + reservas.length, veiculoId: v.id, inicio: r.inicio, fim: r.fim, tipo: "locacao", ref: r.codigo });
    if (atual) break;
  }
  });

  // Reservas atuais da cliente Ana (para área do cliente)
  function addReserva(o) {
    var r = Object.assign({ codigo: codigo(), canal: "site", protecoes: [], acessorios: [], condutores: [], motorista: null, km: "LIVRE", tarifaVersao: 1, configVersao: 1, despesas: [], infracoes: [], sinistros: [], avaliacao: null, parcelas: 1, metodo: "credito" }, o);
    reservas.push(r);
    agenda.push({ id: "AG" + reservas.length + "x", veiculoId: r.veiculoId, inicio: r.inicio, fim: r.fim, tipo: r.estado === "em_andamento" ? "locacao" : "reserva", ref: r.codigo });
    return r;
  }
  var vAna = veiculos.filter(function (v) { return v.lojaResponsavel === "SPPAU" && v.grupo === "COM"; })[0];
  var ini1 = day(6, 10), fim1 = day(9, 10);
  addReserva({
    clienteId: "C1", veiculoId: vAna.id, grupo: vAna.grupo, tipo: "carro", lojaRetirada: "SPPAU", lojaDevolucao: "SPPAU", inicio: iso(ini1), fim: iso(fim1),
    estado: "confirmada", pagamento: "aprovado", preco: { total: 3 * 139 + 3 * 39, itens: [{ rotulo: "Locação — 3 diárias × R$ 139,00", valor: 417 }, { rotulo: "Proteção do veículo (exemplo) — 3 × R$ 39,00", valor: 117 }] },
    protecoes: ["P1"], criadoEm: iso(day(-2)), aceite: { versao: "termos-demo-v1", data: iso(day(-2)), autor: "Ana Souza" },
    eventos: [{ data: iso(day(-2)), autor: "Ana Souza", evento: "Reserva criada pelo site" }, { data: iso(day(-2)), autor: "simulador", evento: "Pagamento aprovado (crédito)" }, { data: iso(day(-2)), autor: "sistema", evento: "Reserva confirmada" }]
  });
  var vAnd = veiculos.filter(function (v) { return v.lojaResponsavel === "GIG" && v.grupo === "SUV"; })[0];
  addReserva({
    clienteId: "C3", veiculoId: vAnd.id, grupo: vAnd.grupo, tipo: "carro", lojaRetirada: "GIG", lojaDevolucao: "GIG", inicio: iso(day(-1, 9)), fim: iso(day(2, 9)), canal: "telefone",
    estado: "em_andamento", pagamento: "aprovado", preco: { total: 3 * 209, itens: [{ rotulo: "Locação — 3 diárias × R$ 209,00", valor: 627 }] }, criadoEm: iso(day(-5)),
    retirada: { operador: "Operador de frota (demo)", data: iso(day(-1, 9)), km: 21000, combustivel: "Cheio", vistoria: "Risco leve na porta traseira direita (registrado com foto)", aceite: true },
    eventos: [{ data: iso(day(-5)), autor: "Atendente (demo)", evento: "Reserva assistida por telefone" }, { data: iso(day(-5)), autor: "simulador", evento: "Pagamento aprovado (Pix)" }, { data: iso(day(-1, 9)), autor: "Operador de frota (demo)", evento: "Retirada registrada" }]
  });

  // Manutenção e transferência programadas
  var vMan = veiculos.filter(function (v) { return v.lojaResponsavel === "GRU" && v.grupo === "SUV"; })[0];
  agenda.push({ id: "AGM1", veiculoId: vMan.id, inicio: iso(day(3, 8)), fim: iso(day(4, 18)), tipo: "manutencao", ref: "MAN-1" });
  var manutencoes = [{ id: "MAN-1", veiculoId: vMan.id, motivo: "Revisão programada por quilometragem", inicio: iso(day(3, 8)), fim: iso(day(4, 18)), status: "programada", responsavel: "Operador de frota (demo)", afetadas: [] }];
  var vTr = veiculos.filter(function (v) { return v.lojaResponsavel === "SPPIN" && v.grupo === "SUVG"; })[0];
  agenda.push({ id: "AGT1", veiculoId: vTr.id, inicio: iso(day(1, 9)), fim: iso(day(1, 11)), tipo: "transferencia", ref: "TR-1" });
  var transferencias = [{ id: "TR-1", veiculoId: vTr.id, origem: "SPPIN", destino: "CGH", responsavel: "Operador de frota (demo)", saidaPrevista: iso(day(1, 9)), chegadaPrevista: iso(day(1, 10)), margemMin: 60, status: "planejada", motivo: "Rebalanceamento de frota", reserva: null, concluidaEm: null }];

  var chamados = [{ protocolo: "SUP-1001", clienteId: "C1", canal: "site", assunto: "Dúvida sobre cadeirinha", status: "respondido", loja: "SPPAU", atendente: "Atendente (demo)", criadoEm: iso(day(-3)), historico: [{ data: iso(day(-3)), autor: "Ana Souza", texto: "Posso incluir cadeirinha depois de reservar?" }, { data: iso(day(-2)), autor: "Atendente (demo)", texto: "Sim, pela área Minhas reservas > Alterar, sujeito à disponibilidade de estoque." }], anexos: [] }];

  // Despesas de demonstração dos últimos 6 meses, por loja e categoria (painel do empresário)
  var despesas = [], PESO = { parcelas: 0.40, manutencao: 0.22, seguro: 0.16, equipe: 0.13, outros: 0.09 };
  for (var mo = 5; mo >= 0; mo--) {
    var dm = new Date(now.getFullYear(), now.getMonth() - mo, 1);
    var mes = dm.getFullYear() + "-" + String(dm.getMonth() + 1).padStart(2, "0");
    lojas.filter(function (l) { return l.ativa; }).forEach(function (l) {
      var frotaLoja = veiculos.filter(function (v) { return v.lojaResponsavel === l.id; }).length;
      var base = frotaLoja * (3900 + rnd() * 400) * (1 + (5 - mo) * 0.015); // custo mensal por veículo, subindo levemente
      Object.keys(PESO).forEach(function (cat) {
        despesas.push({ id: "D-" + mes + "-" + l.id + "-" + cat, mes: mes, loja: l.id, categoria: cat, valor: Math.round(base * PESO[cat] * (0.9 + rnd() * 0.2)) });
      });
    });
  }

  // Cobranças (planos semanais e despesas a receber): algumas vencem hoje, duas estão atrasadas
  var cobrancas = [
    { id: "COB-1", clienteId: "C1", reservaCodigo: null, descricao: "Plano motorista de app · 2ª semana", valor: 640, vencimento: iso(day(0, 9)), pagoEm: iso(day(0, 9, 12)), metodo: "pix" },
    { id: "COB-2", clienteId: "C2", reservaCodigo: null, descricao: "Plano motorista de app · 3ª semana", valor: 420, vencimento: iso(day(0, 12)), pagoEm: null, metodo: "credito" },
    { id: "COB-3", clienteId: "C3", reservaCodigo: null, descricao: "Plano mensal · 2ª semana", valor: 2220, vencimento: iso(day(0, 18)), pagoEm: null, metodo: "pix" },
    { id: "COB-4", clienteId: "C4", reservaCodigo: null, descricao: "Plano motorista de app · 4ª semana", valor: 780, vencimento: iso(day(-2, 9)), pagoEm: null, metodo: "pix" },
    { id: "COB-5", clienteId: "C2", reservaCodigo: null, descricao: "Despesa adicional · combustível", valor: 370, vencimento: iso(day(-1, 9)), pagoEm: null, metodo: "pix" },
    { id: "COB-6", clienteId: "C1", reservaCodigo: null, descricao: "Plano motorista de app · 1ª semana", valor: 640, vencimento: iso(day(-7, 9)), pagoEm: iso(day(-7, 9, 30)), metodo: "pix" }
  ];

  // Um veículo voltou e espera vistoria antes de ser liberado
  var ocupadoAgora = function (v) { return agenda.some(function (a) { return a.veiculoId === v.id && new Date(a.inicio) <= now && new Date(a.fim) >= now; }); };
  var livres = veiculos.slice(6).filter(function (v) { return v.ativo && !ocupadoAgora(v); });
  var vVist = livres.filter(function (v) { return v.lojaResponsavel === "GRU" && v.tipo === "moto"; })[0] || livres[0];
  vVist.aguardandoVistoria = true;
  livres.filter(function (v) { return v !== vVist; }).slice(0, 3).forEach(function (v, i) {
    var id = "MAN-" + (manutencoes.length + 1), ini = day(-1 - i, 8), fim = day(1 + i, 18);
    manutencoes.push({ id: id, veiculoId: v.id, motivo: ["Revisão de 40 mil km", "Troca de pastilhas e discos", "Funilaria — para-choque"][i], inicio: iso(ini), fim: iso(fim), status: "em andamento", responsavel: "Operador de frota (demo)", afetadas: [] });
    agenda.push({ id: "AG" + id, veiculoId: v.id, inicio: iso(ini), fim: iso(fim), tipo: "manutencao", ref: id });
  });

  return {
    seedVersion: FC.SEED_VERSION, criadoEm: iso(now), despesas: despesas, cobrancas: cobrancas,
    lojas: lojas, grupos: grupos, tarifas: tarifas, veiculos: veiculos, movimentos: movimentos, motoristas: motoristas,
    protecoes: protecoes, acessorios: acessorios, cupons: cupons, config: config, historicoConfig: historicoConfig,
    clientes: clientes, usuarios: usuarios, reservas: reservas, agenda: agenda, manutencoes: manutencoes, transferencias: transferencias,
    chamados: chamados, saida: [], auditoria: [{ data: iso(now), autor: "sistema", acao: "Base de demonstração criada", objeto: "sistema", motivo: "Inicialização", resultado: "ok" }],
    lgpd: [], newsletter: [], reservasAcessorios: [], atendimentos: [], termosVersao: "termos-demo-v1",
    sessao: { clienteId: null, adminId: null, tentativas: {}, recuperacao: null }, rascunho: null, cookies: null
  };
};

