const { SlashCommandBuilder } = require('discord.js');

const { getMaps } = require('../src/database.js');
const { ADMIN_ROLE_NAME } = require('../src/constants.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ban-player')
		.setDescription('[Admins Only] Ban player from the server.')
		.addUserOption(option =>
			option.setName('player')
				.setDescription('player to be banned')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('reason of the ban')
				.setRequired(true)),
	async execute(interaction, dbclient) {
		// check if sender is an admin

		// check if text channel is a lobby

		// remove lobby and notify all players

		// set timer to delete channels
		const adminRole = interaction.guild.roles.cache.find(item => item.name === ADMIN_ROLE_NAME);

		if (adminRole === undefined) {
			return interaction.reply({ content: `${ADMIN_ROLE_NAME} role not found.`, ephemeral: true });
		}

		if (!interaction.member.roles.cache.has(adminRole.id)) {
			return interaction.reply({ content: `Only <@&${adminRole.id}> can add new admins.`, ephemeral: true });
		}

		const newMap = interaction.options.getUser('map');

		return interaction.reply({ content: `Map ${newMap} added to the map pool.`, ephemeral: true });
	},
};
