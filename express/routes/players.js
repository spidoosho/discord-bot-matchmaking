const { getClient, getLeaderboardFromDB } = require('./../src/database.js');
const express = require('express');
require('dotenv').config();

const router = express.Router();
const dbclient = getClient();

/**
 * Sends a JSON response of a player retrieved from the database
 */
router.get('/player/:server/:username', async function(req, res) {
	const player = await getPlayerDataFromDb(dbclient, req.params.server, req.params.username);
	res.json(player);
});

/**
 * Sends a JSON response with a string of a player
 */
router.get('/player/:server/:username/text', async function(req, res) {
	const player = await getPlayerDataFromDb(dbclient, req.params.server, req.params.username);
	const playerStr = `${player.displayName.S} - ${player.elo.N} (${player.gamesWon.N}: ${player.gamesLost.N})`;
	res.json(playerStr);
});

/**
 * Retrieves player data based on player name
 * @param {DynamoDBClient} dbclient DynamoDB client
 * @param {string} name player display name
 * @returns {Promise<Object.<string, string>} player data
 */
async function getPlayerDataFromDb(dbclient, server, name) {
	const leaderboard = await getLeaderboardFromDB(dbclient, server);
	return leaderboard.find((player) => player.displayName.S === name);
}

module.exports = router;
