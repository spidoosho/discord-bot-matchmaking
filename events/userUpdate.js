const { Events } = require('discord.js');

const db = require('../src/sqliteDatabase.js');
const { PlayerData } = require('../src/gameControllers.js');

/**
 * Emitted user profile is edited.
 * Check for username change and update in database.
 */
module.exports = {
	name: Events.UserUpdate,
	async execute(args) {
		const [oldUser, newUser] = args.args;

		if (oldUser.username === newUser.username) return;

		const clientGuilds = args.dcClient.guilds.cache;
		for (const guild of clientGuilds.values()) {
			if (!guild.members.cache.has(newUser.id)) continue;

			const player = new PlayerData(newUser.id, newUser.username);
			await db.updatePlayersData(args.sqlClient, guild.id, [player]);
		}
	},
};