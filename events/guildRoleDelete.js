const { Events, AuditLogEvent, Colors } = require('discord.js');
const { ADMIN_ROLE_NAME, SUPER_ADMIN_ROLE_NAME } = require('../src/constants');
const db = require('../src/sqliteDatabase');

/**
 * Emitted whenever guild role is deleted.
 * Checks if the deleted role is admin role and notify owner if needed.
 */
module.exports = {
	name: Events.GuildRoleDelete,
	async execute(args) {
		const [role] = args.args;

		const guildIds = args.matchmakingManager.getGuildIds(role.guild.id);

		// check if admin roles are mentionable
		if (![guildIds.superAdminRoleId, guildIds.adminRoleId].includes(role.id)) return;

		const fetchedLogs = await role.guild.fetchAuditLogs({
			type: AuditLogEvent.RoleDelete,
			limit: 10,
		});

		for (const log of fetchedLogs.entries.values()) {
			// find the deleted role
			if (log.targetId !== role.id) continue;

			// deleted by the Bot
			if (log.executorId === args.dcClient.user.id) return;

			// create replacement admin role
			const newAdminRole = await createMissingAdminRole(role, guildIds);
			if (guildIds.adminRoleId === role.id) {
				guildIds.adminRoleId = newAdminRole.id;
			}
			else {
				guildIds.superAdminRoleId = newAdminRole.id;
			}
			await db.updateGuildIds(args.sqlClient, role.guild.id, guildIds);

			const owner = await role.guild.fetchOwner();
			return owner.send(`Warning! An admin Role ${role.name} in a server ${role.guild.name} was deleted. A replacement admin role ${newAdminRole.name} has been created. Please review the Audit Log and make sure it will not happen again. Admin roles are vital for ValoJS conflict resolution.`);
		}
	},
};

async function createMissingAdminRole(deletedRole, guildIds) {
	let newRoleName = ADMIN_ROLE_NAME;
	let newRoleColor = Colors.Orange;

	if (deletedRole.id === guildIds.superAdminRoleId) {
		newRoleName = SUPER_ADMIN_ROLE_NAME;
		newRoleColor = Colors.Yellow;
	}

	const newRole = await deletedRole.guild.roles.create({
		name: newRoleName,
		color: newRoleColor,
		reason: 'Replacement for deleted admin role',
		mentionable: true,
		position: deletedRole.position,
	});

	return newRole;
}