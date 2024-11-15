const { SlashCommandBuilder } = require('discord.js');

const moduleName = 'debug';

module.exports = {
	data: new SlashCommandBuilder()
		.setName(moduleName)
		.setDescription('Debug'),
	async execute(interaction) {
		console.log(`executing ${moduleName}`);

		return interaction.reply({ content: 'Done.', ephemeral: true });
	},
};
