const { SlashCommandBuilder, ChatInputCommandInteraction } = require('discord.js');
const { getHighestPermissionName } = require('../src/utils.js');
const db = require('../src/sqliteDatabase.js');

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
	/**
	 * Executes slash command.
	 * @param {ChatInputCommandInteraction} interaction slash command interaction
	 * @param {string[]} args additional arguments
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<Message>} reply message to the command sender
	 */
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const dbRoles = await db.getGuildDbIds(sqlClient, interaction.guildId);
		const maxRole = getHighestPermissionName(interaction, dbRoles);

		if (maxRole === undefined) {
			interaction.reply({ content: 'Only admins can execute this command!' });
			return;
		}

		const playerToBan = interaction.options.getMember('player');
		const banReason = interaction.options.getString('reason');

		const doesPlayerHaveAdminRole = playerToBan.roles.cache.has(matchmakingManager.getGuildIds(interaction.guildId).superAdminRoleId) ||
										playerToBan.roles.cache.has(matchmakingManager.getGuildIds(interaction.guildId).adminRoleId);

		if (doesPlayerHaveAdminRole || playerToBan.bannable) {
			return interaction.reply({ content: `You cannot ban player ${playerToBan}.`, ephemeral: true });
		}

		await interaction.guild.members.ban(playerToBan.id, banReason);

		return interaction.reply({ content: 'Player has been banned.', ephemeral: true });
	},
};
