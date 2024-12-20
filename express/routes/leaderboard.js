const { getClient, getLeaderboardFromDB } = require('./../src/database.js');
const { Router } = require('express');

require('dotenv').config();
const router = Router();
const dbclient = getClient();

/**
 * Sends a JSON response with an array of players' data sorted in descending rating order
 */
router.get('/:id', async function(req, res) {
	const leaderboard = await getLeaderboardFromDB(dbclient, req.params.id);
	res.render('index', { leaderboard });
});

/**
 * Sends a JSON response with an array of players' data sorted in descending rating order
 */
router.get('/:id/json', async function(req, res) {
	const leaderboard = await getLeaderboardFromDB(dbclient, req.params.id);
	res.json(leaderboard);
});

/**
 * Sends a JSON response with a string of a leaderboard
 */
router.get('/:id/text', async function(req, res) {
	const leaderboard = await getLeaderboardFromDB(dbclient, req.params.id);

	if (leaderboard === null) {
		res.json('Leaderboard not found');
		return;
	}

	if (leaderboard.length === 0) {
		res.json('Leadeboard is empty');
		return;
	}

	let result = `1. ${leaderboard[0].displayName.S} - ${leaderboard[0].elo.N} (${leaderboard[0].gamesWon.N}:${leaderboard[0].gamesLost.N})`;

	for (let i = 1; i < Math.min(leaderboard.length, 6); i++) {
		result += `, ${i + 1}. ${leaderboard[i].displayName.S} - ${leaderboard[i].elo.N} (${leaderboard[i].gamesWon.N}:${leaderboard[i].gamesLost.N})`;
	}

	res.json(result);
});

module.exports = router;
