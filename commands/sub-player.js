const { SlashCommandBuilder } = require('discord.js');
const { SUPER_ADMIN_ROLE_NAME, ADMIN_ROLE_NAME } = require('../src/constants.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('sub-player')
		.setDescription('[Super Admins Only] Add ValoJs role to admin')
		.addUserOption(option =>
			option.setName('player')
				.setDescription('player to be substituted')
				.setRequired(true))
		.addUserOption(option =>
			option.setName('substitute')
				.setDescription('player that substitutes')
				.setRequired(true)),
	async execute(interaction) {
		// check if written in lobby channel

		// check message was sent by a player from the lobby

		// update lobby

		// notify new player

		const user = interaction.options.getUser('user');
		const member = interaction.guild.members.cache.find(target => target.id === user.id);
		if (member.roles.cache.has(adminRole.id)) {
			return interaction.reply({ content: `Member <@${member.id}> is already a <@&${adminRole.id}>.`, ephemeral: true });
		}

		return interaction.reply({ content: `Member <@${member.id}> is now a <@&${adminRole.id}>.`, ephemeral: true });
	},
};
