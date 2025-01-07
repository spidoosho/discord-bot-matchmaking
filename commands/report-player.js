const { SlashCommandBuilder } = require('discord.js');
const { VALOJS_MAIN_CATEGORY_CHANNEL } = require('../src/constants.js');
const { getChannelByNameFromCategory } = require('../src/utils.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('report-player')
		.setDescription('Report a player')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('player to report')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('reason for report')
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
		const player = interaction.user;
		const reportedPlayer = interaction.options.getMember('user');
		const reportReason = interaction.options.getString('reason');

		const reportChannel = getChannelByNameFromCategory(interaction.guild, VALOJS_MAIN_CATEGORY_CHANNEL, 'reports');

		await reportChannel.send(`Player ${player} reported ${reportedPlayer} for: ${reportReason}`);

		return interaction.reply({ content: `Player reported. Check ${reportChannel}.`, ephemeral: true });
	},
};
