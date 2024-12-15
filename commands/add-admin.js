const { SlashCommandBuilder } = require('discord.js');
const { SUPER_ADMIN_ROLE_NAME, ADMIN_ROLE_NAME } = require('../src/constants.js');
const db = require('../src/sqliteDatabase.js');
const { getHighestPermissionName } = require('../src/utils.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-admin')
		.setDescription('[Super Admins Only] Add ValoJs role to admin')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('new admin user')
				.setRequired(true)),
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const maxRole = await getHighestPermissionName(interaction, sqlClient);

		if (maxRole !== SUPER_ADMIN_ROLE_NAME) {
			interaction.reply({ content: 'Only Super Admins can execute this command!', ephemeral: true });
			return;
		}

		const dbRoles = await db.getDatabaseRoles(sqlClient, interaction.guildId);
		if (!(ADMIN_ROLE_NAME in dbRoles)) {
			interaction.reply({ content: 'Cannot find Admin role to be assigned!', ephemeral: true });
			return;
		}

		const user = interaction.options.getUser('user');
		const member = interaction.guild.members.cache.find(target => target.id === user.id);

		if (member.roles.cache.has(dbRoles[ADMIN_ROLE_NAME])) {
			return interaction.reply({ content: `Member <@${member.id}> is already a <@&${dbRoles[ADMIN_ROLE_NAME]}>.`, ephemeral: true });
		}

		member.roles.add(dbRoles[ADMIN_ROLE_NAME]);
		return interaction.reply({ content: `Member <@${member.id}> is now a <@&${dbRoles[ADMIN_ROLE_NAME]}>.`, ephemeral: true });
	},
};
