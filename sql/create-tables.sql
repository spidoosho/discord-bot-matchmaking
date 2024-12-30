CREATE TABLE Maps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE GuildIds (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE
);

CREATE TABLE Players (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    rating INT,
    games_won INT,
    games_lost INT,
    matches_created INT
);

CREATE TABLE MapsPreferences (
    id_player TEXT,
    id_map INTEGER,
    value REAL,
    PRIMARY KEY (id_player, id_map),
    FOREIGN KEY (id_player) REFERENCES Players (id),
    FOREIGN KEY (id_map) REFERENCES Maps (id)
);