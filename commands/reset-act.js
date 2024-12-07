const { SlashCommandBuilder } = require('discord.js');

const { getMaps } = require('../src/database.js');
const { ADMIN_ROLE_NAME } = require('../src/constants.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reset-act')
		.setDescription('[Admins Only] Reset current act leaderboard.'),
	async execute(interaction, dbclient) {
		const adminRole = interaction.guild.roles.cache.find(item => item.name === ADMIN_ROLE_NAME);

		if (adminRole === undefined) {
			return interaction.reply({ content: `${ADMIN_ROLE_NAME} role not found.`, ephemeral: true });
		}

		if (!interaction.member.roles.cache.has(adminRole.id)) {
			return interaction.reply({ content: `Only <@&${adminRole.id}> can reset act.`, ephemeral: true });
		}

		// await database.resetTables(dbclient)

		return interaction.reply({ content: 'Act reset.', ephemeral: true });
	},
};
