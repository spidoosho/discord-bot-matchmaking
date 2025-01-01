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
    player_id TEXT,
    map_id INTEGER,
    value REAL,
    PRIMARY KEY (player_id, map_id),
    FOREIGN KEY (id_player) REFERENCES Players (id),
    FOREIGN KEY (map_id) REFERENCES Maps (id)
);

CREATE TABLE MapHistory {
    player_id TEXT,
    map_count INTEGER,
    map_id INTEGER
}