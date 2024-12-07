const { SlashCommandBuilder, ChannelType } = require('discord.js');

const { getMaps } = require('../src/database.js');
const { ADMIN_ROLE_NAME } = require('../src/constants.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cancel-match')
		.setDescription('[Admins Only] Cancel ongoing match')
		.addChannelOption(option =>
			option.setName('channel')
				.setDescription('game channel of the lobby')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(true))
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('reason of cancellation')
				.setRequired(true)),
	async execute(interaction, dbclient) {
		// check if sender is an admin

		// check if text channel is a game

		// remove game and notify all players

		// set timer to delete channels

		const adminRole = interaction.guild.roles.cache.find(item => item.name === ADMIN_ROLE_NAME);

		if (adminRole === undefined) {
			return interaction.reply({ content: `${ADMIN_ROLE_NAME} role not found.`, ephemeral: true });
		}

		if (!interaction.member.roles.cache.has(adminRole.id)) {
			return interaction.reply({ content: `Only <@&${adminRole.id}> can add new admins.`, ephemeral: true });
		}

		const newMap = interaction.options.getUser('map');
		const maps = await getMaps(dbclient);
		let found = false;

		for (let i = 0; i < maps.length && !found; i++) {
			if (maps[i].Name.toLowerCase() === newMap.toLowerCase()) {
				found = true;
			}
		}

		if (found) {
			return interaction.reply({ content: `Map ${newMap} is already in the map pool.`, ephemeral: true });
		}


		return interaction.reply({ content: `Map ${newMap} added to the map pool.`, ephemeral: true });
	},
};
