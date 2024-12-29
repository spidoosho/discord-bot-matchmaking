const { Events, Colors, ChannelType, PermissionsBitField } = require('discord.js');
const { startExpress } = require('../express/express.js');
const db = require('../src/sqliteDatabase.js');

const { SUPER_ADMIN_ROLE_NAME, SUPER_ADMIN_ROLE_CREATE_REASON, ADMIN_ROLE_NAME, ADMIN_ROLE_CREATE_REASON, VALOJS_CATEGORY_CHANNEL } = require('../src/constants.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(args) {
		const [client] = args.args;

		// all the servers in the database
		const databaseGuildIds = await db.getDatabases(args.sqlClient);

		for (const [guildId, guild] of client.guilds.cache) {
			if (!databaseGuildIds.has(guildId)) {
				await db.createDatabaseForServer(args.sqlClient, guildId);
			}

			const dbSettings = await db.getGuildSettings(args.sqlClient, guildId);
			args.matchmakingManager.addGuild(guildId, dbSettings);
			let guildSettings = args.matchmakingManager.getGuildSettings(guildId);

			// check if role in database is the same as in the server
			guildSettings = await checkForAdminRoles(client, guild, guildSettings);
			await assignRolesToOwner(guild, guildSettings);

			guildSettings = await checkValoJSCategories(guild);
		}

		// start REST API
		startExpress();
	},
};

async function checkForAdminRoles(client, guild, guildSettings) {
	// max possible role position for a role created by the bot
	let clientMaxRolePosition;

	if (guildSettings.superAdminRoleId === undefined ||
		guild.roles.cache.find(role => role.id === guildSettings.superAdminRoleId) === undefined) {

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

		guildSettings.superAdminRoleId = superAdminRole.id;
	}


	if (guildSettings.adminRoleId === undefined ||
		guild.roles.cache.find(role => role.id === guildSettings.adminRoleId) === undefined) {

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

		guildSettings.adminRoleId = adminRole.id;
	}

	return guildSettings;
}

async function assignRolesToOwner(guild, guildSettings) {
	const owner = await guild.fetchOwner();

	if (!owner.roles.cache.has(guildSettings.superAdminRoleId)) {
		owner.roles.add(guildSettings.superAdminRoleId);
	}

	if (!owner.roles.cache.has(guildSettings.adminRoleId)) {
		owner.roles.add(guildSettings.adminRoleId);
	}
}

async function checkValoJSCategories(guild, guildSettings) {
	const clientBotRole = guild.members.cache.find(member => member.id === guild.client.user.id).roles.botRole;
	let valojsCategoryChannel = guild.channels.cache.find(channel => channel.name === VALOJS_CATEGORY_CHANNEL && channel.type === ChannelType.GuildCategory);
	let generalChannel;
	let historyChannel;
	let reportsChannel;

	if (valojsCategoryChannel === undefined) {
		valojsCategoryChannel = await guild.channels.create({
			name: VALOJS_CATEGORY_CHANNEL,
			type: ChannelType.GuildCategory,
			permissionOverwrites: [
				{
					id: guild.roles.everyone.id,
					deny: [PermissionsBitField.SendMessages],
				},
				{
					id: clientBotRole.id,
					allow: [PermissionsBitField.SendMessages],
				},
				{
					id: guild.roles.everyone.id,
					deny: [PermissionsBitField.Flags.ManageChannels],
				},
				{
					id: clientBotRole.id,
					allow: [PermissionsBitField.Flags.ManageChannels],
				},
			],
		});
		valojsCategoryChannel = createReadOnlyChannel(guild, VALOJS_CATEGORY_CHANNEL, undefined, clientBotRole.id, ChannelType.GuildCategory);

	}

	const matchHistoryChannel = guild.channels.cache.find(channel => channel.name === 'match-history' && channel.parentId === valojsCategoryChannel.id);
	const reportChannel = guild.channels.cache.find(channel => channel.name === 'reports' && channel.parentId === valojsCategoryChannel.id);

	if (matchHistoryChannel === undefined) {
		await createReadOnlyChannel(guild, 'match-history', valojsCategoryChannel, clientBotRole.id, ChannelType.GuildText);
	}

	if (reportChannel === undefined) {
		await createReadOnlyChannel(guild, 'reports', valojsCategoryChannel, clientBotRole.id, ChannelType.GuildText);
	}

	const general = await createReadOnlyChannel(guild, 'general', valojsCategoryChannel, clientBotRole.id, ChannelType.GuildText);
	const history = await createReadOnlyChannel(guild, 'match-history', valojsCategoryChannel, clientBotRole.id, ChannelType.GuildText);
	const reports = await createReadOnlyChannel(guild, 'reports', valojsCategoryChannel, clientBotRole.id, ChannelType.GuildText);

	guildSettings.generalChannelId = general.id;
	guildSettings.matchHistoryChannelId = history.id;
	guildSettings.reportChannelId = reports.id;
	return guildSettings;
}

async function createReadOnlyChannel(guild, channelName, categoryChannel, botRoleId, type) {
	return guild.channels.create({
		name: channelName,
		type,
		parent: categoryChannel,
		permissionOverwrites: [
			{
				id: guild.roles.everyone.id,
				deny: [PermissionsBitField.SendMessages, PermissionsBitField.Flags.ManageChannels],
			},
			{
				id: botRoleId,
				allow: [PermissionsBitField.SendMessages, PermissionsBitField.Flags.ManageChannels],
			},
		],
	});
}

function getClientMaxRolePosition(client, guild) {
	const clientMember = guild.members.cache.find(member => member.id == client.user.id);
	return clientMember.roles.botRole.position;
}