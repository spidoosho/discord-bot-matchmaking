const { SlashCommandBuilder } = require('discord.js');
const { createSelectMenuMapPreferences } = require('../src/messageComponents.js');
const sqlDb = require('../src/sqliteDatabase.js');
const { PlayerData } = require('../src/gameControllers.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('change-maps-preferences')
		.setDescription('Change maps preferences'),
	async execute(interaction, args, sqlClient, matchmakingManager) {
		console.log('[DEBUG]: executing change-maps-preferences');

		const playerData = new PlayerData(interaction.user.id);
		if (playerData === undefined) {
			return interaction.reply({ content: 'You have to join the queue first.', ephemeral: true });
		}

		const mapsPreferences = await sqlDb.getMapsPreferencesData(sqlClient, interaction.guildId, [playerData]);

		const messages = createSelectMenuMapPreferences(mapsPreferences, false);

		await interaction.reply(messages[0]);
		for (let i = 1; i < messages.length; i++) {
			await interaction.followUp(messages[i]);
		}
	},
};
