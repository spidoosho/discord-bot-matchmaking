const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayerDataFromDb } = require('../src/database.js');
const sqlDb = require('../src/sqliteDatabase.js');

module.exports = {
	data: { name: 'add-map-preference' },
	async execute(stringSelectMenuInteraction, sqlClient, matchmakingManager) {

		const [mapId, value] = stringSelectMenuInteraction.values[0].split('_');
		await sqlDb.addPlayerMapPreference(sqlClient, stringSelectMenuInteraction.guildId, stringSelectMenuInteraction.user.id, mapId, value);

		return stringSelectMenuInteraction.reply({ content: 'Done.', ephemeral: true });
	},
};
