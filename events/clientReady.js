const { Events, PermissionsBitField } = require('discord.js');
const { startExpress } = require('../express/express.js');
const { checkOrCreateValoJSCategories, checkOrCreateAdminRoles } = require('../src/utils.js');
const db = require('../src/sqliteDatabase.js');

const { BOT_PERMISSIONS } = require('../src/constants.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	/**
	 * Handles the emitted event.
	 * @param {any[]} args arguments passed from the event
	 * @param {Client} client Discord client
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<void>}
	 */
	async execute(args, client, sqlClient, matchmakingManager) {
		// client already passed from parameters
		// const [client] = args;

		// all the servers in the database
		const databaseGuildIds = await db.getDatabases(sqlClient);

		for (const [guildId, guild] of client.guilds.cache) {
			if (!databaseGuildIds.has(guildId)) {
				await db.createDatabaseForServer(sqlClient, guildId);
				await db.createTablesForServer(sqlClient, guildId);
			}

			// check Bot permissions in guild
			const botRoleId = guild.members.cache.get(client.user.id).roles.botRole.id;
			const botRole = guild.roles.cache.find(role => role.id === botRoleId);
			const hasEveryPermission = botRole.permissions.has(BOT_PERMISSIONS);
			if (!hasEveryPermission) {
				const owner = await guild.fetchOwner();
				await owner.send(`Bot role ${botRole.name} in guild ${guild.name} needs these permissions to function properly: ${BOT_PERMISSIONS.toArray().join(', ')}`);
			}

			// register guild in matchmaking manager
			const guildDbIds = await db.getGuildDbIds(sqlClient, guildId);
			matchmakingManager.addGuild(guildId, guildDbIds);
			matchmakingManager.setGuildReady(guildId, hasEveryPermission);
			let guildIds = matchmakingManager.getGuildIds(guildId);

			if (hasEveryPermission || botRole.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
				// check if role in database is the same as in the server
				guildIds = await checkOrCreateAdminRoles(client, guild, guildIds);
				await assignRolesToOwner(guild, guildIds);
			}
			else {
				guildDbIds.superAdminRoleId = undefined;
				guildDbIds.adminRoleId = undefined;
			}

			if (hasEveryPermission || botRole.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
				guildIds = await checkOrCreateValoJSCategories(guild, guildIds, botRoleId);
				await db.updateGuildIds(sqlClient, guildId, guildIds);
			}
			else {
				guildDbIds.generalChannelId = undefined;
				guildDbIds.matchHistoryChannelId = undefined;
				guildDbIds.reportChannelId = undefined;
				guildDbIds.channelCategoryId = undefined;
			}

			// check maps for matchmaking
			const maps = await db.getMapsDictByIdWithIndices(sqlClient, guildId);
			const mapNames = Object.values(maps).map(map => map.name);
			if (mapNames.length !== 0) {
				matchmakingManager.setMaps(guildId, mapNames);
				continue;
			}

			// send message if maps are missing
			const missingMapsMessage = 'Please add maps by act reset using command `\\reset-act <map names>`';
			if (hasEveryPermission && 'generalChannelId' in guildIds) {
				const generalChannel = guild.channels.cache.find(channel => channel.id === guildIds.generalChannelId);
				await generalChannel.send(missingMapsMessage);
			}
			else {
				const owner = await guild.fetchOwner();
				await owner.send(missingMapsMessage);
			}
		}

		// start REST API
		startExpress();
	},
};

/**
 * Assigns admin roles to the owner.
 * @param {Guild} guild guild to assign roles
 * @param {GuildIds} guildIds guild IDs
 */
async function assignRolesToOwner(guild, guildIds) {
	const owner = await guild.fetchOwner();

	if (!owner.roles.cache.has(guildIds.superAdminRoleId)) {
		owner.roles.add(guildIds.superAdminRoleId);
	}

	if (!owner.roles.cache.has(guildIds.adminRoleId)) {
		owner.roles.add(guildIds.adminRoleId);
	}
}