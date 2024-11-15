const { Events } = require('discord.js');
const {
	createOrClearGuildTables,
} = require('../src/database.js');

/**
 * Emitted whenever this discord bot is added to a new Discord server.
 * Creates or clears tables if tables already existed.
 */
module.exports = {
	name: Events.GuildCreate,
	async execute(dbclient, guildId) {
		await createOrClearGuildTables(dbclient, guildId);
		console.log();
	},
};