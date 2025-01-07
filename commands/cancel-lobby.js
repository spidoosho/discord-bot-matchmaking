const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { getHighestPermissionName } = require('../src/utils.js');
const db = require('../src/sqliteDatabase.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cancel-lobby')
		.setDescription('[Admins Only] Cancel created lobby.')
		.addChannelOption(option =>
			option.setName('channel')
				.setDescription('text channel of the lobby')
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

		const voiceId = matchmakingManager.cancelLobby(interaction.guildId, channel.id);

		if (voiceId === undefined) {
			return interaction.reply({ content: `Channel ${channel} is not a lobby`, ephemeral: true });
		}

		await interaction.reply({ content: `Lobby ${channel} cancelled.`, ephemeral: true });

		// send to everyone in the lobby
		await channel.send(`Lobby cancelled by ${interaction.user}. Reason: ${reason}. Lobby channels will be deleted after 1 minute.`);

		setTimeout(async () => {
			const currentChannels = await interaction.guild.channels.fetch();

			for (const channelId of [channel.id, voiceId]) {
				if (!currentChannels.has(channelId)) continue;
				await interaction.guild.channels.delete(channelId);
			}
		}, 60000);
	},
};
