const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const moduleName = 'debug';

module.exports = {
	data: new SlashCommandBuilder()
		.setName(moduleName)
		.setDescription('Debug')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
		console.log(`executing ${moduleName}`);

		return interaction.reply({ content: 'Done.', ephemeral: true });
	},
};
