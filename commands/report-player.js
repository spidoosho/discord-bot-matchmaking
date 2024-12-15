const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { VALOJS_CATEGORY_CHANNEL } = require('../src/constants.js');

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
	async execute(interaction, args, sqlClient, matchmakingManager) {
		console.log('[DEBUG]: executing example');

		const player = interaction.user;
		const reportedPlayer = interaction.options.getUser('user');
		const reportReason = interaction.options.getString('reason');

		const valojsCategoryChannel = interaction.guild.channels.cache.find(channel => channel.name === VALOJS_CATEGORY_CHANNEL && channel.type === ChannelType.GuildCategory);

		const reportChannel = interaction.guild.channels.cache.find(channel => channel.name === 'reports' && channel.parentId === valojsCategoryChannel.id);

		await reportChannel.send(`Player ${player} reported ${reportedPlayer} for: ${reportReason}`);

		return interaction.reply({ content: `Player reported. Check ${reportChannel}.`, ephemeral: true });
	},
};
