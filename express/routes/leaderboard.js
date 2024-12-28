const { Router } = require('express');
const sqlDb = require('./../../src/sqliteDatabase.js');
const { Database } = require('@sqlitecloud/drivers');
const { getText, getPlayerDataFromDatabase } = require('../src/utils.js');
const path = require('path');

require('dotenv').config();
const router = Router();
const dbclient = new Database(`${process.env.SQLITECLOUD_CONNECTION_STRING}?apikey=${process.env.SQLITECLOUD_API_KEY}`);

/**
 * Sends static website with usage.
 */
router.get('/', async function(req, res) {
	res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

/**
 * Renders a leaderboard based on server ID.
 */
router.get('/:serverId', async function(req, res) {
	const result = await getPlayerDataFromDatabase(dbclient, req.params.serverId);

	res.render('leaderboard', result);
});

/**
 * Sends a JSON response with an array of player data sorted in descending rating order and leaderboard ID.
 */
router.get('/:serverId/json', async function(req, res) {
	const result = await getPlayerDataFromDatabase(dbclient, req.params.serverId);

	res.json(result);
});

/**
 * Sends a text message about the leaderboard.
 */
router.get('/:serverId/text', async function(req, res) {
	const result = await getPlayerDataFromDatabase(dbclient, req.params.serverId);

	if (result.leaderboard === undefined) {
		res.json('Leaderboard was not found.');
		return;
	}

	if (result.playerDataArr.length === 0) {
		res.json('Leadeboard is empty.');
		return;
	}

	res.json(getText(result.playerDataArr));
});

/**
 * Renders a player data.
 */
router.get('/:serverId/:playerId', async function(req, res) {
	const result = await getPlayerDataFromDatabase(dbclient, req.params.serverId, [req.params.playerId]);

	if (result.leaderboard === undefined || result.playerDataArr === undefined) {
		res.render('player', result);
		return;
	}

	const [playerData] = result.playerDataArr;

	res.render('player', { playerData, leaderboard: result.leaderboard });
});

/**
 * Sends a JSON response with an player data and leadeboard ID.
 */
router.get('/:serverId/:playerId/json', async function(req, res) {
	const result = await getPlayerDataFromDatabase(dbclient, req.params.serverId, [req.params.playerId]);

	if (result.leaderboard === undefined || result.playerDataArr === undefined) {
		res.json(result);
		return;
	}

	const [playerData] = result.playerDataArr;

	res.json({ playerData, leaderboard: result.leaderboard });
});

/**
 * Sends a text message with player data.
 */
router.get('/:serverId/:playerId/text', async function(req, res) {
	const result = await getPlayerDataFromDatabase(dbclient, req.params.serverId, [req.params.playerId]);

	if (result.leaderboard === undefined || result.playerDataArr === undefined) {
		res.json(result);
		return;
	}

	if (result.leaderboard === undefined) {
		res.json('Server was not found.');
		return;
	}

	if (result.playerDataArr.length === 0) {
		res.json('Player was not found.');
		return;
	}

	const [playerData] = result.playerDataArr;
	res.json(getText(playerData));
});

module.exports = router;
