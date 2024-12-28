const { Router } = require('express');
const sqlDb = require('./../../src/sqliteDatabase.js');
const { Database } = require('@sqlitecloud/drivers');
const { getText } = require('../src/utils.js');
const path = require('path');

require('dotenv').config();
const router = Router();
const dbclient = new Database(`${process.env.SQLITECLOUD_CONNECTION_STRING}?apikey=${process.env.SQLITECLOUD_API_KEY}`);

/**
 * Sends a JSON response with an array of players' data sorted in descending rating order
 */
router.get('/', async function(req, res) {
	res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

/**
 * Sends a JSON response with an array of players' data sorted in descending rating order
 */
router.get('/:serverId', async function(req, res) {
	const playersData = await sqlDb.getPlayerData(dbclient, req.params.serverId);
	res.render('leaderboard', { playersData });
});

/**
 * Sends a JSON response with an array of players' data sorted in descending rating order
 */
router.get('/:serverId/json', async function(req, res) {
	const playersData = await sqlDb.getPlayerData(dbclient, req.params.serverId);
	res.json(playersData);
});

/**
 * Sends a JSON response with a string of a leaderboard
 */
router.get('/:serverId/text', async function(req, res) {
	const playersData = await sqlDb.getPlayerData(dbclient, req.params.serverId);

	if (playersData === undefined) {
		res.json('Leaderboard not found');
		return;
	}

	if (playersData.length === 0) {
		res.json('Leadeboard is empty');
		return;
	}

	res.json(getText(playersData));
});

/**
 * Sends a JSON response with an array of players' data sorted in descending rating order
 */
router.get('/:serverId/:playerId', async function(req, res) {
	const [playersData] = await sqlDb.getPlayerData(dbclient, req.params.serverId, [req.params.playerId]);

	if (playersData === undefined) {
		res.json('Player not found');
		return;
	}

	res.render('player', { player: playersData[0] });
});

/**
 * Sends a JSON response with an array of players' data sorted in descending rating order
 */
router.get('/:serverId/:playerId/json', async function(req, res) {
	const [playersData] = await sqlDb.getPlayerData(dbclient, req.params.serverId, [req.params.playerId]);

	if (playersData === undefined) {
		res.json('Player not found');
		return;
	}

	res.json(playersData[0]);
});

/**
 * Sends a JSON response with an array of players' data sorted in descending rating order
 */
router.get('/:serverId/:playerId/text', async function(req, res) {
	const [playersData] = await sqlDb.getPlayerData(dbclient, req.params.serverId, [req.params.playerId]);

	if (playersData === undefined) {
		res.json('Player not found');
		return;
	}

	res.json(getText(playersData[0]));
});

module.exports = router;
