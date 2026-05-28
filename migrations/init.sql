CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NULL,
    password VARCHAR(255) NOT NULL,
    password_reset_token TEXT,
    password_reset_token_expires_at INTEGER
);

CREATE TABLE IF NOT EXISTS preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    key VARCHAR(255) NOT NULL,
    value TEXT,
    UNIQUE(user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tracked_flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    iata_code VARCHAR(16) NULL,
    icao_code VARCHAR(16) NULL,
    reference_date TEXT NOT NULL,
    payload NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
    UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS tracked_airports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    iata_code VARCHAR(16) NULL,
    icao_code VARCHAR(16) NULL,
    name VARCHAR(255) NULL,
    city VARCHAR(255) NULL,
    direction VARCHAR(16) NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
    UNIQUE (user_id, iata_code, icao_code, direction)
);
