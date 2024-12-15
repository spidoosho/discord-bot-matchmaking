const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const moduleName = 'debug';

module.exports = {
	data: new SlashCommandBuilder()
		.setName(moduleName)
		.setDescription('Debug')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction, args, sqlClient, matchmakingManager) {
		console.log(`executing ${moduleName}`);
		matchmakingManager.inc();
		return interaction.reply({ content: `Done. ${matchmakingManager.get()} ${new Date()}`, ephemeral: true });
	},
};
