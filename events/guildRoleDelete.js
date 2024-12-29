const { Events, AuditLogEvent } = require('discord.js');

/**
 * Emitted whenever guild role is deleted.
 * Checks if the deleted role is admin role and notify owner if needed.
 */
module.exports = {
	name: Events.GuildRoleDelete,
	async execute(args) {
		const [role] = args.args;

		// TODO fetch admin roles
		const adminRoles = { admin: '1322865980170571807', superAdmin: '1317138536553644062' };

		// check if admin roles are mentionable
		if (!Object.values(adminRoles).includes(role.id)) return;

		const fetchedLogs = await role.guild.fetchAuditLogs({
			type: AuditLogEvent.RoleDelete,
			limit: 10,
		});

		for (const log of fetchedLogs.entries.values()) {
			// find the deleted role
			if (log.targetId !== role.id) continue;

			// deleted by the Bot
			if (log.executorId === args.dcClient.user.id) return;

			// TODO create and save the new role

			const owner = await role.guild.fetchOwner();
			return owner.send(`Warning! An admin Role ${role.name} in a server ${role.guild.name} was deleted. A replacement admin role has been created. Please review the Audit Log and make sure it will not happen again. Admin roles are vital for ValoJS conflict resolution.`);
		}
	},
};
