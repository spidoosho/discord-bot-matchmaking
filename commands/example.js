const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('example')
		.setDescription('This is a description for the example command.'),
	async execute(interaction, args, sqlClient, matchmakingManager) {
		console.log('[DEBUG]: executing example');

		// command logic
		// ...

		return interaction.reply({ content: 'Done.', ephemeral: true });
	},
};
