-- Placar do Nível 13 (Cloudflare D1 / SQLite)
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  uf TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT 'coelho',
  ref TEXT,
  created INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  corrente INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS players_corrente ON players (corrente DESC);

-- chave = HMAC do id do aparelho: dá para contar uma vez por aparelho sem ligar a escolha ao apelido
CREATE TABLE IF NOT EXISTS movimento (
  k TEXT PRIMARY KEY,
  uf TEXT NOT NULL DEFAULT '',
  escolha TEXT NOT NULL,
  updated INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS likes (
  id TEXT NOT NULL,
  fact TEXT NOT NULL,
  PRIMARY KEY (id, fact)
);

CREATE TABLE IF NOT EXISTS daily (
  id TEXT NOT NULL,
  date TEXT NOT NULL,
  score INTEGER NOT NULL,
  PRIMARY KEY (id, date)
);

CREATE TABLE IF NOT EXISTS rate (
  k TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  day TEXT NOT NULL
);
