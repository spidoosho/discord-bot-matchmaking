const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { getHighestPermissionName } = require('../src/utils.js');

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
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const maxRole = await getHighestPermissionName(interaction, sqlClient);

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
		await channel.send(`Lobby cancelled by ${interaction.user}. Reason: ${reason}. Lobby channels will be deleted after 1 minute.`);

		setTimeout(async () => {
			await interaction.guild.channels.delete(channel);
			await interaction.guild.channels.delete(voiceId);
		}, 60000);
	},
};
