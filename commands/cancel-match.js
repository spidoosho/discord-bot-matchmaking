const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { getHighestPermissionName } = require('../src/utils.js');

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
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const maxRole = await getHighestPermissionName(interaction, sqlClient);

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
			await interaction.guild.channels.delete(channel);
			for (const voiceId of voiceIds) {
				await interaction.guild.channels.delete(voiceId);
			}
		}, 60000);
	},
};
