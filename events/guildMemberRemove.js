const { Events } = require('discord.js');
const {
	createOrClearGuildTables,
} = require('../src/database.js');

/**
 * Emitted whenever a member leaves of is kicked from a Discord server.
 * Remove items with member id in the database.
 */
module.exports = {
	name: Events.GuildMemberRemove,
	async execute(dbclient, memberId) {

	},
};