const { Events } = require('discord.js');
const {
	removeGuildTables,
} = require('../src/database.js');

/**
 * Emitted whenever this discord bot leaves a Discord server.
 * Deletes tables associated with this guild.
 */
module.exports = {
	name: Events.GuildCreate,
	async execute(dbclient, guildId) {
		await removeGuildTables(dbclient, guildId);
	},
};