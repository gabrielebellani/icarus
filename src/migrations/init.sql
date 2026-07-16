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
    latitude varchar(255) NULL,
    longitude varchar(255) NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
    UNIQUE (user_id, iata_code, icao_code)
);

CREATE TABLE IF NOT EXISTS radars (
    id VARCHAR(36) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NULL,
    coordinates JSON NOT NULL,
    radius INTEGER NOT NULL,
    expiration DATETIME NULL,
    refresh_interval INTEGER NOT NULL,
    inactivity_timeout INTEGER NULL,
    created_at DATETIME NOT NULL,
    timeout_at DATETIME NULL,
    expired_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cached_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    callsign VARCHAR(16) UNIQUE,
    origin_icao VARCHAR(16),
    origin_iata VARCHAR(16),
    destination_icao VARCHAR(16),
    destination_iata VARCHAR(16),
    airline VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS cached_icao24 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    icao24 VARCHAR(16),
    data JSON NULL
);

DELETE FROM cached_icao24
WHERE id NOT IN (
    SELECT MAX(id)
    FROM cached_icao24
    GROUP BY icao24
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cached_icao24_icao24_unique
ON cached_icao24 (icao24);
