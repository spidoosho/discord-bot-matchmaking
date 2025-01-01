const { Events } = require('discord.js');
const {	dropDatabaseByName } = require('../src/sqliteDatabase.js');

/**
 * Emitted whenever this discord bot leaves a Discord server.
 * Deletes tables associated with this guild.
 */
module.exports = {
	name: Events.GuildDelete,
	/**
	 * Handles the emitted event.
	 * @param {any[]} args arguments passed from the event
	 * @param {Client} client Discord client
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<void>}
	 */
	async execute(args, client, sqlClient, matchmakingManager) {
		const [guild] = args;

		args.matchmakingManager.removeGuild(guild.id);

		await dropDatabaseByName(sqlClient, guild.id);
	},
};