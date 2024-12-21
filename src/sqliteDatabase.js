const fs = require('fs');
const { PlayerData } = require('./gameControllers.js');
const { START_ELO } = require('./constants.js');

/**
 * Create database and needed tables for the server
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} serverId serverId
 */
async function createDatabaseForServer(dbClient, serverId) {
	const command = `CREATE DATABASE ${serverId}; USE DATABASE ${serverId}; ${fs.readFileSync('./sql/create-tables.sql', 'utf8')}`;
	await dbClient.sql(command);
}

/**
 * Get roles from the database
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} serverId serverId
 * @returns {Promise<Object<string, string>>} roles in database. key:roleName, value:roleId
 */
async function getDatabaseRoles(dbClient, serverId) {
	const command = `USE DATABASE ${serverId}; SELECT * FROM Roles;`;

	const roles = await dbClient.sql(command);
	const result = {};

	for (const role of roles) {
		result[role.name] = role.id;
	}

	return result;
}

/**
 * Update or add roles to the database based on newly assigned roles
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} serverId serverId
 * @param {Object<string, string>} oldRoles roles in database. key:roleName, value:roleId
 * @param {Object<string, string>} newRoles roles in Discord. key:roleName, value:roleId
 */
async function addOrUpdateRoles(dbClient, serverId, oldRoles, newRoles) {
	let sql = `USE DATABASE ${serverId};`;
	for (const newRoleName of Object.keys(newRoles)) {
		if (newRoleName in oldRoles) {
			// new role id and old role id is equal => no action needed
			if (newRoles[newRoleName] === oldRoles[newRoleName]) continue;

			// update role id
			sql += `UPDATE Roles SET id='${newRoles[newRoleName]}' WHERE name='${newRoleName}';`;
		}
		else {
			// add new role
			sql += `INSERT INTO Roles (id, name) VALUES ('${newRoles[newRoleName]}', '${newRoleName}');`;
		}
	}

	await dbClient.sql(sql);
}

/**
 * Get database names in the cloud.
 * @param {Database} dbClient Sqlitecloud client
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
 * Drop database and tables of the server
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} serverId serverId
 */
async function dropDatabaseByName(dbClient, serverId) {
	const databases = await getDatabases(dbClient);

	if (!databases.has(serverId)) return;

	await dbClient.sql`DISABLE DATABASE ${serverId}; REMOVE DATABASE ${serverId}`;

	return;
}

/**
 * Returns players' data, sorted by rating descending. If player ID array is not defined, all players are returned.
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} serverId serverId
 * @return {Promise<PlayerData[]>} players' data
 */
async function getPlayerData(dbClient, serverId, playerIdArr = undefined) {
	const result = [];
	let wherePlayerClause = '';

	if (playerIdArr !== undefined) {
		if (playerIdArr.length == 0) return;

		wherePlayerClause = `WHERE id IN ('${playerIdArr.join('\',\'')}')`;
	}

	const sql = `USE DATABASE '${serverId}'; SELECT * FROM Players ${wherePlayerClause} ORDER BY rating DESC;`;
	const query = await dbClient.sql(sql);

	for (const player of query) {
		result.push(new PlayerData(player.id, player.username, player.games_lost, player.games_won, player.rating));
	}

	return result;
}

/**
 * Update players data to database.
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} serverId serverId
 * @param {PlayerData[]} playerDataArr array of PlayerData with updated values
 */
async function updatePlayersData(dbClient, serverId, playerDataArr) {
	if (playerDataArr === undefined || playerDataArr.length === 0) return;

	let sql = `USE DATABASE ${serverId};`;

	for (const player of playerDataArr) {
		sql += `UPDATE Players SET rating=${player.rating}, games_won=${player.gamesWon}, games_lost=${player.gamesLost} WHERE id = ${player.id};`;
	}

	await dbClient.sql(sql);
}

/**
 * Add new player to the database
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} serverId server id
 * @param {PlayerData} playerData new player's data
 */
async function addPlayer(dbClient, serverId, playerData) {
	const sql = `USE DATABASE ${serverId}; INSERT INTO Players (id, username, rating, games_won, games_lost) VALUES ('${playerData.id}', '${playerData.username}', ${playerData.rating}, ${playerData.gamesWon}, ${playerData.gamesLost});`;
	console.log(sql);
	await dbClient.sql(sql);
}

/**
 * Adds new map to the database
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} guildId guild ID
 * @param {string} newMapName map to be added
 */
async function addMap(dbClient, serverId, newMapName) {
	const query = `USE DATABASE ${serverId}; INSERT INTO Maps (name) VALUES ('${newMapName}')`;
	await dbClient.sql(query);
}

/**
 * Removes a map to the database
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} guildId guild ID
 * @param {string} mapId map ID
 */
async function removeMap(dbClient, serverId, mapId) {
	const query = `USE DATABASE ${serverId}; DELETE FROM MapsPreferences WHERE id_map = ${mapId}; DELETE FROM Maps WHERE id = ${mapId};`;
	await dbClient.sql(query);
}

/**
 * Gets indexed maps from database.
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} serverId serverId
 * @returns {Promise<Object<string, {index:number, name:string}>>} key:mapId, value:Dictionary(index:number, name:string)
 */
async function getMapsDictByIdWithIndices(dbClient, serverId) {
	const result = {};
	const maps = await dbClient.sql`USE DATABASE ${serverId}; SELECT * FROM Maps`;

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
	const query = `USE DATABASE ${serverId}; UPDATE MapsPreferences SET value = ${value} WHERE id_player='${playerId}' AND id_map=${mapId}`;
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
	const query = `USE DATABASE ${serverId}; INSERT INTO MapsPreferences (id_player, id_map, value) VALUES (${playerId}, ${mapId}, ${value});`;
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
		// create new Dictionary instead of PlayerData to add index key
		playerSwitch[playerDataArr[i].id] = {
			index: i,
			id: playerDataArr[i].id,
			username: playerDataArr[i].username,
			rating: playerDataArr[i].rating,
			gamesWon: playerDataArr[i].gamesWon,
			gamesLost: playerDataArr[i].gamesLost,
		};
		playerIdArr.push(playerDataArr[i].id);
	}

	const output = await dbClient.sql(`USE DATABASE ${serverId}; SELECT * FROM MapsPreferences WHERE id_player IN(${playerIdArr.join(',')}) ORDER BY id_player ASC;`);

	const mapSwitch = await getMapsDictByIdWithIndices(dbClient, serverId);

	// rows => user, cols => maps
	const mapsPreferencesMatrix = [];
	for (let i = 0; i < playerIdArr.length; i++) {
		// unfilled map preference is set to 0
		mapsPreferencesMatrix.push(getFilledArr(Object.keys(mapSwitch).length, 0));
	}

	for (const entry of output) {
		const playerIndex = playerSwitch[entry.id_player].index;
		const mapIndex = mapSwitch[entry.id_map].index;
		mapsPreferencesMatrix[playerIndex][mapIndex] = entry.value;
	}

	return { maps: mapSwitch, players: playerSwitch, matrix: mapsPreferencesMatrix };
}

/**
 * Reset counters in Players table
 * @param {Database} dbClient Sqlitecloud client
 * @param {string} guildId guild ID
 */
async function resetLeaderboard(dbClient, guildId) {
	const query = `USE DATABASE ${guildId}; UPDATE Players SET rating=${START_ELO}, games_won=0, games_lost=0;`;

	await dbClient.sql(query);
}

async function removePlayerFromDatabase(guildId, dbClient, memberId) {
	const query = `USE DATABASE ${guildId}; DELETE FROM MapsPreferences WHERE id_player = ${memberId}; DELETE FROM Players WHERE id = ${memberId}`;

	await dbClient.sql(query);
}

module.exports = { getDatabases, removePlayerFromDatabase, getDatabaseRoles, resetLeaderboard, addMap, removeMap, addPlayerMapPreference, addOrUpdateRoles, getMapsDictByIdWithIndices, createDatabaseForServer, dropDatabaseByName, getPlayerData, updatePlayersData, addPlayer, updatePlayerMapPreference, getMapsPreferencesData };