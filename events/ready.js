const { Events } = require('discord.js');

const {	checkForGuildTables } = require('../src/database.js');
const { startExpress } = require('../express/express.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(dbclient, cache) {
		await checkForGuildTables(dbclient, cache);
		startExpress();
	},
};
