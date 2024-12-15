const { Events } = require('discord.js');
const {	dropDatabaseByName } = require('../src/sqliteDatabase.js');

/**
 * Emitted whenever this discord bot leaves a Discord server.
 * Deletes tables associated with this guild.
 */
module.exports = {
	name: Events.GuildDelete,
	async execute(args) {
		const [guild] = args.args;

		await dropDatabaseByName(args.sqlClient, guild.id);
	},
};