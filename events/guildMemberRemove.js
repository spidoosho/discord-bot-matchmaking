const { Events } = require('discord.js');

const db = require('../src/sqliteDatabase.js');

/**
 * Emitted whenever a member leaves of is kicked from a Discord server.
 * Remove items with member id in the database.
 */
module.exports = {
	name: Events.GuildMemberRemove,
	/**
	 * Handles the emitted event.
	 * @param {any[]} args arguments passed from the event
	 * @param {Client} client Discord client
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<void>}
	 */
	async execute(args, client, sqlClient, matchmakingManager) {
		const [member] = args;

		await db.removePlayerFromDatabase(member.guild.id, sqlClient, member.id);
	},
};