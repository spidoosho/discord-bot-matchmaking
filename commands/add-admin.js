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
	/**
	 * Executes slash command.
	 * @param {ChatInputCommandInteraction} interaction slash command interaction
	 * @param {string[]} args additional arguments
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<Message>} reply message to the command sender
	 */
	async execute(interaction, args, sqlClient, matchmakingManager) {
		const dbRoles = await db.getGuildDbIds(sqlClient, interaction.guildId);
		const maxRole = getHighestPermissionName(interaction, dbRoles);

		if (maxRole !== SUPER_ADMIN_ROLE_NAME) {
			interaction.reply({ content: 'Only Super Admins can execute this command!', ephemeral: true });
			return;
		}

		if (!('adminRoleId' in dbRoles)) {
			interaction.reply({ content: 'Cannot find Admin role to be assigned!', ephemeral: true });
			return;
		}

		const member = interaction.options.getMember('user');

		console.log(dbRoles.adminRoleId);
		if (member.roles.cache.has(dbRoles.adminRoleId)) {
			return interaction.reply({ content: `Member <@${member.id}> is already a <@&${dbRoles.adminRoleId}>.`, ephemeral: true });
		}

		member.roles.add(dbRoles.adminRoleId);
		return interaction.reply({ content: `Member <@${member.id}> is now a <@&${dbRoles.adminRoleId}>.`, ephemeral: true });
	},
};
