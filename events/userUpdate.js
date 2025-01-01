const { Events } = require('discord.js');

const db = require('../src/sqliteDatabase.js');
const { PlayerData } = require('../src/gameControllers.js');

/**
 * Emitted user profile is edited.
 * Check for username change and update in database.
 */
module.exports = {
	name: Events.UserUpdate,
	/**
	 * Handles the emitted event.
	 * @param {any[]} args arguments passed from the event
	 * @param {Client} client Discord client
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<void>}
	 */
	async execute(args, client, sqlClient, matchmakingManager) {
		const [oldUser, newUser] = args;

		if (oldUser.username === newUser.username) return;

		const clientGuilds = client.guilds.cache;
		for (const guild of clientGuilds.values()) {
			if (!guild.members.cache.has(newUser.id)) continue;

			const player = new PlayerData(newUser.id, newUser.username);
			await db.updatePlayersData(sqlClient, guild.id, [player]);
		}
	},
};