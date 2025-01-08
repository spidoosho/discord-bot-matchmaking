const { Events } = require('discord.js');

/**
 * Emitted whenever this discord Bot leaves a Discord server.
 * Removes guild from matchmaking manager.
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

		matchmakingManager.removeGuild(guild.id);
	},
};