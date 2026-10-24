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

-- ===== Chuta Aí! (docs/VIRAL-DESIGN.md §5.3) =====
-- nota por aparelho e dia (id aleatório do aparelho, como em `daily`)
CREATE TABLE IF NOT EXISTS chute (
  id TEXT NOT NULL,
  date TEXT NOT NULL,
  s TEXT NOT NULL,
  total INTEGER NOT NULL,
  via TEXT,
  PRIMARY KEY (id, date)
);
CREATE INDEX IF NOT EXISTS chute_date_total ON chute (date, total);

-- "Brasil chutou": só contagem por faixa, sem id
CREATE TABLE IF NOT EXISTS chute_hist (
  date TEXT NOT NULL,
  round INTEGER NOT NULL,
  bucket INTEGER NOT NULL,
  n INTEGER NOT NULL,
  PRIMARY KEY (date, round, bucket)
);

CREATE TABLE IF NOT EXISTS duelo (
  code TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  date TEXT NOT NULL,
  s TEXT NOT NULL,
  total INTEGER NOT NULL,
  created INTEGER NOT NULL,
  accepts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS duelo_owner ON duelo (owner);

CREATE TABLE IF NOT EXISTS duelo_resp (
  code TEXT NOT NULL,
  id TEXT NOT NULL,
  s TEXT NOT NULL,
  total INTEGER NOT NULL,
  PRIMARY KEY (code, id)
);

-- nome gerado (bicho + 2 dígitos), nunca texto livre
CREATE TABLE IF NOT EXISTS grupo (
  code TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS grupo_membro (
  code TEXT NOT NULL,
  id TEXT NOT NULL,
  joined INTEGER NOT NULL,
  PRIMARY KEY (code, id)
);
CREATE INDEX IF NOT EXISTS grupo_membro_id ON grupo_membro (id);

-- contadores de eventos, sem id (§5.5)
CREATE TABLE IF NOT EXISTS ev (
  day TEXT NOT NULL,
  e TEXT NOT NULL,
  k TEXT NOT NULL DEFAULT '',
  n INTEGER NOT NULL,
  PRIMARY KEY (day, e, k)
);
