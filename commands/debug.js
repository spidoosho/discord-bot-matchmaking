const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGamesCategoryChannel } = require('../src/utils.js');
const { VALOJS_CHANNEL_CATEGORY_NAME } = require('../src/constants.js');

const moduleName = 'debug';

module.exports = {
	data: new SlashCommandBuilder()
		.setName(moduleName)
		.setDescription('Debug')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction, args, sqlClient, matchmakingManager) {
		console.log(`executing ${moduleName}`);


		await removeChannelsFromCategory(interaction, '1319317631295291453');

		return interaction.reply({ content: `Done. ${new Date()}`, ephemeral: true });
	},
};

async function removeChannelsFromCategory(interaction, categoryId) {
	const category = await interaction.guild.channels.cache.get(categoryId); // You can use `find` instead of `get` to fetch the category using a name: `find(cat => cat.name === 'test')
	category.children.cache.forEach(async (channel) => {
		try {
			await channel.delete();
		}
		catch (error) {
			console.error(`Failed to delete channel ${channel.id}:`, error);
		}
	});
}
