-- Falls Car — banco do site do cliente (D1 / SQLite). Datas em ISO 8601 UTC.
CREATE TABLE IF NOT EXISTS clientes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  doc_tipo TEXT NOT NULL,
  doc TEXT NOT NULL UNIQUE,
  telefone TEXT,
  nascimento TEXT,
  cnh_json TEXT,
  senha_hash TEXT NOT NULL,
  criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessoes (
  token_hash TEXT PRIMARY KEY,
  cliente_id TEXT NOT NULL REFERENCES clientes(id),
  expira_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tentativas (
  ident TEXT PRIMARY KEY,
  n INTEGER NOT NULL DEFAULT 0,
  ate INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reservas (
  codigo TEXT PRIMARY KEY,
  cliente_id TEXT NOT NULL REFERENCES clientes(id),
  veiculo_id TEXT NOT NULL,
  motorista_id TEXT,
  loja_retirada TEXT NOT NULL,
  loja_devolucao TEXT NOT NULL,
  inicio TEXT NOT NULL,
  fim TEXT NOT NULL,
  estado TEXT NOT NULL,
  pagamento TEXT NOT NULL,
  metodo TEXT,
  parcelas INTEGER NOT NULL DEFAULT 1,
  preco_json TEXT NOT NULL,
  sel_json TEXT NOT NULL,
  tarifa_versao INTEGER,
  bloqueio_expira TEXT,
  criado_em TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reservas_cliente ON reservas (cliente_id, criado_em);

CREATE TABLE IF NOT EXISTS pagamentos (
  id_evento TEXT PRIMARY KEY,
  reserva_codigo TEXT NOT NULL REFERENCES reservas(codigo),
  metodo TEXT NOT NULL,
  parcelas INTEGER NOT NULL DEFAULT 1,
  valor REAL NOT NULL,
  resultado TEXT NOT NULL,
  criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reserva_codigo TEXT NOT NULL,
  data TEXT NOT NULL,
  autor TEXT NOT NULL,
  texto TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS eventos_reserva ON eventos (reserva_codigo, id);

-- recurso: "V:<veículo>" ou "M:<motorista>"; tipo: bloqueio | reserva; bloqueio vencido (expira_em no passado) não conta
CREATE TABLE IF NOT EXISTS ocupacao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recurso TEXT NOT NULL,
  inicio TEXT NOT NULL,
  fim TEXT NOT NULL,
  tipo TEXT NOT NULL,
  ref TEXT NOT NULL,
  expira_em TEXT
);
CREATE INDEX IF NOT EXISTS ocupacao_recurso ON ocupacao (recurso, inicio, fim);

CREATE TABLE IF NOT EXISTS cupons_uso (
  codigo TEXT NOT NULL,
  reserva_codigo TEXT NOT NULL,
  cliente_id TEXT NOT NULL
);
