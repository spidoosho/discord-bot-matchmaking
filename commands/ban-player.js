const { SlashCommandBuilder } = require('discord.js');
const { getHighestPermissionName } = require('../src/utils.js');
const { ADMIN_ROLE_NAME } = require('../src/constants.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ban-player')
		.setDescription('[Admins Only] Ban player from the server.')
		.addUserOption(option =>
			option.setName('player')
				.setDescription('player to be banned')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('reason of the ban')
				.setRequired(true)),
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const maxRole = getHighestPermissionName(interaction, sqlClient);

		if (maxRole === undefined) {
			interaction.reply({ content: 'Only admins can execute this command!' });
			return;
		}

		const playerToBan = interaction.options.getUser('player');
		const banReason = interaction.options.getString('reason');

		// TODO: change to ban?
		// TODO: add permission to kick/ban
		await interaction.guild.members.kick(playerToBan.id, banReason);

		return interaction.reply({ content: 'Player has been banned.', ephemeral: true });
	},
};
