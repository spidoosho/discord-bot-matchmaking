const { SlashCommandBuilder } = require('discord.js');
const { SUPER_ADMIN_ROLE_NAME, ADMIN_ROLE_NAME } = require('../src/constants.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-admin')
		.setDescription('[Super Admins Only] Add ValoJs role to admin')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('new admin user')
				.setRequired(true)),
	async execute(interaction) {
		const superAdminRole = interaction.guild.roles.cache.find(item => item.name === SUPER_ADMIN_ROLE_NAME);
		const adminRole = interaction.guild.roles.cache.find(item => item.name === ADMIN_ROLE_NAME);

		if (adminRole === undefined) {
			return interaction.reply({ content: `${ADMIN_ROLE_NAME} role not found.`, ephemeral: true });
		}

		if (superAdminRole === undefined) {
			return interaction.reply({ content: `${SUPER_ADMIN_ROLE_NAME} role not found.`, ephemeral: true });
		}

		if (!interaction.member.roles.cache.has(superAdminRole.id)) {
			return interaction.reply({ content: `Only <@&${superAdminRole.id}> can add new admins.`, ephemeral: true });
		}

		const user = interaction.options.getUser('user');
		const member = interaction.guild.members.cache.find(target => target.id === user.id);
		if (member.roles.cache.has(adminRole.id)) {
			return interaction.reply({ content: `Member <@${member.id}> is already a <@&${adminRole.id}>.`, ephemeral: true });
		}

		member.roles.add(adminRole);
		return interaction.reply({ content: `Member <@${member.id}> is now a <@&${adminRole.id}>.`, ephemeral: true });
	},
};
