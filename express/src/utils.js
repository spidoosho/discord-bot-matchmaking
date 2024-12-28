const { getDatabases, getPlayerData } = require('../../src/sqliteDatabase');

/**
 * Converts PlayerData to string.
 * @param {PlayerData} playerData
 * @returns {string}
 */
function getPlayerText(playerData) {
	if (playerData === undefined) {return undefined;}

	return `${playerData.username} - ${playerData.rating} (${playerData.gamesWon}:${playerData.gamesLost})`;
}

/**
 * Converts array of PlayerData or array of PlayerData to string.
 * @param {PlayerData[]|PlayerData} playerData
 * @returns {string}
 */
function getText(playerDataArr) {
	if (playerDataArr === undefined) {return playerDataArr;}

	if (Array.isArray(playerDataArr)) {
		if (playerDataArr.length === 0) {
			return playerDataArr;
		}

		let result = '';
		for (let i = 0; i < playerDataArr.length; i++) {
			result += `${i + 1}. ${getPlayerText(playerDataArr[i])}. `;
		}
		return result.slice(0, result.length - 2);
	}

	return getPlayerText(playerDataArr);
}

/**
 * Check if database has server ID and then retrieves player data.
 * @param {Database} sqlClient SQLite client
 * @param {string} serverId server ID
 * @param {string[]} playerIdArr array of player IDs
 * @returns {Promise<{leaderboard:string|undefined, playerDataArr: PlayerData[]|undefined}>}
 */
async function getPlayerDataFromDatabase(sqlClient, serverId, playerIdArr = undefined) {
	const databases = await getDatabases(sqlClient);
	let leaderboard = undefined;
	let playerDataArr = undefined;

	if (!databases.has(serverId)) {
		return { leaderboard, playerDataArr };
	}

	leaderboard = serverId;
	playerDataArr = await getPlayerData(sqlClient, serverId, playerIdArr);

	return { leaderboard, playerDataArr };
}

module.exports = { getText, getPlayerDataFromDatabase };