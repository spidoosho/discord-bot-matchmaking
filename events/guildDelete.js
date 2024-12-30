const { Events } = require('discord.js');
const {	dropDatabaseByName } = require('../src/sqliteDatabase.js');
const managers = require('../src/gameManagers.js');

/**
 * Emitted whenever this discord bot leaves a Discord server.
 * Deletes tables associated with this guild.
 */
module.exports = {
	name: Events.GuildDelete,
	/**
	 *
	 * @param {{matchmakingManager: managers.MatchmakingManager}} args
	 */
	async execute(args) {
		const [guild] = args.args;

		args.matchmakingManager.removeGuild(guild.id);

		await dropDatabaseByName(args.sqlClient, guild.id);
	},
};