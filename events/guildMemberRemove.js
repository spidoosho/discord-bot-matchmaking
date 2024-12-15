const { Events } = require('discord.js');

const db = require('../src/sqliteDatabase.js');

/**
 * Emitted whenever a member leaves of is kicked from a Discord server.
 * Remove items with member id in the database.
 */
module.exports = {
	name: Events.GuildMemberRemove,
	async execute(args) {
		const [member] = args.args;

		await db.removePlayerFromDatabase(member.guild.id, args.sqlClient, member.id);
	},
};