const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { getHighestPermissionName } = require('../src/utils.js');

const db = require('../src/sqliteDatabase.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cancel-match')
		.setDescription('[Admins Only] Cancel ongoing match')
		.addChannelOption(option =>
			option.setName('channel')
				.setDescription('text channel of the game')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(true))
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('reason of cancellation')
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
			interaction.reply({ content: 'Only admins can execute this command!', ephemeral: true });
			return;
		}

		const channel = interaction.options.getChannel('channel');
		const reason = interaction.options.getString('reason');

		const voiceIds = matchmakingManager.cancelMatch(interaction.guildId, channel.id);

		if (!voiceIds === undefined) {
			return interaction.reply({ content: `Channel ${channel} is not a match`, ephemeral: true });
		}

		await interaction.reply({ content: `Match ${channel} cancelled.`, ephemeral: true });
		await channel.send(`Match cancelled by ${interaction.user}. Reason: ${reason}. No ratings have been updated. Match channels will be deleted after 1 minute.`);

		setTimeout(async () => {
			const currentChannels = await interaction.guild.channels.fetch();

			for (const channelId of voiceIds.concat([channel.id])) {
				if (!currentChannels.has(channelId)) continue;
				await interaction.guild.channels.delete(channelId);
			}
		}, 60000);
	},
};
