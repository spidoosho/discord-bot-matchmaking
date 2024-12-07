const { Events, Colors } = require('discord.js');

const {	checkForGuildTables } = require('../src/database.js');
const { startExpress } = require('../express/express.js');
const { SUPER_ADMIN_ROLE_NAME, SUPER_ADMIN_ROLE_CREATE_REASON, ADMIN_ROLE_NAME, ADMIN_ROLE_CREATE_REASON } = require('../src/constants.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(dbclient, client) {
		const guildIds = client.guilds.cache.keys();
		await checkForGuildTables(dbclient, guildIds);
		startExpress();

		for (const [, guild] of client.guilds.cache) {
			const owner = await guild.fetchOwner();
			let superAdminRole = guild.roles.cache.find(role => role.name === SUPER_ADMIN_ROLE_NAME);

			if (superAdminRole === undefined) {
				superAdminRole = await guild.roles.create({
					name: SUPER_ADMIN_ROLE_NAME,
					color: Colors.Yellow,
					reason: SUPER_ADMIN_ROLE_CREATE_REASON,
					position: 2,
				});
			}

			if (!owner.roles.cache.has(superAdminRole.id)) {
				owner.roles.add(superAdminRole);
			}

			let adminRole = guild.roles.cache.find(role => role.name === ADMIN_ROLE_NAME);

			if (adminRole === undefined) {
				adminRole = await guild.roles.create({
					name: ADMIN_ROLE_NAME,
					color: Colors.Orange,
					reason: ADMIN_ROLE_CREATE_REASON,
					position: 2,
				});
			}

			if (!owner.roles.cache.has(adminRole.id)) {
				owner.roles.add(adminRole);
			}
		}
	},
};
