const { Events, Colors, ChannelType, PermissionsBitField, Guild } = require('discord.js');
const db = require('../src/sqliteDatabase.js');
const { GuildIds } = require('../src/gameControllers.js');
const { BOT_PERMISSIONS, ADMIN_ROLE_NAME, SUPER_ADMIN_ROLE_NAME, ADMIN_ROLE_CREATE_REASON, SUPER_ADMIN_ROLE_CREATE_REASON,
	VALOJS_MAIN_CATEGORY_CHANNEL } = require('../src/constants.js');
const { getClientMaxRolePosition, createReadOnlyChannel } = require('../src/utils.js');

/**
 * Emitted whenever this discord Bot is added to a new Discord server.
 * Creates or clears tables if tables already existed.
 */
module.exports = {
	name: Events.GuildCreate,
	/**
	 * Handles the emitted event.
	 * @param {any[]} args arguments passed from the event
	 * @param {Client} client Discord client
	 * @param {Database} sqlClient SQLiteCloud client
	 * @param {MatchmakingManager} matchmakingManager matchmaking manager
	 * @returns {Promise<void>}
	 */
	async execute(args, client, sqlClient, matchmakingManager) {
		const [guild] = args;

		// create database for the server
		const databaseGuildIds = await db.getDatabases(sqlClient);
		if (databaseGuildIds.has(guild.id)) {
			await db.dropDatabaseByName(sqlClient, guild.id);
		}
		await db.createDatabaseForServer(sqlClient, guild.id);

		// check bot role permissions
		const botRoleId = guild.members.cache.get(client.user.id).roles.botRole.id;
		const botRole = guild.roles.cache.find(role => role.id === botRoleId);
		const hasEveryPermission = botRole.permissions.has(BOT_PERMISSIONS);
		if (!hasEveryPermission) {
			const owner = await guild.fetchOwner();
			await owner.send(`Bot role ${botRole.name} in guild ${guild.name} needs these permissions to function properly: ${BOT_PERMISSIONS.toArray().join(', ')}`);
		}

		// create admin roles
		let guildIds = new GuildIds(guild.id);
		if (botRole.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
			guildIds = await createAdminRoles(guild, client, guildIds);
		}

		// create channels
		if (botRole.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
			guildIds = await createValoJsChannels(guild, guildIds);
			const generalChannel = guild.channels.cache.find(channel => channel.id === guildIds.generalChannelId);
			await generalChannel.send('Please add maps by act reset using command `\\reset-act <map names>`');
		}

		// add guild to matchmaking manager
		db.updateGuildIds(sqlClient, guild.id, guildIds);
		matchmakingManager.addGuild(guild.id, guildIds);
		matchmakingManager.setGuildReady(guild.id, hasEveryPermission);
	},
};

/**
 * Creates readonly channels for the Bot.
 * @param {Guild} guild guild to create channels in
 * @param {GuildIds} guildIds guild IDs
 * @returns {GuildIds}
 */
async function createValoJsChannels(guild, guildIds) {

	const clientBotRole = guild.members.cache.find(member => member.id === guild.client.user.id).roles.botRole;

	const valojsCategoryChannel = await createReadOnlyChannel(guild, VALOJS_MAIN_CATEGORY_CHANNEL, undefined, clientBotRole.id, ChannelType.GuildCategory);
	const generalChannel = await createReadOnlyChannel(guild, 'general', valojsCategoryChannel, clientBotRole.id, ChannelType.GuildText);
	const matchHistoryChannel = await createReadOnlyChannel(guild, 'match-history', valojsCategoryChannel, clientBotRole.id, ChannelType.GuildText);
	const reportChannel = await createReadOnlyChannel(guild, 'reports', valojsCategoryChannel, clientBotRole.id, ChannelType.GuildText);

	guildIds.generalChannelId = generalChannel.id;
	guildIds.matchHistoryChannelId = matchHistoryChannel.id;
	guildIds.reportChannelId = reportChannel.id;
	guildIds.channelCategoryId = valojsCategoryChannel.id;

	return guildIds;
}

/**
 * Creates admin roles.
 * @param {Guild} guild guild to create roles in
 * @param {Client} client Bot client
 * @param {GuildIds} guildIds guild IDs
 * @returns {GuildIds}
 */
async function createAdminRoles(guild, client, guildIds) {
	// set highest possible position for admin roles
	const clientMaxRolePosition = getClientMaxRolePosition(client, guild);

	const superAdminRole = await guild.roles.create({
		name: SUPER_ADMIN_ROLE_NAME,
		color: Colors.Yellow,
		reason: SUPER_ADMIN_ROLE_CREATE_REASON,
		mentionable: true,
		position: clientMaxRolePosition,
	});
	guildIds.superAdminRoleId = superAdminRole.id;

	const adminRole = await guild.roles.create({
		name: ADMIN_ROLE_NAME,
		color: Colors.Orange,
		mentionable: true,
		reason: ADMIN_ROLE_CREATE_REASON,
		position: clientMaxRolePosition,
	});
	guildIds.adminRoleId = adminRole.id;

	return guildIds;
}