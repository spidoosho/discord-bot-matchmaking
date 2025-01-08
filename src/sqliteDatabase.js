const fs = require('fs');
const { PlayerData } = require('./gameControllers.js');
const { MAP_HISTORY_LENGTH } = require('./constants.js');
const { convertSnakeCaseToCamelCase, convertCamelCaseToSnakeCase } = require('./utils.js');

/**
 * Create database and needed tables for the server
 * @param {Database} dbClient SQLiteCloud client
 * @param {string} serverId serverId
 */
async function createDatabaseForServer(dbClient, serverId) {
	const command = `CREATE DATABASE '${serverId}';`;
	await dbClient.sql(command);
}

async function createTablesForServer(dbClient, serverId) {
	const command = `USE DATABASE '${serverId}'; ${fs.readFileSync('./sql/create-tables.sql', 'utf8')};`;
	await dbClient.sql(command);
}

/**
 * Get roles from the database
 * @param {Database} dbClient SQLiteCloud client
 * @param {string} serverId serverId
 * @returns {Promise<Object<string, string>>} roles in database. key:roleName, value:roleId
 */
async function getGuildDbIds(dbClient, serverId) {
	const command = `USE DATABASE '${serverId}'; SELECT * FROM GuildIds;`;

	const roles = await dbClient.sql(command);
	const result = {};

	for (const role of roles) {
		const key = convertSnakeCaseToCamelCase(role.name);
		result[key] = role.id;
	}

	return result;
}

/**
 * Update guild IDs in the database.
 * @param {Database} dbClient
 * @param {string} serverId
 * @param {GuildIds} guildIds
 */
async function updateGuildIds(dbClient, serverId, guildIds) {
	let command = `USE DATABASE '${serverId}'; DELETE FROM GuildIds; INSERT INTO GuildIds (name, id) VALUES `;

	for (const [key, value] of Object.entries(guildIds)) {
		if (value === undefined) continue;

		command += `('${convertCamelCaseToSnakeCase(key)}', '${value}'), `;
	}

	await dbClient.sql(command.slice(0, command.length - 2));
}

/**
 * Get database names in the cloud.
 * @param {Database} dbClient SQLiteCloud client
 * @returns {Promise<Set<string>>} database names
 */
async function getDatabases(dbClient) {
	const databases = new Set();
	const result = await dbClient.sql`LIST DATABASES`;

	for (const row of result) {
		databases.add(row.name);
	}

	return databases;
}

/**
 * Drop tables in database
 * @param {Database} dbClient SQLiteCloud client
 * @param {string} serverId serverId
 */
async function dropDatabaseTables(dbClient, serverId) {
	const databases = await getDatabases(dbClient);
	if (!databases.has(serverId)) return;

	const listSql = `USE DATABASE '${serverId}'; LIST TABLES;`;
	const sqlTables = await dbClient.sql(listSql);

	let sql = '';
	for (const table of sqlTables) {
		sql += `DROP TABLE '${table.name}';`;
	}

	await dbClient.sql(sql);
}

/**
 * Returns players' data, sorted by rating descending. If player ID array is not defined, all players are returned.
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} serverId serverId
 * @param {string[]} playerIdArr player IDs
 * @return {Promise<PlayerData[]>} players' data
 */
async function getPlayerData(dbClient, serverId, playerIdArr = undefined) {
	const result = [];
	let wherePlayerClause = '';

	if (playerIdArr !== undefined) {
		if (playerIdArr.length === 0) return [];

		wherePlayerClause = `WHERE id IN ('${playerIdArr.join('\',\'')}')`;
	}

	const sql = `USE DATABASE '${serverId}'; SELECT * FROM Players ${wherePlayerClause} ORDER BY rating DESC;`;
	const query = await dbClient.sql(sql);

	for (const player of query) {
		result.push(new PlayerData(player.id, player.username, player.games_lost, player.games_won, player.rating, player.accumulated_share));
	}

	return result;
}

/**
 * Update players data to database.
 * @param {Database} dbClient SQLiteCloud client
 * @param {string} serverId serverId
 * @param {PlayerData[]} playerDataArr array of PlayerData with updated values
 */
async function updatePlayersData(dbClient, serverId, playerDataArr) {
	if (playerDataArr === undefined || playerDataArr.length === 0) return;

	let sql = `USE DATABASE '${serverId}';`;

	for (const player of playerDataArr) {
		let updates = '';

		for (const key in player) {
			if (key === 'accumulatedShare' && player.mapShare !== undefined) {
				if (player.accumulatedShare === undefined) {
					// initialize accumulated share
					player.accumulatedShare = 0;
				}

				player.accumulatedShare += player.mapShare;
			}
			else if (player[key] === undefined || ['id', 'mapShare'].includes(key)) {
				// skip undefined values
				continue;
			}

			const snakeCaseKey = convertCamelCaseToSnakeCase(key);

			updates += `${snakeCaseKey}='${player[key]}',`;
		}

		if (updates.length === 0) return;

		updates = updates.slice(0, updates.length - 1);
		sql += `UPDATE Players SET ${updates} WHERE id = '${player.id}';`;
	}

	await dbClient.sql(sql);
}

/**
 * Update players' map history.
 * @param {Database} sqlClient SQLiteCloud client
 * @param {string} serverId server ID
 * @param {PlayerData[]} playerDataAfter player data after the match
 * @param {string} mapId map ID
 * @param {number} mapHistoryLength number of matches to keep in the history
 * @return {Promise<void>}
 */
async function updatePlayersMapHistory(sqlClient, serverId, playerDataAfter, mapId, mapHistoryLength) {
	let sql = `USE DATABASE ${serverId};`;
	for (const player of playerDataAfter) {
		const matchCount = player.gamesWon + player.gamesLost;

		if (matchCount < mapHistoryLength) {
			// insert new map history
			sql += `INSERT INTO MapHistory (player_id, map_id, map_count) VALUES ('${player.id}', '${mapId}', '${matchCount}');`;
		}
		else {
			// update map history
			sql += `UPDATE MapHistory SET map_id='${mapId}' WHERE player_id='${player.id}' AND map_count='${matchCount % MAP_HISTORY_LENGTH}';`;
		}
	}
	await sqlClient.sql(sql);
}

/**
 * Add new player to the database
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} serverId server id
 * @param {PlayerData} playerData new player's data
 */
async function addPlayer(dbClient, serverId, playerData) {
	const sql = `USE DATABASE '${serverId}'; INSERT INTO Players (id, username, rating, games_won, games_lost) VALUES ('${playerData.id}', '${playerData.username}', '${playerData.rating}', '${playerData.gamesWon}', '${playerData.gamesLost}');`;
	await dbClient.sql(sql);
}

/**
 * Gets indexed maps from database.
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} serverId serverId
 * @returns {Promise<Object<string, {index:number, name:string}>>} key:mapId, value:Dictionary(index:number, name:string)
 */
async function getMapsDictByIdWithIndices(dbClient, serverId) {
	const result = {};
	const maps = await dbClient.sql`USE DATABASE '${serverId}'; SELECT * FROM Maps`;

	for (let i = 0; i < maps.length; i++) {
		result[maps[i].id] = { index: i, name: maps[i].name, id: maps[i].id };
	}

	return result;
}

/**
 * Update player's single map preference value
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} serverId server ID
 * @param {string} playerId player ID
 * @param {string} mapId map ID
 * @param {number} value map preference value
 */
async function updatePlayerMapPreference(dbClient, serverId, playerId, mapId, value) {
	const query = `USE DATABASE '${serverId}'; INSERT OR REPLACE INTO MapPreferences (player_id, map_id, value) VALUES ('${playerId}', '${mapId}', '${value}');`;
	await dbClient.sql(query);
}

/**
 * Add player's single map preference value
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} serverId server ID
 * @param {string} playerId player ID
 * @param {string} mapId map ID
 * @param {number} value map preference value
 */
async function addPlayerMapPreference(dbClient, serverId, playerId, mapId, value) {
	const query = `USE DATABASE '${serverId}'; INSERT INTO MapPreferences (player_id, map_id, value) VALUES ('${playerId}', '${mapId}', '${value}');`;
	await dbClient.sql(query);
}

/**
 * Get all maps and selected players data and their mapping to the maps preference matrix.
 * Matrix rows are player preferences and cols are individual maps.
 * Unfilled map preference is set to 0.
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} serverId server ID
 * @param {PlayerData[]} playerDataArr players' data
 * @returns {Promise<{maps:Object<string, {index:number, name:string}>, players:Object<string, {index:number, id:string, username:string, rating:number, gamesWon:number, gamesLost:number}>, matrix:number[][]}>}
 */
async function getMapsPreferencesData(dbClient, serverId, playerDataArr) {
	function getFilledArr(len, val) {
		return new Array(len).fill(val);
	}

	if (playerDataArr.length === 0) {
		return undefined;
	}

	const playerIdArr = [];
	const playerSwitch = {};
	for (let i = 0; i < playerDataArr.length; i++) {
		playerDataArr[i].matrixIndex = i;
		playerSwitch[playerDataArr[i].id] = playerDataArr[i];
		playerIdArr.push(playerDataArr[i].id);
	}

	const output = await dbClient.sql(`USE DATABASE '${serverId}'; SELECT * FROM MapPreferences WHERE player_id IN(${playerIdArr.join(',')}) ORDER BY player_id ASC;`);

	const mapSwitch = await getMapsDictByIdWithIndices(dbClient, serverId);

	// rows => user, cols => maps
	const mapsPreferencesMatrix = [];
	for (let i = 0; i < playerIdArr.length; i++) {
		// unfilled map preference is set to 0
		mapsPreferencesMatrix.push(getFilledArr(Object.keys(mapSwitch).length, undefined));
	}

	for (const entry of output) {
		const playerIndex = playerSwitch[entry.player_id].matrixIndex;
		const mapIndex = mapSwitch[entry.map_id].index;
		mapsPreferencesMatrix[playerIndex][mapIndex] = entry.value;
	}

	return { maps: mapSwitch, players: playerSwitch, matrix: mapsPreferencesMatrix };
}

/**
 * Reset counters in Players table
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} guildId guild ID
 * @param {number} initialRating initial rating
 */
async function resetPlayerData(dbClient, guildId, initialRating) {
	const query = `USE DATABASE '${guildId}'; UPDATE Players SET rating='${initialRating}', games_won=0, games_lost=0, accumulated_share=NULL;`;

	await dbClient.sql(query);
}

/**
 * Reset database map data based on the list of maps to keep.
 * @param {Database} dbClient
 * @param {string} guildId
 * @param {string[]} maps
 */
async function resetMapData(dbClient, guildId, maps) {
	let query = `USE DATABASE '${guildId}'; DELETE FROM MapHistory;`;
	const currentMaps = await getMapsDictByIdWithIndices(dbClient, guildId);
	const mapIdsToDelete = [];
	const mapNamesToAdd = [];

	for (const [mapId, map] of Object.entries(currentMaps)) {
		if (!maps.includes(map.name)) {
			// map is not in the list of maps to keep
			mapIdsToDelete.push(mapId);
		}
	}

	for (const map of maps) {
		if (!Object.values(currentMaps).map(m => m.name).includes(map)) {
			// map is not in the current maps
			mapNamesToAdd.push(map);
		}
	}

	if (mapIdsToDelete.length !== 0) {
		query += `DELETE FROM MapPreferences WHERE map_id IN (${mapIdsToDelete.join(',')});`;
		query += `DELETE FROM Maps WHERE id IN (${mapIdsToDelete.join(',')});`;
	}

	if (mapNamesToAdd.length !== 0) {
		query += `INSERT INTO Maps (name) VALUES ${mapNamesToAdd.map(map => `('${map}')`).join(',')};`;
	}

	await dbClient.sql(query);
}

/**
 * Remove player from the database.
 * @param {string} guildId guild ID
 * @param {Database} dbClient SQLiteCloud client
 * @param {string} memberId player ID
 * @return {Promise<void>}
 */
async function removePlayerFromDatabase(guildId, dbClient, memberId) {
	const query = `USE DATABASE '${guildId}'; DELETE FROM MapHistory WHERE player_id='${memberId}'; DELETE FROM MapPreferences WHERE player_id ='${memberId}'; DELETE FROM Players WHERE id ='${memberId}'`;

	await dbClient.sql(query);
}

module.exports = { createTablesForServer, resetMapData, updatePlayersMapHistory, updateGuildIds, getDatabases, removePlayerFromDatabase, getGuildDbIds, resetPlayerData, addPlayerMapPreference, getMapsDictByIdWithIndices, createDatabaseForServer, dropDatabaseTables, getPlayerData, updatePlayersData, addPlayer, updatePlayerMapPreference, getMapsPreferencesData };