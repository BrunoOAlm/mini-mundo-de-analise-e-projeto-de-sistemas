const test = require("node:test");
const assert = require("node:assert/strict");
const { carregar } = require("./carregar");

const FC = carregar(["dados.js"]);
const db = FC.buildSeed();
const ADMINS = ["bruno@fallscar.com.br", "vladmir@fallscar.com.br", "cadu@fallscar.com.br"];
const hojeISO = (d) => { const x = new Date(d); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };

test("semente na versão 5", () => {
  assert.equal(FC.SEED_VERSION, 5);
});

test("três administradores gestores com acesso a todas as lojas e senha só em hash", () => {
  for (const email of ADMINS) {
    const u = db.usuarios.find((x) => x.email === email);
    assert.ok(u, "falta " + email);
    assert.equal(u.perfil, "gestor");
    assert.deepEqual(Array.from(u.lojas), ["*"]);
    assert.equal(u.senhaHash, "h20gerb");
    assert.equal(u.ativo, true);
  }
  const nomes = db.usuarios.map((u) => u.nome);
  assert.ok(nomes.includes("Bruno Oliveira de Almeida"));
  assert.ok(nomes.includes("Vladmir dos Santos Oliveira"));
  assert.ok(nomes.includes("Carlos Eduardo de Moura Pinto (Cadu)"));
});

test("atendente e operador de frota de demonstração continuam, com e-mail e senha; sem 'Gestor (demo)'", () => {
  for (const perfil of ["atendente", "frota"]) {
    const u = db.usuarios.find((x) => x.perfil === perfil);
    assert.ok(u && u.email, "falta " + perfil);
    assert.equal(u.senhaHash, "h20gerb");
  }
  assert.ok(!db.usuarios.some((u) => u.nome === "Gestor (demo)"));
});

test("despesas cobrem 6 meses e as 5 categorias", () => {
  assert.equal(new Set(db.despesas.map((d) => d.mes)).size, 6);
  assert.deepEqual(new Set(db.despesas.map((d) => d.categoria)), new Set(["parcelas", "manutencao", "seguro", "equipe", "outros"]));
  assert.ok(db.despesas.every((d) => d.valor > 0 && d.loja));
});

test("cobranças: alguma vence hoje e alguma está vencida sem pagamento", () => {
  const hoje = hojeISO(new Date());
  assert.ok(db.cobrancas.some((c) => hojeISO(c.vencimento) === hoje));
  assert.ok(db.cobrancas.some((c) => hojeISO(c.vencimento) < hoje && !c.pagoEm));
});

test("algum veículo aguardando vistoria", () => {
  assert.ok(db.veiculos.some((v) => v.aguardandoVistoria === true));
});
