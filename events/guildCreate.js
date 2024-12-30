const { Events, Colors, ChannelType } = require('discord.js');
const db = require('../src/sqliteDatabase.js');
const { GuildIds } = require('../src/gameControllers.js');
const { ADMIN_ROLE_NAME, SUPER_ADMIN_ROLE_NAME, ADMIN_ROLE_CREATE_REASON, SUPER_ADMIN_ROLE_CREATE_REASON, VALOJS_CATEGORY_CHANNEL } = require('../src/constants.js');
const { getClientMaxRolePosition, createReadOnlyChannel } = require('../src/utils.js');

/**
 * Emitted whenever this discord bot is added to a new Discord server.
 * Creates or clears tables if tables already existed.
 */
module.exports = {
	name: Events.GuildCreate,
	async execute(args) {
		const [guild] = args.args;

		await db.createDatabaseForServer(args.sqlClient, guild.id);

		let guildIds = new GuildIds(guild.id);
		guildIds = await createAdminRoles(guild, args.dcClient, guildIds);
		guildIds = await createValoJsChannels(guild, guildIds);

		db.updateGuildIds(args.sqlClient, guild.id, guildIds);
	},
};

async function createValoJsChannels(guild, guildIds) {

	const clientBotRole = guild.members.cache.find(member => member.id === guild.client.user.id).roles.botRole;

	const valojsCategoryChannel = await createReadOnlyChannel(guild, VALOJS_CATEGORY_CHANNEL, undefined, clientBotRole.id, ChannelType.GuildCategory);
	const generalChannel = await createReadOnlyChannel(guild, 'general', valojsCategoryChannel, clientBotRole.id, ChannelType.GuildText);
	const matchHistoryChannel = await createReadOnlyChannel(guild, 'match-history', valojsCategoryChannel, clientBotRole.id, ChannelType.GuildText);
	const reportChannel = await createReadOnlyChannel(guild, 'reports', valojsCategoryChannel, clientBotRole.id, ChannelType.GuildText);

	guildIds.generalChannelId = generalChannel.id;
	guildIds.matchHistoryChannelId = matchHistoryChannel.id;
	guildIds.reportChannelId = reportChannel.id;
	guildIds.channelCategoryId = valojsCategoryChannel.id;

	return guildIds;
}

async function createAdminRoles(guild, client, guildIds) {
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