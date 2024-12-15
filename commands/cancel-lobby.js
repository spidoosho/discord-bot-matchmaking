const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { getHighestPermissionName } = require('../src/utils.js');
const { VALOJS_CHANNEL_CATEGORY_NAME } = require('../src/constants.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cancel-lobby')
		.setDescription('[Admins Only] Cancel created lobby.')
		.addChannelOption(option =>
			option.setName('channel')
				.setDescription('lobby channel of the lobby')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(true))
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('reason of cancellation')
				.setRequired(true)),
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const maxRole = await getHighestPermissionName(interaction, sqlClient);

		if (maxRole === undefined) {
			interaction.reply({ content: 'Only admins can execute this command!' });
			return;
		}

		const channel = interaction.options.getChannel('channel');
		const reason = interaction.options.getString('reason');

		// TODO: Try this
		const cancelled = matchmakingManager.cancelLobby(channel.name);

		if (!cancelled) {
			return interaction.reply({ content: `Channel ${channel} is not a lobby`, ephemeral: true });
		}

		await interaction.reply({ content: `Lobby ${channel} cancelled.`, ephemeral: true });

		interaction.guild.channels.cache.forEach(async (chan) => {
			if (chan.name !== channel.name || chan.parentId === null) return;

			const categoryChannel = interaction.guild.channels.cache.find(x => x.id === chan.parentId && x.name.includes(VALOJS_CHANNEL_CATEGORY_NAME));

			if (categoryChannel === undefined) return;

			if (chan.type === ChannelType.GuildText) {
				await chan.send(`Lobby cancelled by ${interaction.user}. Reason: ${reason}. Lobby channels will be deleted after 1 minute`);
			}

			setTimeout(async () => {
				await interaction.guild.channels.delete(chan.id);
			}, 60000);
		});
	},
};
