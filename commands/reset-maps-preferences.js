const { SlashCommandBuilder } = require('discord.js');
const { getMaps } = require('../src/database.js');
const { createResetMapsMessages } = require('../src/messages.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reset-maps-preferences')
		.setDescription('Reset maps preferences'),
	async execute(interaction, dbclient) {
		console.log('[DEBUG]: executing resetMapsPreferences');

		const maps = await getMaps(dbclient);

		const messages = createResetMapsMessages(maps);
		await interaction.reply(messages[0]);

		for (let i = 1; i < messages.length; i++) {
			await interaction.followUp(messages[i]);
		}
	},
};
