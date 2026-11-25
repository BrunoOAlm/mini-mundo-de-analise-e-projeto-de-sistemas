const test = require("node:test");
const assert = require("node:assert/strict");
const { carregar } = require("./carregar");

function novo() {
  const FC = carregar(["dados.js", "nucleo.js"]);
  FC.db.usuarios.forEach((u) => { u.senhaHash = FC.hash("senha-de-teste-1"); });
  return FC;
}
const ERRO = "E-mail ou senha incorretos.";

test("entra com e-mail (sem diferenciar maiúsculas) e senha certos", () => {
  const FC = novo();
  const r = FC.loginAdmin("Bruno@FallsCar.com.br", "senha-de-teste-1");
  assert.equal(r.usuario.nome, "Bruno Oliveira de Almeida");
  assert.equal(FC.db.sessao.adminId, r.usuario.id);
});

test("senha errada não entra", () => {
  const FC = novo();
  assert.equal(FC.loginAdmin("bruno@fallscar.com.br", "errada").erro, ERRO);
  assert.equal(FC.db.sessao.adminId, null);
});

test("5 erros bloqueiam, mesmo com a senha certa depois", () => {
  const FC = novo();
  for (let i = 0; i < 5; i++) FC.loginAdmin("bruno@fallscar.com.br", "errada");
  const r = FC.loginAdmin("bruno@fallscar.com.br", "senha-de-teste-1");
  assert.match(r.erro, /^Muitas tentativas/);
  assert.equal(FC.db.sessao.adminId, null);
});

test("bloqueio vencido libera nova tentativa", () => {
  const FC = novo();
  for (let i = 0; i < 5; i++) FC.loginAdmin("bruno@fallscar.com.br", "errada");
  FC.db.sessao.tentativas["admin:bruno@fallscar.com.br"].ate = Date.now() - 1;
  assert.ok(FC.loginAdmin("bruno@fallscar.com.br", "senha-de-teste-1").usuario);
});

test("usuário inativo recebe o erro de credenciais", () => {
  const FC = novo();
  FC.db.usuarios.find((u) => u.email === "cadu@fallscar.com.br").ativo = false;
  assert.equal(FC.loginAdmin("cadu@fallscar.com.br", "senha-de-teste-1").erro, ERRO);
});
