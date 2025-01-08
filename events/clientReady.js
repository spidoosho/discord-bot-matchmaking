const { Events, Colors, ChannelType, PermissionsBitField } = require('discord.js');
const { startExpress } = require('../express/express.js');
const { getClientMaxRolePosition, createReadOnlyChannel } = require('../src/utils.js');
const db = require('../src/sqliteDatabase.js');

const { SUPER_ADMIN_ROLE_NAME, SUPER_ADMIN_ROLE_CREATE_REASON, ADMIN_ROLE_NAME, BOT_PERMISSIONS, ADMIN_ROLE_CREATE_REASON,
	VALOJS_MAIN_CATEGORY_CHANNEL } = require('../src/constants.js');
const { GuildIds } = require('../src/gameControllers.js');

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
				guildIds = await checkForAdminRoles(client, guild, guildIds);
				await assignRolesToOwner(guild, guildIds);
			}

			if (hasEveryPermission || botRole.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
				guildIds = await checkValoJSCategories(guild, guildIds, botRoleId);
				await db.updateGuildIds(sqlClient, guildId, guildIds);
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
 * Check and create admin roles if missing
 * @param {Client} client Discord client
 * @param {Guild} guild guild to create roles
 * @param {GuildIds} guildIds guild IDs
 * @returns {GuildIds}
 */
async function checkForAdminRoles(client, guild, guildIds) {
	// max possible role position for a role created by the bot
	let clientMaxRolePosition;

	if (guildIds.superAdminRoleId === undefined ||
		guild.roles.cache.find(role => role.id === guildIds.superAdminRoleId) === undefined) {

		if (clientMaxRolePosition === undefined) {
			clientMaxRolePosition = getClientMaxRolePosition(client, guild);
		}

		const superAdminRole = await guild.roles.create({
			name: SUPER_ADMIN_ROLE_NAME,
			color: Colors.Yellow,
			reason: SUPER_ADMIN_ROLE_CREATE_REASON,
			mentionable: true,
			position: clientMaxRolePosition,
		});

		guildIds.superAdminRoleId = superAdminRole.id;
	}


	if (guildIds.adminRoleId === undefined ||
		guild.roles.cache.find(role => role.id === guildIds.adminRoleId) === undefined) {

		if (clientMaxRolePosition === undefined) {
			clientMaxRolePosition = getClientMaxRolePosition(client, guild);
		}

		const adminRole = await guild.roles.create({
			name: ADMIN_ROLE_NAME,
			color: Colors.Orange,
			mentionable: true,
			reason: ADMIN_ROLE_CREATE_REASON,
			position: clientMaxRolePosition,
		});

		guildIds.adminRoleId = adminRole.id;
	}

	return guildIds;
}

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

/**
 * Checks and creates ValoJS categories if missing
 * @param {Guild} guild guild to check categories
 * @param {GuildIds} guildIds guild IDs
 * @returns {GuildIds}
 */
async function checkValoJSCategories(guild, guildIds, botRoleId) {
	let valojsCategoryChannel = guild.channels.cache.find(channel => channel.id === guildIds.channelCategoryId && channel.type === ChannelType.GuildCategory);
	let generalChannel;
	let matchHistoryChannel;
	let reportChannel;

	if (valojsCategoryChannel === undefined) {
		valojsCategoryChannel = await createReadOnlyChannel(guild, VALOJS_MAIN_CATEGORY_CHANNEL, undefined, botRoleId, ChannelType.GuildCategory);
	}
	else {
		generalChannel = guild.channels.cache.find(channel => channel.id === guildIds.generalChannelId && channel.parentId === valojsCategoryChannel.id);
		matchHistoryChannel = guild.channels.cache.find(channel => channel.id === guildIds.matchHistoryChannelId && channel.parentId === valojsCategoryChannel.id);
		reportChannel = guild.channels.cache.find(channel => channel.id === guildIds.reportChannelId && channel.parentId === valojsCategoryChannel.id);
	}

	if (generalChannel === undefined) {
		generalChannel = await createReadOnlyChannel(guild, 'general', valojsCategoryChannel, botRoleId, ChannelType.GuildText);
	}

	if (matchHistoryChannel === undefined) {
		matchHistoryChannel = await createReadOnlyChannel(guild, 'match-history', valojsCategoryChannel, botRoleId, ChannelType.GuildText);
	}

	if (reportChannel === undefined) {
		reportChannel = await createReadOnlyChannel(guild, 'reports', valojsCategoryChannel, botRoleId, ChannelType.GuildText);
	}

	guildIds.generalChannelId = generalChannel.id;
	guildIds.matchHistoryChannelId = matchHistoryChannel.id;
	guildIds.reportChannelId = reportChannel.id;
	guildIds.channelCategoryId = valojsCategoryChannel.id;

	return guildIds;
}