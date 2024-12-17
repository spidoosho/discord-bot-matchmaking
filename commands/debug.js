const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const moduleName = 'debug';

module.exports = {
	data: new SlashCommandBuilder()
		.setName(moduleName)
		.setDescription('Debug')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction, args, sqlClient, matchmakingManager) {
		console.log(`executing ${moduleName}`);

		const category = await interaction.guild.channels.cache.get('1318509103110422559'); // You can use `find` instead of `get` to fetch the category using a name: `find(cat => cat.name === 'test')
		category.children.cache.forEach(channel => channel.delete())

		return interaction.reply({ content: `Done. ${new Date()}`, ephemeral: true });
	},
};
