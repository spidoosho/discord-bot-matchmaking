const { SlashCommandBuilder } = require('discord.js');
const { SUPER_ADMIN_ROLE_NAME, ADMIN_ROLE_NAME } = require('../src/constants.js');
const db = require('../src/sqliteDatabase.js');
const { getHighestPermissionName } = require('../src/utils.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('remove-admin')
		.setDescription('[Super Admins Only] Remove ValoJs role to admin')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('admin user')
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

		if (!member.roles.cache.has(dbRoles[ADMIN_ROLE_NAME])) {
			return interaction.reply({ content: `Member <@${member.id}> does not have <@&${dbRoles[ADMIN_ROLE_NAME]}> role.`, ephemeral: true });
		}

		member.roles.remove(dbRoles[ADMIN_ROLE_NAME]);
		return interaction.reply({ content: `Role <@&${dbRoles[ADMIN_ROLE_NAME]}> has been removed from user <@${member.id}>.`, ephemeral: true });
	},
};
