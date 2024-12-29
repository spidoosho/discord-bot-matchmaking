const { Events } = require('discord.js');
const { BOT_PERMISSIONS } = require('../src/constants.js');

/**
 * Emitted whenever guild role is changed.
 * Checks if needed permissions changed.
 */
module.exports = {
	name: Events.GuildRoleUpdate,
	async execute(args) {
		const [oldRole, newRole] = args.args;

		// TODO fetch admin roles
		const adminRoles = { admin: 123, superAdmin: 456 };

		// check if admin roles are mentionable
		if (Object.values(adminRoles).includes(newRole.id) && !newRole.mentionable) {
			const owner = await newRole.guild.fetchOwner();
			await owner.send(`Warning! A Role ${newRole.name} in a server ${newRole.guild.name} is not mentionable. Please change the role settings for proper functioning.`);
			return;
		}

		// if not bot role or if permissions did not change, then skip
		if (newRole.tags === undefined || !('botId' in newRole.tags) || oldRole.permissions.equals(newRole.permissions)) {
			return;
		}

		// check if any needed permissions is missing
		const flags = BOT_PERMISSIONS;
		const missingRoles = [];
		for (const flag of flags) {
			if (newRole.permissions.has(flag)) continue;
			missingRoles.push(flag);
		}

		if (missingRoles.length === 0) return;

		// notify owner via direct message
		const owner = await newRole.guild.fetchOwner();
		await owner.send(`Warning! The Bot <@${newRole.tags.botId}> role is missing these permissions: ${missingRoles.join(', ')}. Please change the role settings for proper functioning.`);
	},
};
