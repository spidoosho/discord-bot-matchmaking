const { StringSelectMenuInteraction } = require('discord.js');
const sqlDb = require('../src/sqliteDatabase.js');

module.exports = {
	data: { name: 'add-map-preference' },
	/**
	 * Executes slash command.
	 * @param {StringSelectMenuInteraction} interaction slash command interaction
	 * @param {string[]} args additional arguments
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<Message>} reply message to the command sender
	 */
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const [mapId, value] = interaction.values[0].split('_');
		await sqlDb.addPlayerMapPreference(sqlClient, interaction.guildId, interaction.user.id, mapId, parseInt(value) / 10);

		return interaction.reply({ content: 'Done.', ephemeral: true });
	},
};
